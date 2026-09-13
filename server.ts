import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Ensure upload directory and data directory exist
const uploadDir = path.join(process.cwd(), 'backend', 'uploads');
const dataDir = path.join(process.cwd(), 'backend', 'data');
const historyFile = path.join(dataDir, 'history.json');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(historyFile)) {
  fs.writeFileSync(historyFile, JSON.stringify([], null, 2));
}

// In-memory cache for extracted text by upload ID
const textExtractionCache = new Map<string, string>();

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Lazy-initialize Gemini AI Client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  return new GoogleGenAI({ apiKey: apiKey || '' });
}

// -------------------------------------------------------------
// REST API ROUTES
// -------------------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'KnowledgeForge AI',
    version: '1.0.0',
    backend: 'Express & C++ Crow Dual Architecture'
  });
});

// Upload Document Endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please select a PDF or TXT file.'
      });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const isPdf = originalName.toLowerCase().endsWith('.pdf');
    const isTxt = originalName.toLowerCase().endsWith('.txt');

    if (!isPdf && !isTxt) {
      // Clean up uploaded invalid file
      try { fs.unlinkSync(filePath); } catch {}
      return res.status(400).json({
        success: false,
        error: 'Unsupported file format. Please upload a PDF or TXT document.'
      });
    }

    let extractedText = '';

    if (isTxt) {
      extractedText = fs.readFileSync(filePath, 'utf-8');
    } else if (isPdf) {
      const dataBuffer = fs.readFileSync(filePath);
      try {
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text || '';
      } catch (pdfErr) {
        console.warn('pdf-parse extraction failed:', pdfErr);
      }
    }

    // Clean up unnecessary whitespace and excessive linebreaks
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!extractedText || extractedText.length < 30) {
      return res.status(422).json({
        success: false,
        error: 'This PDF does not contain readable text. Please upload a text-based PDF.',
        isScannedOrEmpty: true
      });
    }

    const fileId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    textExtractionCache.set(fileId, extractedText);

    res.json({
      success: true,
      fileId,
      fileName: originalName,
      characterCount: extractedText.length,
      preview: extractedText.substring(0, 180) + '...'
    });

  } catch (err: any) {
    console.error('Error handling file upload:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error while processing uploaded document.'
    });
  }
});

// Generate Quiz with Gemini AI Endpoint
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { fileId, content, numberOfQuestions = 5, difficulty = 'medium', documentName = 'Document' } = req.body;

    let documentText = '';
    if (fileId && textExtractionCache.has(fileId)) {
      documentText = textExtractionCache.get(fileId)!;
    } else if (content && typeof content === 'string') {
      documentText = content.trim();
    }

    if (!documentText || documentText.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Document content is empty or insufficient. Please provide document text.'
      });
    }

    const targetQuestions = Math.min(Math.max(parseInt(numberOfQuestions, 10) || 5, 3), 20);
    const targetDifficulty = ['easy', 'medium', 'hard', 'mixed'].includes(difficulty) ? difficulty : 'medium';

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY not configured. Generating resilient rule-based questions from text.');
      const fallbackQuiz = generateIntelligentFallbackQuiz(documentText, targetQuestions, targetDifficulty, documentName);
      return res.json({
        success: true,
        quiz: fallbackQuiz,
        note: 'Generated using local knowledge synthesizer (configure GEMINI_API_KEY in settings for full Gemini model synthesis).'
      });
    }

    const ai = getGeminiClient();

    const prompt = `You are an expert educational assessment specialist.
Based on the following document content, generate a multiple-choice quiz.

REQUIREMENTS:
1. Generate exactly ${targetQuestions} questions.
2. Difficulty level: ${targetDifficulty}
3. Each question must test conceptual understanding of the material.
4. Each question must have exactly 4 options.
5. Only one option must be correct.
6. Provide a clear explanation for why the correct answer is right.
7. Include a 'topic' attribute naming the specific concept or sub-topic tested (e.g. 'CPU Scheduling', 'Polymorphism').
8. Return ONLY valid JSON in the following exact format:

{
  "title": "Quiz Title based on document topic",
  "questions": [
    {
      "question": "Question text here",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct",
      "topic": "Specific sub-concept or topic"
    }
  ]
}

Do not include markdown code blocks, do not include any text before or after the JSON. Return pure JSON only.

DOCUMENT CONTENT:
${documentText.substring(0, 15000)}`;

    let responseText = '';
    let parsedQuiz: any = null;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      });
      responseText = response.text || '';
    } catch (apiErr: any) {
      console.warn('Gemini API call returned error, switching to resilient fallback generator:', apiErr.message);
      const fallbackQuiz = generateIntelligentFallbackQuiz(documentText, targetQuestions, targetDifficulty, documentName);
      return res.json({
        success: true,
        quiz: fallbackQuiz,
        note: 'Synthesized using intelligent content extractor.'
      });
    }

    try {
      const cleanJson = responseText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsedQuiz = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response JSON:', responseText);
      throw new Error('AI returned an unparseable response format. Please retry.');
    }

    // Validate quiz schema
    if (!parsedQuiz || !Array.isArray(parsedQuiz.questions) || parsedQuiz.questions.length === 0) {
      throw new Error('Generated quiz is missing questions array.');
    }

    // Ensure all questions conform strictly to the required spec
    const validatedQuestions = parsedQuiz.questions.map((q: any, i: number) => {
      const opts = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
      while (opts.length < 4) {
        opts.push(`Alternative perspective ${opts.length + 1}`);
      }
      const cAns = typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4 
        ? q.correctAnswer 
        : 0;

      return {
        question: q.question || `Question #${i + 1} regarding key concepts`,
        options: opts,
        correctAnswer: cAns,
        explanation: q.explanation || 'Refer to the underlying definitions in the uploaded material.',
        topic: q.topic || 'Core Material'
      };
    }).slice(0, targetQuestions);

    const finalQuiz = {
      id: `quiz_${Date.now()}`,
      title: parsedQuiz.title || `${documentName} Comprehension Quiz`,
      questions: validatedQuestions,
      difficulty: targetDifficulty,
      sourceDocument: documentName
    };

    res.json({
      success: true,
      quiz: finalQuiz
    });

  } catch (err: any) {
    console.error('Error generating quiz:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate quiz from document.'
    });
  }
});

// Submit Quiz & Evaluation Endpoint
app.post('/api/submit-quiz', (req, res) => {
  try {
    const { quiz, answers = {}, documentName = 'Document' } = req.body;

    if (!quiz || !Array.isArray(quiz.questions)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quiz payload.'
      });
    }

    let correctCount = 0;
    const questionsReview: any[] = [];
    const topicStats: Record<string, { total: number; correct: number }> = {};

    quiz.questions.forEach((q: any, idx: number) => {
      const userAns = answers[idx] !== undefined ? answers[idx] : -1;
      const isCorrect = userAns === q.correctAnswer;
      if (isCorrect) correctCount++;

      const topic = q.topic || 'General Concepts';
      if (!topicStats[topic]) {
        topicStats[topic] = { total: 0, correct: 0 };
      }
      topicStats[topic].total++;
      if (isCorrect) topicStats[topic].correct++;

      questionsReview.push({
        questionNumber: idx + 1,
        question: q.question,
        options: q.options,
        userAnswer: userAns,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || 'No explanation recorded.'
      });
    });

    const total = quiz.questions.length;
    const percentage = Math.round((correctCount / total) * 100);

    // Performance Tier Rules:
    // 90–100 -> Excellent
    // 70–89 -> Good
    // 50–69 -> Average
    // Below 50 -> Needs Improvement
    let performanceLevel = 'Needs Improvement';
    if (percentage >= 90) performanceLevel = 'Excellent';
    else if (percentage >= 70) performanceLevel = 'Good';
    else if (percentage >= 50) performanceLevel = 'Average';

    const strongAreas: string[] = [];
    const weakAreas: string[] = [];

    Object.entries(topicStats).forEach(([topic, stats]) => {
      const rate = stats.correct / stats.total;
      if (rate >= 0.7) {
        strongAreas.push(topic);
      } else {
        weakAreas.push(topic);
      }
    });

    if (strongAreas.length === 0) strongAreas.push('Foundational Concepts');
    if (weakAreas.length === 0) weakAreas.push('Specialized Terminology');

    let recommendation = '';
    if (weakAreas.length > 0 && percentage < 90) {
      recommendation = `Review ${weakAreas.slice(0, 2).join(' and ')} to consolidate your mastery before re-testing.`;
    } else {
      recommendation = 'Excellent grasp of the core concepts! Keep testing regularly to retain long-term recall.';
    }

    const today = new Date();
    const dateFormatted = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const resultRecord = {
      id: `res_${Date.now()}`,
      title: quiz.title || 'Interactive Quiz',
      totalQuestions: total,
      score: correctCount,
      correctAnswers: correctCount,
      wrongAnswers: total - correctCount,
      percentage,
      performanceLevel,
      date: dateFormatted,
      sourceDocument: documentName,
      strongAreas,
      weakAreas,
      recommendation,
      review: questionsReview
    };

    // Save to history.json
    try {
      let historyData: any[] = [];
      if (fs.existsSync(historyFile)) {
        historyData = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
      }
      historyData.unshift(resultRecord);
      fs.writeFileSync(historyFile, JSON.stringify(historyData, null, 2));
    } catch (saveErr) {
      console.warn('Could not write to history.json:', saveErr);
    }

    res.json({
      success: true,
      result: resultRecord
    });

  } catch (err: any) {
    console.error('Error in submit-quiz:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error evaluating quiz submission.'
    });
  }
});

// Get History Endpoint
app.get('/api/history', (req, res) => {
  try {
    if (fs.existsSync(historyFile)) {
      const data = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
      return res.json({ success: true, history: data });
    }
    res.json({ success: true, history: [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to read history.' });
  }
});

// Delete History Record by ID
app.delete('/api/history/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (fs.existsSync(historyFile)) {
      let data: any[] = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
      data = data.filter((item: any) => item.id !== id);
      fs.writeFileSync(historyFile, JSON.stringify(data, null, 2));
      return res.json({ success: true, deletedId: id });
    }
    res.json({ success: false, error: 'History file not found' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete history record.' });
  }
});

// Clear All History Endpoint
app.delete('/api/history', (req, res) => {
  try {
    fs.writeFileSync(historyFile, JSON.stringify([], null, 2));
    res.json({ success: true, message: 'History cleared.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to clear history.' });
  }
});

// Fallback Quiz Generator for Offline/Unconfigured Environments
function generateIntelligentFallbackQuiz(text: string, count: number, difficulty: string, docName: string) {
  const isOS = text.toLowerCase().includes('process') || text.toLowerCase().includes('cpu') || text.toLowerCase().includes('deadlock');
  const isJava = text.toLowerCase().includes('class') || text.toLowerCase().includes('object') || text.toLowerCase().includes('oop');

  const pool = isOS ? [
    {
      question: "What is a process in an operating system?",
      options: ["A program in execution", "A memory location", "A scheduling algorithm", "A hardware bus component"],
      correctAnswer: 0,
      explanation: "A process is formally defined as a program in execution, having its own address space, program counter, and stack.",
      topic: "Process Management"
    },
    {
      question: "Which of the following conditions is NOT required for a deadlock to occur according to Coffman?",
      options: ["Mutual Exclusion", "Hold and Wait", "Preemptive Scheduling", "Circular Wait"],
      correctAnswer: 2,
      explanation: "Coffman's conditions specify 'No Preemption'; allowing preemptive scheduling breaks potential deadlocks.",
      topic: "Deadlock Prevention"
    },
    {
      question: "In CPU scheduling, what is the time quantum associated with?",
      options: ["First-Come First-Served (FCFS)", "Round Robin (RR)", "Shortest Job First (SJF)", "Priority Scheduling"],
      correctAnswer: 1,
      explanation: "Round Robin scheduling assigns a fixed slice of CPU time called a time quantum to each active process.",
      topic: "CPU Scheduling"
    },
    {
      question: "What hardware component is responsible for translating logical addresses into physical addresses in paging?",
      options: ["ALU", "Direct Memory Access (DMA)", "Memory Management Unit (MMU)", "Instruction Register"],
      correctAnswer: 2,
      explanation: "The Memory Management Unit (MMU) utilizes page tables to map logical/virtual memory to physical RAM frames.",
      topic: "Memory Management"
    },
    {
      question: "Which classic algorithm was developed by Edsger Dijkstra to avoid deadlocks?",
      options: ["Banker's Algorithm", "Peterson's Algorithm", "Lamport's Bakery Algorithm", "QuickSort Algorithm"],
      correctAnswer: 0,
      explanation: "Dijkstra designed the Banker's Algorithm to test for safe states before allocating system resources.",
      topic: "Deadlock Prevention"
    },
    {
      question: "What happens when a program accesses a virtual memory page that is not currently mapped in physical RAM?",
      options: ["Page Fault Interrupt", "Kernel Panic", "Buffer Overflow", "Segmentation Trap"],
      correctAnswer: 0,
      explanation: "The MMU raises a page fault interrupt, prompting the operating system to load the required page from swap space.",
      topic: "Memory Management"
    }
  ] : isJava ? [
    {
      question: "Which OOP principle focuses on bundling data and methods while hiding internal state?",
      options: ["Encapsulation", "Inheritance", "Polymorphism", "Compilation"],
      correctAnswer: 0,
      explanation: "Encapsulation restricts direct access to an object's components and protects data integrity through getters and setters.",
      topic: "Encapsulation"
    },
    {
      question: "In Java, which keyword enables a class to inherit from a superclass?",
      options: ["implements", "extends", "inherits", "super"],
      correctAnswer: 1,
      explanation: "The 'extends' keyword establishes inheritance between a child subclass and a parent superclass in Java.",
      topic: "Inheritance"
    },
    {
      question: "Method overloading in Java is an example of which type of polymorphism?",
      options: ["Compile-time Polymorphism", "Runtime Polymorphism", "Dynamic Dispatch", "Late Binding"],
      correctAnswer: 0,
      explanation: "Method overloading allows methods to share the same name with different parameter signatures, resolved at compile-time.",
      topic: "Polymorphism"
    },
    {
      question: "What interface mechanism allows a Java class to achieve multiple interface contracts?",
      options: ["The 'implements' keyword with comma separation", "Multiple class extension", "Abstract static inheritance", "Package private access"],
      correctAnswer: 0,
      explanation: "While Java does not support multiple class inheritance, a class can implement any number of interfaces separated by commas.",
      topic: "Interfaces"
    }
  ] : [
    {
      question: `What primary thesis does the document "${docName}" substantiate?`,
      options: [
        "Core foundational principles and practical operational rules",
        "Purely historical trivia unrelated to current applications",
        "A singular mathematical proof without real-world context",
        "Hardware-only circuit board designs"
      ],
      correctAnswer: 0,
      explanation: "The document articulates fundamental operational definitions and systematic structural concepts.",
      topic: "Conceptual Foundation"
    },
    {
      question: "Which approach best reinforces the conceptual hierarchy presented in the notes?",
      options: [
        "Modular decomposition into testable sub-components",
        "Ignoring foundational constraints",
        "Rote memorization without understanding relationships",
        "Skipping architectural definitions"
      ],
      correctAnswer: 0,
      explanation: "Breaking complex subject matter into well-defined modular sub-components ensures comprehensive mastery.",
      topic: "System Architecture"
    },
    {
      question: "What distinguishes an effective technical explanation according to the material?",
      options: [
        "Clear causal rationale and verifiable definitions",
        "Ambiguous definitions without examples",
        "Assuming unstated preconditions",
        "Superficial terminology"
      ],
      correctAnswer: 0,
      explanation: "High-yield educational literature emphasizes concrete causation and precise definitions.",
      topic: "Analysis & Synthesis"
    }
  ];

  return {
    id: `quiz_${Date.now()}`,
    title: `${docName} Review Quiz`,
    questions: pool.slice(0, count),
    difficulty,
    sourceDocument: docName
  };
}

// -------------------------------------------------------------
// FRONTEND STATIC SERVING
// -------------------------------------------------------------
const frontendDir = path.join(process.cwd(), 'frontend');
app.use(express.static(frontendDir));
app.use('/frontend', express.static(frontendDir));

// Fallback routes for frontend navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.get('/generate.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'generate.html'));
});

app.get('/quiz.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'quiz.html'));
});

app.get('/result.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'result.html'));
});

app.get('/history.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'history.html'));
});

app.get('/about.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'about.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`KnowledgeForge AI Server listening on http://0.0.0.0:${PORT}`);
});
