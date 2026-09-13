#include "controllers/quiz_controller.h"
#include "services/pdf_service.h"
#include "utils/text_processor.h"
#include <fstream>
#include <iostream>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>

namespace knowledgeforge {

QuizController::QuizController(std::shared_ptr<IAIService> aiService,
                               std::shared_ptr<HistoryService> historyService)
    : aiService_(std::move(aiService)), historyService_(std::move(historyService)) {}

void QuizController::registerRoutes(crow::SimpleApp& app) {
    // Health Check
    CROW_ROUTE(app, "/api/health").methods(crow::HTTPMethod::GET)(
        [](const crow::request& /*req*/) {
            json resp = {
                {"status", "ok"},
                {"app", "KnowledgeForge AI"},
                {"backend", "C++ Crow Framework"},
                {"version", "1.0.0"}
            };
            crow::response r(200, resp.dump());
            r.set_header("Content-Type", "application/json");
            return r;
        }
    );

    // Upload Document
    CROW_ROUTE(app, "/api/upload").methods(crow::HTTPMethod::POST)(
        [this](const crow::request& req) {
            return this->handleUpload(req);
        }
    );

    // Generate Quiz
    CROW_ROUTE(app, "/api/generate-quiz").methods(crow::HTTPMethod::POST)(
        [this](const crow::request& req) {
            return this->handleGenerateQuiz(req);
        }
    );

    // Submit Quiz & Evaluate
    CROW_ROUTE(app, "/api/submit-quiz").methods(crow::HTTPMethod::POST)(
        [this](const crow::request& req) {
            return this->handleSubmitQuiz(req);
        }
    );

    // Get History
    CROW_ROUTE(app, "/api/history").methods(crow::HTTPMethod::GET)(
        [this](const crow::request& req) {
            return this->handleGetHistory(req);
        }
    );

    // Clear All History
    CROW_ROUTE(app, "/api/history").methods(crow::HTTPMethod::DELETE)(
        [this](const crow::request& req) {
            return this->handleClearHistory(req);
        }
    );

    // Delete Single History Record
    CROW_ROUTE(app, "/api/history/<string>").methods(crow::HTTPMethod::DELETE)(
        [this](const crow::request& req, const std::string& id) {
            return this->handleDeleteHistoryItem(req, id);
        }
    );
}

crow::response QuizController::handleUpload(const crow::request& req) {
    crow::multipart::message msg(req);
    std::string fileName = "uploaded_document.txt";
    std::string fileContent;

    for (const auto& part : msg.part_map) {
        const auto& partData = part.second;
        auto it = partData.headers.find("Content-Disposition");
        if (it != partData.headers.end()) {
            std::string disp = it->second.value;
            auto fnPos = disp.find("filename=\"");
            if (fnPos != std::string::npos) {
                size_t start = fnPos + 10;
                size_t end = disp.find("\"", start);
                if (end != std::string::npos) {
                    fileName = disp.substr(start, end - start);
                }
            }
        }
        fileContent = partData.body;
    }

    if (fileContent.empty()) {
        json err = {{"success", false}, {"error", "Uploaded file is empty or no file received."}};
        crow::response res(400, err.dump());
        res.set_header("Content-Type", "application/json");
        return res;
    }

    std::string safeName = TextProcessor::sanitizeFilename(fileName);
    std::string uploadPath = "backend/uploads/" + safeName;

    // Save temporary file to disk
    std::ofstream outFile(uploadPath, std::ios::binary);
    if (!outFile.is_open()) {
        json err = {{"success", false}, {"error", "Failed to save uploaded file."}};
        crow::response res(500, err.dump());
        res.set_header("Content-Type", "application/json");
        return res;
    }
    outFile.write(fileContent.data(), static_cast<std::streamsize>(fileContent.size()));
    outFile.close();

    // Extract text
    DocumentExtractionResult extractResult = DocumentService::extractText(uploadPath);

    if (!extractResult.success) {
        json err = {
            {"success", false},
            {"error", extractResult.errorMessage},
            {"isScannedOrEmpty", extractResult.isScannedOrEmpty}
        };
        crow::response res(422, err.dump());
        res.set_header("Content-Type", "application/json");
        return res;
    }

    std::string fileId = "doc_" + std::to_string(std::time(nullptr));
    {
        std::lock_guard<std::mutex> lock(cacheMutex_);
        uploadedTextCache_[fileId] = extractResult.text;
    }

    json resp = {
        {"success", true},
        {"fileId", fileId},
        {"fileName", fileName},
        {"characterCount", extractResult.text.length()},
        {"message", "Document processed successfully."}
    };

    crow::response r(200, resp.dump());
    r.set_header("Content-Type", "application/json");
    return r;
}

crow::response QuizController::handleGenerateQuiz(const crow::request& req) {
    json reqJson;
    try {
        reqJson = json::parse(req.body);
    } catch (...) {
        json err = {{"success", false}, {"error", "Invalid JSON body."}};
        crow::response res(400, err.dump());
        res.set_header("Content-Type", "application/json");
        return res;
    }

    std::string textContent;
    std::string fileId = reqJson.value("fileId", "");

    if (!fileId.empty()) {
        std::lock_guard<std::mutex> lock(cacheMutex_);
        auto it = uploadedTextCache_.find(fileId);
        if (it != uploadedTextCache_.end()) {
            textContent = it->second;
        }
    }

    if (textContent.empty()) {
        textContent = reqJson.value("content", "");
    }

    textContent = TextProcessor::cleanText(textContent);

    if (textContent.empty() || !TextProcessor::isValidTextLength(textContent, 30)) {
        json err = {
            {"success", false},
            {"error", "Document content is empty or contains insufficient text to generate a quiz."}
        };
        crow::response res(400, err.dump());
        res.set_header("Content-Type", "application/json");
        return res;
    }

    AIQuizRequest aiReq;
    aiReq.documentText = textContent;
    aiReq.numberOfQuestions = reqJson.value("numberOfQuestions", 5);
    aiReq.difficulty = reqJson.value("difficulty", "medium");
    aiReq.documentTitle = reqJson.value("documentName", "Study Material");

    AIQuizResponse aiResp = aiService_->generateQuiz(aiReq);

    if (!aiResp.success) {
        json err = {
            {"success", false},
            {"error", aiResp.errorMessage},
            {"provider", aiService_->getProviderName()}
        };
        crow::response res(500, err.dump());
        res.set_header("Content-Type", "application/json");
        return res;
    }

    json resp = {
        {"success", true},
        {"quiz", aiResp.quiz.to_json()},
        {"provider", aiService_->getProviderName()}
    };

    crow::response r(200, resp.dump());
    r.set_header("Content-Type", "application/json");
    return r;
}

crow::response QuizController::handleSubmitQuiz(const crow::request& req) {
    json reqJson;
    try {
        reqJson = json::parse(req.body);
    } catch (...) {
        json err = {{"success", false}, {"error", "Invalid JSON payload."}};
        crow::response res(400, err.dump());
        res.set_header("Content-Type", "application/json");
        return res;
    }

    if (!reqJson.contains("quiz") || !reqJson.contains("answers")) {
        json err = {{"success", false}, {"error", "Payload must contain 'quiz' and 'answers' object."}};
        crow::response res(400, err.dump());
        res.set_header("Content-Type", "application/json");
        return res;
    }

    Quiz quiz = Quiz::from_json(reqJson["quiz"]);
    const auto& userAnsJson = reqJson["answers"];

    int correctCount = 0;
    std::vector<QuestionReview> reviews;
    std::map<std::string, std::pair<int, int>> topicStats; // topic -> {total, correct}

    for (size_t i = 0; i < quiz.questions.size(); ++i) {
        const auto& q = quiz.questions[i];
        int userChoice = -1;
        std::string keyStr = std::to_string(i);

        if (userAnsJson.contains(keyStr) && userAnsJson[keyStr].is_number_integer()) {
            userChoice = userAnsJson[keyStr].get<int>();
        }

        bool isCorrect = (userChoice == q.correctAnswer);
        if (isCorrect) correctCount++;

        std::string topicName = q.topic.empty() ? "Core Knowledge" : q.topic;
        topicStats[topicName].first += 1;
        if (isCorrect) topicStats[topicName].second += 1;

        QuestionReview rev;
        rev.questionNumber = static_cast<int>(i + 1);
        rev.question = q.question;
        rev.options = q.options;
        rev.userAnswer = userChoice;
        rev.correctAnswer = q.correctAnswer;
        rev.isCorrect = isCorrect;
        rev.explanation = q.explanation;
        reviews.push_back(rev);
    }

    int total = static_cast<int>(quiz.questions.size());
    int percentage = (total > 0) ? static_cast<int>(std::round((static_cast<double>(correctCount) / total) * 100.0)) : 0;

    std::string performanceLevel = "Needs Improvement";
    if (percentage >= 90) performanceLevel = "Excellent";
    else if (percentage >= 70) performanceLevel = "Good";
    else if (percentage >= 50) performanceLevel = "Average";

    std::vector<std::string> strongAreas;
    std::vector<std::string> weakAreas;

    for (const auto& entry : topicStats) {
        double accuracy = static_cast<double>(entry.second.second) / entry.second.first;
        if (accuracy >= 0.7) {
            strongAreas.push_back(entry.first);
        } else {
            weakAreas.push_back(entry.first);
        }
    }

    if (strongAreas.empty()) strongAreas.push_back("Foundational Principles");
    if (weakAreas.empty()) weakAreas.push_back("Advanced Applications");

    std::string recommendation;
    if (!weakAreas.empty() && percentage < 90) {
        recommendation = "Review " + weakAreas[0] + " and related sections before attempting another quiz.";
    } else {
        recommendation = "Excellent mastery of the document concepts! Continue periodic review to maintain long-term retention.";
    }

    auto now = std::chrono::system_clock::now();
    std::time_t now_c = std::chrono::system_clock::to_time_t(now);
    std::tm tm_now;
    #if defined(_WIN32)
    localtime_s(&tm_now, &now_c);
    #else
    localtime_r(&now_c, &tm_now);
    #endif

    std::ostringstream dateStream;
    dateStream << std::put_time(&tm_now, "%d %b %Y");

    QuizResult result;
    result.id = "res_" + std::to_string(std::time(nullptr));
    result.title = quiz.title;
    result.totalQuestions = total;
    result.correctAnswers = correctCount;
    result.wrongAnswers = total - correctCount;
    result.percentage = percentage;
    result.performanceLevel = performanceLevel;
    result.date = dateStream.str();
    result.sourceDocument = reqJson.value("documentName", quiz.sourceDocument);
    result.strongAreas = strongAreas;
    result.weakAreas = weakAreas;
    result.recommendation = recommendation;
    result.review = reviews;

    // Persist to history
    historyService_->saveQuizResult(result);

    json resp = {
        {"success", true},
        {"result", result.to_json()}
    };

    crow::response r(200, resp.dump());
    r.set_header("Content-Type", "application/json");
    return r;
}

crow::response QuizController::handleGetHistory(const crow::request& /*req*/) {
    std::vector<QuizResult> list = historyService_->getAllHistory();
    json arr = json::array();
    for (const auto& item : list) {
        arr.push_back(item.to_json());
    }

    json resp = {
        {"success", true},
        {"history", arr}
    };

    crow::response r(200, resp.dump());
    r.set_header("Content-Type", "application/json");
    return r;
}

crow::response QuizController::handleDeleteHistoryItem(const crow::request& /*req*/, const std::string& id) {
    bool ok = historyService_->deleteQuizResult(id);
    json resp = {
        {"success", ok},
        {"deletedId", id}
    };
    crow::response r(ok ? 200 : 404, resp.dump());
    r.set_header("Content-Type", "application/json");
    return r;
}

crow::response QuizController::handleClearHistory(const crow::request& /*req*/) {
    bool ok = historyService_->clearAllHistory();
    json resp = {
        {"success", ok},
        {"message", "All quiz history records cleared."}
    };
    crow::response r(200, resp.dump());
    r.set_header("Content-Type", "application/json");
    return r;
}

} // namespace knowledgeforge
