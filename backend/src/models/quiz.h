#pragma once

#include <string>
#include <vector>
#include <map>
#include <nlohmann/json.hpp>

namespace knowledgeforge {

using json = nlohmann::json;

struct Question {
    std::string question;
    std::vector<std::string> options;
    int correctAnswer{0}; // Index 0 to 3
    std::string explanation;
    std::string topic{"General"};

    json to_json() const {
        return json{
            {"question", question},
            {"options", options},
            {"correctAnswer", correctAnswer},
            {"explanation", explanation},
            {"topic", topic}
        };
    }

    static Question from_json(const json& j) {
        Question q;
        if (j.contains("question") && j["question"].is_string()) q.question = j["question"].get<std::string>();
        if (j.contains("options") && j["options"].is_array()) {
            for (const auto& opt : j["options"]) {
                if (opt.is_string()) q.options.push_back(opt.get<std::string>());
            }
        }
        if (j.contains("correctAnswer") && j["correctAnswer"].is_number_integer()) {
            q.correctAnswer = j["correctAnswer"].get<int>();
        }
        if (j.contains("explanation") && j["explanation"].is_string()) {
            q.explanation = j["explanation"].get<std::string>();
        }
        if (j.contains("topic") && j["topic"].is_string()) {
            q.topic = j["topic"].get<std::string>();
        }
        return q;
    }
};

struct Quiz {
    std::string id;
    std::string title;
    std::vector<Question> questions;
    std::string difficulty{"medium"};
    std::string sourceDocument{"Document"};

    json to_json() const {
        json q_arr = json::array();
        for (const auto& q : questions) {
            q_arr.push_back(q.to_json());
        }
        return json{
            {"id", id},
            {"title", title},
            {"questions", q_arr},
            {"difficulty", difficulty},
            {"sourceDocument", sourceDocument}
        };
    }

    static Quiz from_json(const json& j) {
        Quiz quiz;
        if (j.contains("id") && j["id"].is_string()) quiz.id = j["id"].get<std::string>();
        if (j.contains("title") && j["title"].is_string()) quiz.title = j["title"].get<std::string>();
        if (j.contains("difficulty") && j["difficulty"].is_string()) quiz.difficulty = j["difficulty"].get<std::string>();
        if (j.contains("sourceDocument") && j["sourceDocument"].is_string()) quiz.sourceDocument = j["sourceDocument"].get<std::string>();
        if (j.contains("questions") && j["questions"].is_array()) {
            for (const auto& q_item : j["questions"]) {
                quiz.questions.push_back(Question::from_json(q_item));
            }
        }
        return quiz;
    }
};

struct QuestionReview {
    int questionNumber{1};
    std::string question;
    std::vector<std::string> options;
    int userAnswer{-1};
    int correctAnswer{0};
    bool isCorrect{false};
    std::string explanation;

    json to_json() const {
        return json{
            {"questionNumber", questionNumber},
            {"question", question},
            {"options", options},
            {"userAnswer", userAnswer},
            {"correctAnswer", correctAnswer},
            {"isCorrect", isCorrect},
            {"explanation", explanation}
        };
    }
};

struct QuizResult {
    std::string id;
    std::string title;
    int totalQuestions{0};
    int correctAnswers{0};
    int wrongAnswers{0};
    int percentage{0};
    std::string performanceLevel{"Needs Improvement"};
    std::string date;
    std::string sourceDocument{"Document"};
    std::vector<std::string> strongAreas;
    std::vector<std::string> weakAreas;
    std::string recommendation;
    std::vector<QuestionReview> review;

    json to_json() const {
        json rev_arr = json::array();
        for (const auto& r : review) {
            rev_arr.push_back(r.to_json());
        }
        return json{
            {"id", id},
            {"title", title},
            {"totalQuestions", totalQuestions},
            {"correctAnswers", correctAnswers},
            {"wrongAnswers", wrongAnswers},
            {"percentage", percentage},
            {"performanceLevel", performanceLevel},
            {"date", date},
            {"sourceDocument", sourceDocument},
            {"strongAreas", strongAreas},
            {"weakAreas", weakAreas},
            {"recommendation", recommendation},
            {"review", rev_arr}
        };
    }
};

} // namespace knowledgeforge
