cmake_minimum_required(VERSION 3.16)
project(KnowledgeForgeAI_Backend VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Enable compiler warnings
if(MSVC)
    add_compile_options(/W4 /EHsc /utf-8)
else()
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

include(FetchContent)

# Fetch nlohmann/json
FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
)
FetchContent_MakeAvailable(nlohmann_json)

# Fetch Crow C++ Microframework
FetchContent_Declare(
    Crow
    GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
    GIT_TAG v1.2.0
)
FetchContent_MakeAvailable(Crow)

# Fetch cURL (standard HTTP client for Gemini API communication)
find_package(CURL REQUIRED)

# Project Include Directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Backend Source Files
set(SOURCES
    src/main.cpp
    src/utils/text_processor.cpp
    src/services/pdf_service.cpp
    src/services/gemini_service.cpp
    src/services/openai_service.cpp
    src/services/history_service.cpp
    src/controllers/quiz_controller.cpp
)

add_executable(knowledgeforge_server ${SOURCES})

target_link_libraries(knowledgeforge_server
    PRIVATE
    Crow::Crow
    nlohmann_json::nlohmann_json
    CURL::libcurl
)

# On Windows, link winsock
if(WIN32)
    target_link_libraries(knowledgeforge_server PRIVATE ws2_32 wsock32)
endif()

message(STATUS "KnowledgeForge AI C++ Backend configured successfully.")
