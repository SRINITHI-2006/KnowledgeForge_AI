#pragma once

#include <string>
#include <vector>

namespace knowledgeforge {

class TextProcessor {
public:
    // Cleans and normalizes text (removes multiple spaces, carriage returns, excessive newlines)
    static std::string cleanText(const std::string& input);

    // Checks if text meets minimum length for meaningful quiz generation
    static bool isValidTextLength(const std::string& text, size_t minChars = 50);

    // Splits large text into manageable chunks (e.g. 3000 to 5000 characters per chunk)
    static std::vector<std::string> chunkText(const std::string& text, size_t maxChunkSize = 4000);

    // Helper to sanitize filenames
    static std::string sanitizeFilename(const std::string& filename);
};

} // namespace knowledgeforge
