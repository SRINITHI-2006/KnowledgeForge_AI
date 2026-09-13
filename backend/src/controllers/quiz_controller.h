#pragma once

#include "services/ai_service.h"
#include "services/history_service.h"
#include <crow.h>
#include <memory>
#include <map>
#include <mutex>

namespace knowledgeforge {

class QuizController {
public:
    QuizController(std::shared_ptr<IAIService> aiService,
                   std::shared_ptr<HistoryService> historyService);

    void registerRoutes(crow::SimpleApp& app);

private:
    std::shared_ptr<IAIService> aiService_;
    std::shared_ptr<HistoryService> historyService_;

    // In-memory cache for extracted file text by upload ID
    std::map<std::string, std::string> uploadedTextCache_;
    std::mutex cacheMutex_;

    crow::response handleUpload(const crow::request& req);
    crow::response handleGenerateQuiz(const crow::request& req);
    crow::response handleSubmitQuiz(const crow::request& req);
    crow::response handleGetHistory(const crow::request& req);
    crow::response handleDeleteHistoryItem(const crow::request& req, const std::string& id);
    crow::response handleClearHistory(const crow::request& req);
};

} // namespace knowledgeforge
