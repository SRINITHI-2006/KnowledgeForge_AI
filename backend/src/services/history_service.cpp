#include "services/history_service.h"
#include <fstream>
#include <iostream>

namespace knowledgeforge {

HistoryService::HistoryService(std::string dataFilePath) 
    : dataFilePath_(std::move(dataFilePath)) {
    ensureFileExists();
}

void HistoryService::ensureFileExists() {
    std::lock_guard<std::mutex> lock(fileMutex_);
    std::ifstream in(dataFilePath_);
    if (!in.is_open()) {
        std::ofstream out(dataFilePath_);
        if (out.is_open()) {
            json initial = json::array();
            out << initial.dump(2);
        }
    }
}

std::vector<QuizResult> HistoryService::getAllHistory() {
    std::lock_guard<std::mutex> lock(fileMutex_);
    std::vector<QuizResult> historyList;

    std::ifstream file(dataFilePath_);
    if (!file.is_open()) return historyList;

    try {
        json j;
        file >> j;
        if (j.is_array()) {
            for (const auto& item : j) {
                QuizResult r;
                r.id = item.value("id", "");
                r.title = item.value("title", "");
                r.totalQuestions = item.value("totalQuestions", 0);
                r.correctAnswers = item.value("score", item.value("correctAnswers", 0));
                r.wrongAnswers = item.value("wrongAnswers", r.totalQuestions - r.correctAnswers);
                r.percentage = item.value("percentage", 0);
                r.performanceLevel = item.value("performanceLevel", "Completed");
                r.date = item.value("date", "");
                r.sourceDocument = item.value("sourceDocument", "Document");

                if (item.contains("strongAreas") && item["strongAreas"].is_array()) {
                    for (const auto& s : item["strongAreas"]) r.strongAreas.push_back(s.get<std::string>());
                }
                if (item.contains("weakAreas") && item["weakAreas"].is_array()) {
                    for (const auto& w : item["weakAreas"]) r.weakAreas.push_back(w.get<std::string>());
                }
                r.recommendation = item.value("recommendation", "");

                historyList.push_back(r);
            }
        }
    } catch (const std::exception& e) {
        std::cerr << "Error reading history file: " << e.what() << std::endl;
    }

    return historyList;
}

bool HistoryService::saveQuizResult(const QuizResult& result) {
    std::lock_guard<std::mutex> lock(fileMutex_);
    json currentHistory = json::array();

    std::ifstream file(dataFilePath_);
    if (file.is_open()) {
        try {
            file >> currentHistory;
            if (!currentHistory.is_array()) currentHistory = json::array();
        } catch (...) {
            currentHistory = json::array();
        }
        file.close();
    }

    // Insert new item at the top of the history list
    json newRecord = result.to_json();
    // Also include 'score' for compatibility
    newRecord["score"] = result.correctAnswers;

    json updated = json::array();
    updated.push_back(newRecord);
    for (const auto& old : currentHistory) {
        updated.push_back(old);
    }

    std::ofstream out(dataFilePath_);
    if (!out.is_open()) return false;

    out << updated.dump(2);
    return true;
}

bool HistoryService::deleteQuizResult(const std::string& id) {
    std::lock_guard<std::mutex> lock(fileMutex_);
    std::ifstream file(dataFilePath_);
    if (!file.is_open()) return false;

    json currentHistory;
    try {
        file >> currentHistory;
    } catch (...) {
        return false;
    }
    file.close();

    if (!currentHistory.is_array()) return false;

    json updated = json::array();
    for (const auto& item : currentHistory) {
        if (item.value("id", "") != id) {
            updated.push_back(item);
        }
    }

    std::ofstream out(dataFilePath_);
    if (!out.is_open()) return false;

    out << updated.dump(2);
    return true;
}

bool HistoryService::clearAllHistory() {
    std::lock_guard<std::mutex> lock(fileMutex_);
    std::ofstream out(dataFilePath_);
    if (!out.is_open()) return false;

    out << json::array().dump(2);
    return true;
}

} // namespace knowledgeforge
