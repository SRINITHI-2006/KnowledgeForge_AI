#include "services/gemini_service.h"
#include <curl/curl.h>
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <regex>

namespace knowledgeforge {

// cURL write callback to accumulate response body
static size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t totalSize = size * nmemb;
    std::string* str = static_cast<std::string*>(userp);
    str->append(static_cast<char*>(contents), totalSize);
    return totalSize;
}

GeminiService::GeminiService(std::string apiKey) : apiKey_(std::move(apiKey)) {
    if (apiKey_.empty()) {
        const char* envKey = std::getenv("GEMINI_API_KEY");
        if (envKey) {
            apiKey_ = envKey;
        }
    }
}

std::string GeminiService::buildPrompt(const AIQuizRequest& request) const {
    std::ostringstream ss;
    ss << "You are an expert educational assessment specialist.\n"
       << "Based on the following document content, generate a multiple-choice quiz.\n\n"
       << "REQUIREMENTS:\n"
       << "1. Generate exactly " << request.numberOfQuestions << " questions.\n"
       << "2. Difficulty level: " << request.difficulty << "\n"
       << "3. Each question must test conceptual understanding of the material.\n"
       << "4. Each question must have exactly 4 options.\n"
       << "5. Only one option must be correct.\n"
       << "6. Provide a clear explanation for why the correct answer is right.\n"
       << "7. Include a 'topic' attribute naming the specific concept tested (e.g., 'Scheduling', 'Inheritance').\n"
       << "8. Return ONLY valid JSON in the following exact format:\n\n"
       << "{\n"
       << "  \"title\": \"Quiz Title based on document topic\",\n"
       << "  \"questions\": [\n"
       << "    {\n"
       << "      \"question\": \"Question text here\",\n"
       << "      \"options\": [\n"
       << "        \"Option A\",\n"
       << "        \"Option B\",\n"
       << "        \"Option C\",\n"
       << "        \"Option D\"\n"
       << "      ],\n"
       << "      \"correctAnswer\": 0,\n"
       << "      \"explanation\": \"Why this answer is correct\",\n"
       << "      \"topic\": \"Specific sub-concept or topic\"\n"
       << "    }\n"
       << "  ]\n"
       << "}\n\n"
       << "Do not include markdown code blocks, do not include any text before or after the JSON. Return pure JSON only.\n\n"
       << "DOCUMENT CONTENT:\n"
       << request.documentText;

    return ss.str();
}

std::string GeminiService::callGeminiHttp(const std::string& promptPayload) {
    if (apiKey_.empty()) {
        throw std::runtime_error("GEMINI_API_KEY environment variable is not set.");
    }

    CURL* curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to initialize cURL library.");
    }

    std::string url = "https://generativelanguage.googleapis.com/v1beta/models/" + 
                      modelName_ + ":generateContent?key=" + apiKey_;
    std::string responseBuffer;

    json body = {
        {"contents", json::array({
            {
                {"parts", json::array({
                    {{"text", promptPayload}}
                })}
            }
        })},
        {"generationConfig", {
            {"temperature", 0.3},
            {"topP", 0.8},
            {"responseMimeType", "application/json"}
        }}
    };

    std::string requestBody = body.dump();

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, requestBody.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseBuffer);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 60L);

    CURLcode res = curl_easy_perform(curl);

    long httpCode = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
        throw std::runtime_error(std::string("Network failure connecting to Gemini API: ") + curl_easy_strerror(res));
    }

    if (httpCode != 200) {
        std::string errDetail = "HTTP " + std::to_string(httpCode) + ": " + responseBuffer;
        if (httpCode == 400 || httpCode == 403) {
            errDetail = "Invalid API key or permission denied. Please verify your GEMINI_API_KEY.";
        } else if (httpCode == 429) {
            errDetail = "Gemini API rate limit exceeded. Please wait a moment and try again.";
        }
        throw std::runtime_error(errDetail);
    }

    return responseBuffer;
}

AIQuizResponse GeminiService::parseAndValidateQuiz(const std::string& rawText, int expectedCount) {
    std::string cleaned = rawText;

    // Strip markdown code fences if model enclosed JSON with ```json ... ```
    std::regex fence_re("^```(?:json)?\\s*([\\s\\S]*?)\\s*```$");
    std::smatch match;
    if (std::regex_search(cleaned, match, fence_re) && match.size() > 1) {
        cleaned = match[1].str();
    }

    // Trim outer whitespace
    auto start = cleaned.find_first_not_of(" \n\r\t");
    auto end = cleaned.find_last_not_of(" \n\r\t");
    if (start != std::string::npos && end != std::string::npos) {
        cleaned = cleaned.substr(start, end - start + 1);
    }

    json parsed;
    try {
        parsed = json::parse(cleaned);
    } catch (const std::exception& e) {
        return {false, Quiz{}, "Invalid JSON received from AI model: " + std::string(e.what()), cleaned};
    }

    // Validate structure
    if (!parsed.is_object()) {
        return {false, Quiz{}, "Quiz format error: Root JSON must be an object.", cleaned};
    }

    if (!parsed.contains("questions") || !parsed["questions"].is_array()) {
        return {false, Quiz{}, "Quiz format error: Missing 'questions' array.", cleaned};
    }

    Quiz quiz;
    quiz.id = "quiz_" + std::to_string(std::time(nullptr));
    quiz.title = parsed.value("title", "Generated Document Quiz");

    const auto& qArray = parsed["questions"];
    if (qArray.empty()) {
        return {false, Quiz{}, "Model generated an empty question list.", cleaned};
    }

    for (size_t i = 0; i < qArray.size(); ++i) {
        const auto& qItem = qArray[i];
        if (!qItem.is_object()) continue;

        Question q;
        q.question = qItem.value("question", "");
        if (q.question.empty()) {
            return {false, Quiz{}, "Question #" + std::to_string(i + 1) + " is missing question text.", cleaned};
        }

        if (!qItem.contains("options") || !qItem["options"].is_array() || qItem["options"].size() != 4) {
            return {false, Quiz{}, "Question #" + std::to_string(i + 1) + " must have exactly 4 options.", cleaned};
        }

        for (const auto& opt : qItem["options"]) {
            q.options.push_back(opt.is_string() ? opt.get<std::string>() : "Option");
        }

        int cAns = qItem.value("correctAnswer", 0);
        if (cAns < 0 || cAns > 3) {
            return {false, Quiz{}, "Question #" + std::to_string(i + 1) + " has invalid correctAnswer index: " + std::to_string(cAns), cleaned};
        }
        q.correctAnswer = cAns;

        q.explanation = qItem.value("explanation", "Review the document material for this concept.");
        q.topic = qItem.value("topic", "Core Knowledge");

        quiz.questions.push_back(q);
        if (static_cast<int>(quiz.questions.size()) >= expectedCount && expectedCount > 0) {
            break;
        }
    }

    return {true, quiz, "", cleaned};
}

AIQuizResponse GeminiService::generateQuiz(const AIQuizRequest& request) {
    try {
        std::string prompt = buildPrompt(request);
        std::string rawResponse = callGeminiHttp(prompt);

        json geminiJson = json::parse(rawResponse);
        if (!geminiJson.contains("candidates") || geminiJson["candidates"].empty()) {
            return {false, Quiz{}, "No candidate answers returned by Gemini API.", rawResponse};
        }

        std::string modelText = geminiJson["candidates"][0]["content"]["parts"][0]["text"].get<std::string>();
        return parseAndValidateQuiz(modelText, request.numberOfQuestions);

    } catch (const std::exception& e) {
        return {false, Quiz{}, std::string(e.what()), ""};
    }
}

} // namespace knowledgeforge
