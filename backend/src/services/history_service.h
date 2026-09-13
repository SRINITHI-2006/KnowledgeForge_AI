#pragma once

#include "models/quiz.h"
#include <string>
#include <vector>
#include <mutex>

namespace knowledgeforge {

class HistoryService {
public:
    explicit HistoryService(std::string dataFilePath = "backend/data/history.json");

    std::vector<QuizResult> getAllHistory();
    bool saveQuizResult(const QuizResult& result);
    bool deleteQuizResult(const std::string& id);
    bool clearAllHistory();

private:
    std::string dataFilePath_;
    std::mutex fileMutex_;

    void ensureFileExists();
};

} // namespace knowledgeforge
