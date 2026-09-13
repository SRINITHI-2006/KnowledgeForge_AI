#pragma once

#include "models/quiz.h"
#include <string>
#include <memory>

namespace knowledgeforge {

struct AIQuizRequest {
    std::string documentText;
    int numberOfQuestions{5};
    std::string difficulty{"medium"}; // easy, medium, hard, mixed
    std::string documentTitle{"Study Material"};
};

struct AIQuizResponse {
    bool success{false};
    Quiz quiz;
    std::string errorMessage;
    std::string rawModelOutput;
};

// Modular Abstract Interface for AI quiz generation services
class IAIService {
public:
    virtual ~IAIService() = default;

    virtual AIQuizResponse generateQuiz(const AIQuizRequest& request) = 0;
    virtual std::string getProviderName() const = 0;
};

} // namespace knowledgeforge
