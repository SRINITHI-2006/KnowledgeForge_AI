/**
 * KnowledgeForge AI - Quiz Taking Interface Script (quiz.js)
 */

let quizData = null;
let currentQuestionIndex = 0;
let userAnswers = {}; // { questionIndex: optionIndex (0-3) }

document.addEventListener('DOMContentLoaded', () => {
  const quizTitleEl = document.getElementById('quizTitle');
  const questionCounterEl = document.getElementById('questionCounter');
  const progressBarFill = document.getElementById('progressBarFill');
  const questionNavStrip = document.getElementById('questionNavStrip');
  const questionTextEl = document.getElementById('questionText');
  const optionsListEl = document.getElementById('optionsList');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const unansweredWarning = document.getElementById('unansweredWarning');
  const warningText = document.getElementById('warningText');

  // Load quiz from sessionStorage
  const storedQuiz = sessionStorage.getItem('currentQuiz');
  if (storedQuiz) {
    try {
      quizData = JSON.parse(storedQuiz);
    } catch (e) {
      console.error('Failed to parse currentQuiz', e);
    }
  }

  // Fallback default quiz if accessed directly
  if (!quizData || !quizData.questions || quizData.questions.length === 0) {
    quizData = {
      title: "Operating Systems Fundamentals",
      questions: [
        {
          question: "What is a process in an operating system?",
          options: [
            "A program in execution",
            "A memory location",
            "A scheduling algorithm",
            "A hardware component"
          ],
          correctAnswer: 0,
          explanation: "A process is fundamentally defined as a program in execution, consisting of program code, counter, stack, and registers."
        },
        {
          question: "Which of the following conditions is NOT required for a deadlock to occur?",
          options: [
            "Mutual Exclusion",
            "Hold and Wait",
            "Preemptive Scheduling",
            "Circular Wait"
          ],
          correctAnswer: 2,
          explanation: "Deadlock requires NO preemption; preemptive scheduling actually prevents or breaks deadlocks."
        },
        {
          question: "In CPU scheduling, what is the time quantum associated with?",
          options: [
            "First-Come First-Served (FCFS)",
            "Round Robin (RR)",
            "Shortest Job First (SJF)",
            "Priority Scheduling"
          ],
          correctAnswer: 1,
          explanation: "Round Robin scheduling assigns a fixed unit of CPU time called a time quantum to each ready process."
        },
        {
          question: "What hardware component is responsible for translating logical addresses into physical addresses in paging?",
          options: [
            "ALU (Arithmetic Logic Unit)",
            "DMA Controller",
            "MMU (Memory Management Unit)",
            "Control Unit"
          ],
          correctAnswer: 2,
          explanation: "The Memory Management Unit (MMU) utilizes the page table to translate logical (virtual) addresses to physical addresses."
        },
        {
          question: "Which classic deadlock avoidance algorithm was developed by Edsger Dijkstra?",
          options: [
            "Banker's Algorithm",
            "Peterson's Algorithm",
            "Lamport's Bakery Algorithm",
            "SJF Algorithm"
          ],
          correctAnswer: 0,
          explanation: "Dijkstra designed the Banker's Algorithm to test for safe states by simulating resource allocation requests."
        }
      ]
    };
  }

  // Render initial view
  quizTitleEl.textContent = quizData.title || "Interactive Quiz";
  renderQuestionNavStrip();
  renderQuestion();

  // Navigation handlers
  prevBtn.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderQuestion();
      unansweredWarning.style.display = 'none';
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      currentQuestionIndex++;
      renderQuestion();
      unansweredWarning.style.display = 'none';
    }
  });

  submitBtn.addEventListener('click', handleSubmitQuiz);

  // Render Question Navigator Strip (dots 1..N)
  function renderQuestionNavStrip() {
    questionNavStrip.innerHTML = '';
    quizData.questions.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = 'nav-dot';
      dot.id = `navDot_${idx}`;
      dot.textContent = idx + 1;
      dot.title = `Jump to Question ${idx + 1}`;

      dot.addEventListener('click', () => {
        currentQuestionIndex = idx;
        renderQuestion();
        unansweredWarning.style.display = 'none';
      });

      questionNavStrip.appendChild(dot);
    });
  }

  // Render current question
  function renderQuestion() {
    const total = quizData.questions.length;
    const currentQ = quizData.questions[currentQuestionIndex];

    // Update Counter & Progress Bar
    questionCounterEl.textContent = `Question ${currentQuestionIndex + 1} of ${total}`;
    const progressPercent = Math.round(((currentQuestionIndex + 1) / total) * 100);
    progressBarFill.style.width = `${progressPercent}%`;

    // Update Question text
    questionTextEl.textContent = currentQ.question;

    // Render Options
    optionsListEl.innerHTML = '';
    const optionLabels = ['A', 'B', 'C', 'D'];

    currentQ.options.forEach((optText, optIdx) => {
      const optionItem = document.createElement('div');
      optionItem.className = 'option-item';
      
      const isSelected = userAnswers[currentQuestionIndex] === optIdx;
      if (isSelected) {
        optionItem.classList.add('selected');
      }

      optionItem.innerHTML = `
        <div class="option-indicator">${optionLabels[optIdx] || optIdx + 1}</div>
        <div class="option-label-text">${escapeHtml(optText)}</div>
      `;

      optionItem.addEventListener('click', () => {
        userAnswers[currentQuestionIndex] = optIdx;
        updateOptionSelectionVisuals();
        updateNavDotsState();
        unansweredWarning.style.display = 'none';
      });

      optionsListEl.appendChild(optionItem);
    });

    // Update Buttons State
    prevBtn.disabled = currentQuestionIndex === 0;

    if (currentQuestionIndex === total - 1) {
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'inline-flex';
    } else {
      nextBtn.style.display = 'inline-flex';
      submitBtn.style.display = 'none';
    }

    updateNavDotsState();
  }

  function updateOptionSelectionVisuals() {
    const optionItems = optionsListEl.querySelectorAll('.option-item');
    const selectedAnswer = userAnswers[currentQuestionIndex];

    optionItems.forEach((item, idx) => {
      if (idx === selectedAnswer) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  function updateNavDotsState() {
    quizData.questions.forEach((_, idx) => {
      const dot = document.getElementById(`navDot_${idx}`);
      if (!dot) return;

      dot.classList.remove('active', 'answered', 'unanswered-alert');

      if (idx === currentQuestionIndex) {
        dot.classList.add('active');
      } else if (userAnswers[idx] !== undefined) {
        dot.classList.add('answered');
      }
    });
  }

  // Quiz submission handler with validation
  async function handleSubmitQuiz() {
    const total = quizData.questions.length;
    const unansweredIndices = [];

    for (let i = 0; i < total; i++) {
      if (userAnswers[i] === undefined) {
        unansweredIndices.push(i + 1);
        const dot = document.getElementById(`navDot_${i}`);
        if (dot) dot.classList.add('unanswered-alert');
      }
    }

    if (unansweredIndices.length > 0) {
      warningText.textContent = `Please answer all questions before submitting. Unanswered: Question(s) ${unansweredIndices.join(', ')}.`;
      unansweredWarning.style.display = 'flex';
      showToast(`You have ${unansweredIndices.length} unanswered question(s).`, 'warning');
      return;
    }

    // Submit to server / evaluate
    submitBtn.disabled = true;
    submitBtn.textContent = 'Calculating score...';

    try {
      const submitPayload = {
        quiz: quizData,
        answers: userAnswers,
        documentName: sessionStorage.getItem('quizDocName') || 'Study Material',
        submittedAt: new Date().toISOString()
      };

      const res = await fetch(`${API_BASE}/submit-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitPayload)
      });

      const resultData = await res.json();

      if (!res.ok || !resultData.success || !resultData.result) {
        throw new Error(resultData.error || 'Evaluation failed on server');
      }

      // Store result in sessionStorage
      sessionStorage.setItem('currentQuizResult', JSON.stringify(resultData.result));
      window.location.href = 'result.html';

    } catch (err) {
      console.warn('Backend submit returned error, computing result locally as fallback:', err);
      // Fallback local evaluation
      const localResult = evaluateQuizLocally(quizData, userAnswers);
      sessionStorage.setItem('currentQuizResult', JSON.stringify(localResult));
      window.location.href = 'result.html';
    }
  }

  // Pure evaluation logic matching backend calculation exactly
  function evaluateQuizLocally(quiz, answers) {
    let correctCount = 0;
    const questionsReview = [];
    const topicScores = {};

    quiz.questions.forEach((q, idx) => {
      const userAns = answers[idx];
      const isCorrect = userAns === q.correctAnswer;
      if (isCorrect) correctCount++;

      // Derive topic from question keywords
      const topic = deriveTopic(q.question);
      if (!topicScores[topic]) {
        topicScores[topic] = { total: 0, correct: 0 };
      }
      topicScores[topic].total++;
      if (isCorrect) topicScores[topic].correct++;

      questionsReview.push({
        questionNumber: idx + 1,
        question: q.question,
        options: q.options,
        userAnswer: userAns,
        correctAnswer: q.correctAnswer,
        isCorrect: isCorrect,
        explanation: q.explanation || "No explanation provided."
      });
    });

    const total = quiz.questions.length;
    const percentage = Math.round((correctCount / total) * 100);

    let performanceLevel = "Needs Improvement";
    if (percentage >= 90) performanceLevel = "Excellent";
    else if (percentage >= 70) performanceLevel = "Good";
    else if (percentage >= 50) performanceLevel = "Average";

    const strongAreas = [];
    const weakAreas = [];

    Object.keys(topicScores).forEach(topic => {
      const stats = topicScores[topic];
      const rate = stats.correct / stats.total;
      if (rate >= 0.7) {
        strongAreas.push(topic);
      } else {
        weakAreas.push(topic);
      }
    });

    if (strongAreas.length === 0) strongAreas.push("Fundamental Definitions");
    if (weakAreas.length === 0) weakAreas.push("Advanced Synthesis");

    const recommendation = weakAreas.length > 0 
      ? `Review ${weakAreas.slice(0, 2).join(' and ')} before attempting another quiz.`
      : "Excellent mastery of the subject material! Keep reviewing periodically to retain conceptual recall.";

    return {
      id: "res_" + Date.now(),
      title: quiz.title || "Interactive Quiz",
      totalQuestions: total,
      correctAnswers: correctCount,
      wrongAnswers: total - correctCount,
      percentage: percentage,
      performanceLevel: performanceLevel,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      strongAreas: strongAreas,
      weakAreas: weakAreas,
      recommendation: recommendation,
      review: questionsReview
    };
  }

  function deriveTopic(questionText) {
    const text = questionText.toLowerCase();
    if (text.includes('process') || text.includes('thread') || text.includes('context')) return 'Process Management';
    if (text.includes('schedul') || text.includes('cpu') || text.includes('round robin') || text.includes('fcfs')) return 'CPU Scheduling';
    if (text.includes('deadlock') || text.includes('banker') || text.includes('mutex') || text.includes('starvation')) return 'Deadlock Prevention';
    if (text.includes('memory') || text.includes('page') || text.includes('mmu') || text.includes('segment')) return 'Memory Management';
    if (text.includes('class') || text.includes('object') || text.includes('encapsul')) return 'OOP Principles';
    if (text.includes('inheritan') || text.includes('polymorph')) return 'Polymorphism & Inheritance';
    if (text.includes('sql') || text.includes('query') || text.includes('table') || text.includes('normaliz')) return 'Database Concepts';
    if (text.includes('network') || text.includes('protocol') || text.includes('tcp') || text.includes('ip')) return 'Computer Networking';
    return 'Core Concepts';
  }
});
