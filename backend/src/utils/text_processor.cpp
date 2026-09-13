#include "utils/text_processor.h"
#include <algorithm>
#include <sstream>
#include <regex>

namespace knowledgeforge {

std::string TextProcessor::cleanText(const std::string& input) {
    if (input.empty()) return "";

    std::string result;
    result.reserve(input.size());

    // Replace carriage returns with standard newlines
    for (char c : input) {
        if (c != '\r') {
            result.push_back(c);
        }
    }

    // Replace tabs and multiple horizontal spaces with a single space
    std::regex spaces_re("[ \t]+");
    result = std::regex_replace(result, spaces_re, " ");

    // Replace 3 or more consecutive newlines with 2 newlines
    std::regex multi_nl_re("\n{3,}");
    result = std::regex_replace(result, multi_nl_re, "\n\n");

    // Trim leading and trailing whitespace
    auto start = result.find_first_not_of(" \n\t");
    auto end = result.find_last_not_of(" \n\t");

    if (start == std::string::npos) return "";
    return result.substr(start, end - start + 1);
}

bool TextProcessor::isValidTextLength(const std::string& text, size_t minChars) {
    size_t nonWhitespaceCount = 0;
    for (char c : text) {
        if (!std::isspace(static_cast<unsigned char>(c))) {
            nonWhitespaceCount++;
            if (nonWhitespaceCount >= minChars) return true;
        }
    }
    return false;
}

std::vector<std::string> TextProcessor::chunkText(const std::string& text, size_t maxChunkSize) {
    std::vector<std::string> chunks;
    if (text.empty()) return chunks;

    if (text.length() <= maxChunkSize) {
        chunks.push_back(text);
        return chunks;
    }

    size_t start = 0;
    while (start < text.length()) {
        size_t end = start + maxChunkSize;
        if (end >= text.length()) {
            chunks.push_back(text.substr(start));
            break;
        }

        // Try to break at a paragraph boundary (\n\n) or sentence boundary (.)
        size_t splitPoint = text.rfind("\n\n", end);
        if (splitPoint != std::string::npos && splitPoint > start) {
            chunks.push_back(text.substr(start, splitPoint - start));
            start = splitPoint + 2;
        } else {
            splitPoint = text.rfind(". ", end);
            if (splitPoint != std::string::npos && splitPoint > start) {
                chunks.push_back(text.substr(start, splitPoint - start + 1));
                start = splitPoint + 2;
            } else {
                // Fallback: split at last space
                splitPoint = text.rfind(' ', end);
                if (splitPoint != std::string::npos && splitPoint > start) {
                    chunks.push_back(text.substr(start, splitPoint - start));
                    start = splitPoint + 1;
                } else {
                    chunks.push_back(text.substr(start, maxChunkSize));
                    start += maxChunkSize;
                }
            }
        }
    }

    return chunks;
}

std::string TextProcessor::sanitizeFilename(const std::string& filename) {
    std::string safe;
    for (char c : filename) {
        if (std::isalnum(static_cast<unsigned char>(c)) || c == '.' || c == '_' || c == '-') {
            safe.push_back(c);
        } else if (c == ' ') {
            safe.push_back('_');
        }
    }
    return safe.empty() ? "document.txt" : safe;
}

} // namespace knowledgeforge
