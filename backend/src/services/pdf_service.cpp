#include "services/pdf_service.h"
#include "utils/text_processor.h"
#include <fstream>
#include <sstream>
#include <iostream>
#include <array>
#include <memory>
#include <algorithm>

namespace knowledgeforge {

DocumentExtractionResult DocumentService::extractText(const std::string& filePath) {
    if (filePath.empty()) {
        return {false, "", "No file path provided.", false};
    }

    std::string lowerPath = filePath;
    std::transform(lowerPath.begin(), lowerPath.end(), lowerPath.begin(), ::tolower);

    if (lowerPath.rfind(".txt") == lowerPath.length() - 4) {
        return extractFromTxt(filePath);
    } else if (lowerPath.rfind(".pdf") == lowerPath.length() - 4) {
        return extractFromPdf(filePath);
    }

    return {false, "", "Unsupported file type. Please upload a PDF or TXT file.", false};
}

DocumentExtractionResult DocumentService::extractFromTxt(const std::string& filePath) {
    std::ifstream file(filePath, std::ios::in | std::ios::binary);
    if (!file.is_open()) {
        return {false, "", "Unable to open TXT file for reading.", false};
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    std::string raw = buffer.str();

    std::string cleaned = TextProcessor::cleanText(raw);
    if (!TextProcessor::isValidTextLength(cleaned, 20)) {
        return {false, "", "Uploaded TXT document is empty or contains insufficient text.", true};
    }

    return {true, cleaned, "", false};
}

DocumentExtractionResult DocumentService::extractFromPdf(const std::string& filePath) {
    // Attempt 1: Check if Poppler's pdftotext is available in system path
    std::string command = "pdftotext \"" + filePath + "\" -";
    std::string output;
    
    std::array<char, 256> buffer;
    #if defined(_WIN32)
    FILE* pipe = _popen(command.c_str(), "r");
    #else
    FILE* pipe = popen(command.c_str(), "r");
    #endif

    if (pipe) {
        while (fgets(buffer.data(), static_cast<int>(buffer.size()), pipe) != nullptr) {
            output += buffer.data();
        }
        #if defined(_WIN32)
        _pclose(pipe);
        #else
        pclose(pipe);
        #endif
    }

    // If pdftotext returned readable content
    std::string cleaned = TextProcessor::cleanText(output);
    if (TextProcessor::isValidTextLength(cleaned, 40)) {
        return {true, cleaned, "", false};
    }

    // Attempt 2: Lightweight direct stream parser for uncompressed or standard PDF text objects
    std::ifstream pdfFile(filePath, std::ios::in | std::ios::binary);
    if (!pdfFile.is_open()) {
        return {false, "", "Unable to open PDF file for reading.", false};
    }

    std::stringstream rawStream;
    rawStream << pdfFile.rdbuf();
    std::string content = rawStream.str();

    std::string extractedStreamText;
    size_t pos = 0;
    while ((pos = content.find("BT", pos)) != std::string::npos) {
        size_t endPos = content.find("ET", pos);
        if (endPos == std::string::npos) break;

        std::string block = content.substr(pos + 2, endPos - (pos + 2));
        size_t tjPos = 0;
        while ((tjPos = block.find('(', tjPos)) != std::string::npos) {
            size_t closeParen = block.find(')', tjPos);
            if (closeParen == std::string::npos) break;
            extractedStreamText += block.substr(tjPos + 1, closeParen - (tjPos + 1)) + " ";
            tjPos = closeParen + 1;
        }
        pos = endPos + 2;
    }

    cleaned = TextProcessor::cleanText(extractedStreamText);
    if (TextProcessor::isValidTextLength(cleaned, 40)) {
        return {true, cleaned, "", false};
    }

    // If no selectable text was found, this is an image-based scanned PDF
    return {
        false,
        "",
        "This PDF does not contain readable text. Please upload a text-based PDF.",
        true
    };
}

} // namespace knowledgeforge
