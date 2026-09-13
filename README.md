# KnowledgeForge AI
> **"Turn your documents into intelligent quizzes."**

KnowledgeForge AI is an educational technology platform that transforms static PDF and TXT learning materials into interactive, multiple-choice quizzes powered by Google Gemini AI (with support for OpenAI). The application evaluates user submissions, delivers immediate feedback with conceptual rationale for every answer, and provides diagnostic topic-level weakness analysis.

---

## 🌟 Key Features

- **Document Processing**: Ingest text-based PDF and TXT documents up to 10 MB with automatic whitespace cleaning, normalization, and token-safe chunking.
- **AI-Powered Quiz Synthesis**: Formulates multiple-choice questions testing conceptual comprehension with exactly 4 options, a single correct answer, and clear educational explanations.
- **Customizable Quiz Parameters**:
  - **Question Count**: 5, 10, 15, or 20 questions
  - **Difficulty Levels**: Easy, Medium, Hard, or Mixed
- **Interactive Quiz Interface**: Clean navigation, dynamic progress tracking, question jump navigator, and validation warning to prevent premature submissions.
- **Instant Diagnostic Scoring**:
  - Overall accuracy percentage and performance tier (`Excellent`, `Good`, `Average`, `Needs Improvement`)
  - Topic-level breakdown of **Strong Areas** and **Needs Improvement**
  - Targeted study recommendations based on missed concepts
- **Full Answer Review**: Question-by-question breakdown highlighting your answer, the correct answer, and detailed conceptual explanations.
- **Persistent Quiz History**: Review past scores and performance trends stored in local JSON format.
- **Zero Frontend Framework Bloat**: Pure semantic HTML5, modern SaaS CSS3, and vanilla JavaScript for blazing-fast performance.

---

## 🛠️ Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Zero-framework responsive user interface |
| **Backend (C++)** | C++17, Crow Framework, cURL | High-speed, lightweight REST API server |
| **Backend (Live Preview)** | Node.js / Express, TypeScript | Cloud preview & development server |
| **AI Integration** | Google Gemini API (`gemini-2.5-flash`) | Educational question & explanation generation |
| **Document Engine** | `pdf-parse` / Poppler `pdftotext` | Text extraction & character normalization |
| **Storage** | `history.json` (Structured JSON) | Local file-based quiz history persistence |

---

## 📂 Project Architecture

```text
KnowledgeForge-AI/
├── backend/
│   ├── CMakeLists.txt                # CMake build configuration for C++
│   ├── data/
│   │   └── history.json              # Local JSON persistence for quiz records
│   ├── uploads/
│   │   └── sample_operating_systems.txt # Sample document for immediate testing
│   └── src/
│       ├── main.cpp                  # C++ Crow server entry point
│       ├── controllers/
│       │   ├── quiz_controller.h     # REST API route declarations
│       │   └── quiz_controller.cpp   # Route handlers (/upload, /generate-quiz, /submit-quiz, /history)
│       ├── models/
│       │   └── quiz.h                # Quiz, Question, and Result data models
│       ├── services/
│       │   ├── ai_service.h          # Abstract IAIService interface
│       │   ├── gemini_service.h      # Concrete Google Gemini API implementation
│       │   ├── gemini_service.cpp    # Gemini cURL requests & JSON parsing
│       │   ├── openai_service.h      # Alternative OpenAI provider implementation
│       │   ├── openai_service.cpp    # OpenAI chat completions integration
│       │   ├── pdf_service.h         # Document text extractor interface
│       │   ├── pdf_service.cpp       # TXT & PDF stream extraction logic
│       │   ├── history_service.h     # JSON storage interface
│       │   └── history_service.cpp   # Thread-safe read/write for history.json
│       └── utils/
│           ├── text_processor.h      # Sanitization & token chunking utilities
│           └── text_processor.cpp    # Normalization & length validation
├── frontend/
│   ├── index.html                    # Modern landing page & feature overview
│   ├── generate.html                 # Drag-and-drop document upload & quiz config
│   ├── quiz.html                     # Interactive quiz runner & progress tracker
│   ├── result.html                   # Score dashboard, topic analysis & review
│   ├── history.html                  # Historical quiz activity & past results
│   ├── about.html                    # System architecture & technology breakdown
│   ├── css/
│   │   ├── style.css                 # Global design system, typography & navbar
│   │   ├── upload.css                # Dropzone & configuration pill styling
│   │   ├── quiz.css                  # Quiz interface & question tracker styles
│   │   └── result.css                # Results cards, badges & answer review styling
│   └── js/
│       ├── app.js                    # Global helpers, mobile nav & toast system
│       ├── upload.js                 # Upload handlers & asynchronous generation UI
│       ├── quiz.js                   # Active quiz state, navigator & validation
│       ├── result.js                 # Result calculation & review renderer
│       └── history.js                # History retrieval, deletion & display
├── server.ts                         # Node/Express server for instant live preview
├── package.json                      # Node packages & build scripts
├── .env.example                      # Environment variable template
└── README.md                         # Complete project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites

#### Windows:
1. **C++ Compiler**:
   - **Option A (Recommended)**: Install [Visual Studio Community](https://visualstudio.microsoft.com/) with the **"Desktop development with C++"** workload selected.
   - **Option B**: Install MinGW-w64 via [MSYS2](https://www.msys2.org/):
     ```bash
     pacman -S mingw-w64-ucrt-x86_64-gcc mingw-w64-ucrt-x86_64-cmake mingw-w64-ucrt-x86_64-curl
     ```
2. **CMake**: Download and install CMake from [cmake.org](https://cmake.org/download/) (version 3.16 or higher). Ensure "Add CMake to system PATH" is checked during setup.
3. **cURL**: Included natively in Windows 10/11 (`curl.exe`).

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install -y build-essential cmake libcurl4-openssl-dev poppler-utils
```

#### macOS:
```bash
brew install cmake curl poppler
```

---

### 2. Obtain a Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **"Get API key"** and select **"Create API key in new project"**.
4. Copy your API key.

---

### 3. Configure Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```bash
# On Windows (Command Prompt):
set GEMINI_API_KEY=your_gemini_api_key_here
set AI_PROVIDER=gemini
set PORT=3000

# On Windows (PowerShell):
$env:GEMINI_API_KEY="your_gemini_api_key_here"
$env:AI_PROVIDER="gemini"
$env:PORT="3000"

# On Linux / macOS (Bash):
export GEMINI_API_KEY="your_gemini_api_key_here"
export AI_PROVIDER="gemini"
export PORT=3000
```

---

### 4. Build and Run the C++ Crow Backend

Using CMake:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and enter the build directory
mkdir build
cd build

# 3. Generate build files with CMake
cmake ..

# 4. Compile the project
# On Windows (Visual Studio):
cmake --build . --config Release

# On Linux / macOS / MinGW:
make -j4

# 5. Launch the backend server
./knowledgeforge_server
```

The C++ server will boot on `http://localhost:3000`. Open your browser to `http://localhost:3000` to interact with the application.

---

### 5. Running via the Live Preview Server (Node / Express)

For zero-setup live development (including within the AI Studio container):

```bash
# Install dependencies
npm install

# Start the live preview server
npm run dev
```

Navigate to `http://localhost:3000` in your browser.

---

## 📡 REST API Documentation

### `POST /api/upload`
Uploads a document and extracts text.
- **Request**: `multipart/form-data` with `file` field (.pdf or .txt)
- **Response**:
```json
{
  "success": true,
  "fileId": "doc_1694567890",
  "fileName": "lecture_notes.pdf",
  "characterCount": 4520,
  "message": "Document processed successfully."
}
```

### `POST /api/generate-quiz`
Generates structured multiple-choice questions from extracted text.
- **Request Body**:
```json
{
  "fileId": "doc_1694567890",
  "content": "Optional direct text",
  "numberOfQuestions": 5,
  "difficulty": "medium",
  "documentName": "Operating Systems"
}
```
- **Response**:
```json
{
  "success": true,
  "quiz": {
    "id": "quiz_1694567900",
    "title": "Operating Systems Fundamentals",
    "questions": [
      {
        "question": "What is a process?",
        "options": [
          "A program in execution",
          "A CPU register",
          "A disk sector",
          "A compiler directive"
        ],
        "correctAnswer": 0,
        "explanation": "A process is formally defined as a program in execution.",
        "topic": "Process Management"
      }
    ]
  }
}
```

### `POST /api/submit-quiz`
Submits user answers, calculates scores, and performs topic weakness analysis.
- **Request Body**:
```json
{
  "quiz": { ... },
  "answers": { "0": 0, "1": 2, "2": 1 },
  "documentName": "Operating Systems"
}
```
- **Response**:
```json
{
  "success": true,
  "result": {
    "id": "res_1694568100",
    "title": "Operating Systems Fundamentals",
    "totalQuestions": 5,
    "correctAnswers": 4,
    "wrongAnswers": 1,
    "percentage": 80,
    "performanceLevel": "Good",
    "date": "13 Sep 2026",
    "strongAreas": ["Process Management"],
    "weakAreas": ["Deadlock Prevention"],
    "recommendation": "Review deadlock prevention algorithms before attempting another quiz.",
    "review": [ ... ]
  }
}
```

### `GET /api/history`
Returns all past quiz records saved in `history.json`.

### `DELETE /api/history/:id`
Deletes a specific quiz record by its unique ID.

### `DELETE /api/history`
Clears all quiz history records.

---

## 💻 Git Commands to Push to GitHub

To push KnowledgeForge AI to a new GitHub repository:

```bash
# 1. Initialize git repository
git init

# 2. Add all project files
git add .

# 3. Commit your changes
git commit -m "Initial commit: KnowledgeForge AI complete full-stack platform"

# 4. Set main branch
git branch -M main

# 5. Add your GitHub remote repository
git remote add origin https://github.com/your-username/knowledgeforge-ai.git

# 6. Push to GitHub
git push -u origin main
```

---

## 🔒 Security Best Practices

- **Never Commit API Keys**: Keep `.env` in `.gitignore`. The application strictly accesses credentials via environment variables on the backend.
- **Server-Side API Calls**: Client-side JavaScript never communicates directly with the Gemini or OpenAI APIs; all requests are authenticated securely by the server.
- **Input Sanitization**: File paths, extensions, and text contents are validated and sanitized to prevent directory traversal and injection vulnerabilities.

---

## 📄 License
This project is open source and available under the MIT License.
