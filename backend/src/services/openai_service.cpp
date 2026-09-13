#include "services/openai_service.h"
#include <curl/curl.h>
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <regex>

namespace knowledgeforge {

static size_t OpenAICallback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t totalSize = size * nmemb;
    std::string* str = static_cast<std::string*>(userp);
    str->append(static_cast<char*>(contents), totalSize);
    return totalSize;
}

OpenAIService::OpenAIService(std::string apiKey) : apiKey_(std::move(apiKey)) {
    if (apiKey_.empty()) {
        const char* envKey = std::getenv("OPENAI_API_KEY");
        if (envKey) {
            apiKey_ = envKey;
        }
    }
}

std::string OpenAIService::buildPrompt(const AIQuizRequest& request) const {
    std::ostringstream ss;
    ss << "You are an expert educational assessment specialist.\n"
       << "Generate a multiple choice quiz based on this document.\n"
       << "Generate exactly " << request.numberOfQuestions << " questions with difficulty " << request.difficulty << ".\n"
       << "Output ONLY valid JSON with title, and questions array containing question, 4 options, correctAnswer (0-3), topic, explanation.\n\n"
       << "DOCUMENT CONTENT:\n" << request.documentText;
    return ss.str();
}

std::string OpenAIService::callOpenAIHttp(const std::string& promptPayload) {
    if (apiKey_.empty()) {
        throw std::runtime_error("OPENAI_API_KEY environment variable is not configured.");
    }

    CURL* curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to initialize cURL.");
    }

    std::string url = "https://api.openai.com/v1/chat/completions";
    std::string responseBuffer;

    json body = {
        {"model", modelName_},
        {"messages", json::array({
            {{"role", "system"}, {{"content", "You are an educational quiz generation engine. Return JSON only."}}},
            {{"role", "user"}, {{"content", promptPayload}}}
        })},
        {"response_format", {{"type", "json_object"}}},
        {"temperature", 0.3}
    };

    std::string requestBody = body.dump();

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    std::string authHeader = "Authorization: Bearer " + apiKey_;
    headers = curl_slist_append(headers, authHeader.c_str());

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, requestBody.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, OpenAICallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseBuffer);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 60L);

    CURLcode res = curl_easy_perform(curl);

    long httpCode = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &httpCode);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
        throw std::runtime_error("Network failure connecting to OpenAI API: " + std::string(curl_easy_strerror(res)));
    }

    if (httpCode != 200) {
        throw std::runtime_error("OpenAI API error (HTTP " + std::to_string(httpCode) + "): " + responseBuffer);
    }

    return responseBuffer;
}

AIQuizResponse OpenAIService::generateQuiz(const AIQuizRequest& request) {
    try {
        std::string prompt = buildPrompt(request);
        std::string rawResponse = callOpenAIHttp(prompt);

        json parsed = json::parse(rawResponse);
        std::string content = parsed["choices"][0]["message"]["content"].get<std::string>();

        json quizJson = json::parse(content);
        Quiz quiz = Quiz::from_json(quizJson);
        quiz.id = "quiz_" + std::to_string(std::time(nullptr));
        return {true, quiz, "", content};
    } catch (const std::exception& e) {
        return {false, Quiz{}, std::string(e.what()), ""};
    }
}

} // namespace knowledgeforge
