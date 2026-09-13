#pragma once

#include <string>

namespace knowledgeforge {

struct DocumentExtractionResult {
    bool success{false};
    std::string text;
    std::string errorMessage;
    bool isScannedOrEmpty{false};
};

class DocumentService {
public:
    // Extracts text from file path based on extension (.pdf, .txt)
    static DocumentExtractionResult extractText(const std::string& filePath);

    // TXT file reader with UTF-8 support
    static DocumentExtractionResult extractFromTxt(const std::string& filePath);

    // PDF text extractor (uses pdftotext CLI utility or PDF stream parser)
    static DocumentExtractionResult extractFromPdf(const std::string& filePath);
};

} // namespace knowledgeforge
