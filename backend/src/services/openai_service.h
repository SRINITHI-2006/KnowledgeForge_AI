#pragma once

#include "services/ai_service.h"
#include <string>

namespace knowledgeforge {

class OpenAIService : public IAIService {
public:
    explicit OpenAIService(std::string apiKey = "");

    AIQuizResponse generateQuiz(const AIQuizRequest& request) override;
    std::string getProviderName() const override { return "OpenAI (GPT-4o)"; }

private:
    std::string apiKey_;
    std::string modelName_{"gpt-4o-mini"};

    std::string buildPrompt(const AIQuizRequest& request) const;
    std::string callOpenAIHttp(const std::string& promptPayload);
    AIQuizResponse parseAndValidateQuiz(const std::string& rawJson, int expectedCount);
};

} // namespace knowledgeforge
