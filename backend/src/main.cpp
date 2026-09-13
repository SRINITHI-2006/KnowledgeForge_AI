#include "controllers/quiz_controller.h"
#include "services/gemini_service.h"
#include "services/openai_service.h"
#include "services/history_service.h"
#include <crow.h>
#include <iostream>
#include <memory>
#include <cstdlib>

int main(int argc, char* argv[]) {
    std::cout << "============================================" << std::endl;
    std::cout << " KnowledgeForge AI - C++ Crow Backend Engine" << std::endl;
    std::cout << " Turn your documents into intelligent quizzes" << std::endl;
    std::cout << "============================================" << std::endl;

    crow::SimpleApp app;

    // Check AI Provider selection (default: Gemini)
    const char* providerEnv = std::getenv("AI_PROVIDER");
    std::string provider = providerEnv ? providerEnv : "gemini";

    std::shared_ptr<knowledgeforge::IAIService> aiService;
    if (provider == "openai") {
        std::cout << "[AI Service] Selected Provider: OpenAI" << std::endl;
        aiService = std::make_shared<knowledgeforge::OpenAIService>();
    } else {
        std::cout << "[AI Service] Selected Provider: Google Gemini" << std::endl;
        aiService = std::make_shared<knowledgeforge::GeminiService>();
    }

    // Initialize Services
    auto historyService = std::make_shared<knowledgeforge::HistoryService>("backend/data/history.json");
    auto quizController = std::make_shared<knowledgeforge::QuizController>(aiService, historyService);

    // Register API Routes
    quizController->registerRoutes(app);

    // Static Frontend Routing
    CROW_ROUTE(app, "/")
    ([](crow::response& res) {
        res.set_static_file_info("frontend/index.html");
        res.end();
    });

    CROW_ROUTE(app, "/generate.html")
    ([](crow::response& res) {
        res.set_static_file_info("frontend/generate.html");
        res.end();
    });

    CROW_ROUTE(app, "/quiz.html")
    ([](crow::response& res) {
        res.set_static_file_info("frontend/quiz.html");
        res.end();
    });

    CROW_ROUTE(app, "/result.html")
    ([](crow::response& res) {
        res.set_static_file_info("frontend/result.html");
        res.end();
    });

    CROW_ROUTE(app, "/history.html")
    ([](crow::response& res) {
        res.set_static_file_info("frontend/history.html");
        res.end();
    });

    CROW_ROUTE(app, "/about.html")
    ([](crow::response& res) {
        res.set_static_file_info("frontend/about.html");
        res.end();
    });

    // Serve CSS files
    CROW_ROUTE(app, "/css/<string>")
    ([](crow::response& res, const std::string& filename) {
        res.set_static_file_info("frontend/css/" + filename);
        res.end();
    });

    // Serve JS files
    CROW_ROUTE(app, "/js/<string>")
    ([](crow::response& res, const std::string& filename) {
        res.set_static_file_info("frontend/js/" + filename);
        res.end();
    });

    int port = 3000;
    const char* portEnv = std::getenv("PORT");
    if (portEnv) {
        port = std::atoi(portEnv);
    }

    std::cout << "[Server] Binding to 0.0.0.0:" << port << "..." << std::endl;
    app.port(port).multithreaded().run();

    return 0;
}
