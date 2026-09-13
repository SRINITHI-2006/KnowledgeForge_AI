#pragma once

#include "services/ai_service.h"
#include <string>

namespace knowledgeforge {

class GeminiService : public IAIService {
public:
    explicit GeminiService(std::string apiKey = "");

    AIQuizResponse generateQuiz(const AIQuizRequest& request) override;
    std::string getProviderName() const override { return "Google Gemini"; }

private:
    std::string apiKey_;
    std::string modelName_{"gemini-3.6-flash"};

    std::string buildPrompt(const AIQuizRequest& request) const;
    std::string callGeminiHttp(const std::string& promptPayload);
    AIQuizResponse parseAndValidateQuiz(const std::string& rawJson, int expectedCount);
};

} // namespace knowledgeforge
