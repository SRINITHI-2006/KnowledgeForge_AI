/**
 * KnowledgeForge AI - Quiz Results & Answer Review Script (result.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const resultQuizTitle = document.getElementById('resultQuizTitle');
  const scoreMainNumber = document.getElementById('scoreMainNumber');
  const scoreDenominator = document.getElementById('scoreDenominator');
  const scorePercentagePill = document.getElementById('scorePercentagePill');
  const performanceTierBadge = document.getElementById('performanceTierBadge');
  
  const statCorrect = document.getElementById('statCorrect');
  const statWrong = document.getElementById('statWrong');
  const statAccuracy = document.getElementById('statAccuracy');
  const statTotal = document.getElementById('statTotal');

  const strongTopicsList = document.getElementById('strongTopicsList');
  const weakTopicsList = document.getElementById('weakTopicsList');
  const recommendationText = document.getElementById('recommendationText');
  const reviewCardsList = document.getElementById('reviewCardsList');

  const scrollToReviewBtn = document.getElementById('scrollToReviewBtn');
  const reviewSection = document.getElementById('reviewSection');

  // Load result from sessionStorage
  let result = null;
  const storedResult = sessionStorage.getItem('currentQuizResult');
  if (storedResult) {
    try {
      result = JSON.parse(storedResult);
    } catch (e) {
      console.error('Failed to parse currentQuizResult', e);
    }
  }

  // Fallback demo result if accessed directly without taking a quiz
  if (!result) {
    result = {
      title: "Operating Systems Principles",
      totalQuestions: 10,
      correctAnswers: 8,
      wrongAnswers: 2,
      percentage: 80,
      performanceLevel: "Good",
      date: "13 Sep 2026",
      strongAreas: ["Process Management", "CPU Scheduling"],
      weakAreas: ["Deadlocks", "Memory Management"],
      recommendation: "Review deadlock prevention and memory management before attempting another quiz.",
      review: [
        {
          questionNumber: 1,
          question: "What is a process in an operating system?",
          options: ["A program in execution", "A memory location", "A scheduling algorithm", "A hardware component"],
          userAnswer: 0,
          correctAnswer: 0,
          isCorrect: true,
          explanation: "A process is a program in execution, consisting of executable code, data, program counter, and system stack."
        },
        {
          questionNumber: 2,
          question: "Which scheduling algorithm assigns a fixed unit of CPU time called a time quantum?",
          options: ["First-Come First-Served (FCFS)", "Round Robin (RR)", "Shortest Job First (SJF)", "Priority Scheduling"],
          userAnswer: 1,
          correctAnswer: 1,
          isCorrect: true,
          explanation: "Round Robin (RR) is specifically defined by preemptive time slicing via a designated time quantum."
        },
        {
          questionNumber: 3,
          question: "Which condition is NOT one of the four necessary conditions for a deadlock?",
          options: ["Mutual Exclusion", "Hold and Wait", "Preemptive Scheduling", "Circular Wait"],
          userAnswer: 2,
          correctAnswer: 2,
          isCorrect: true,
          explanation: "Deadlock requires NO preemption. If preemptive scheduling is introduced, deadlock is prevented."
        },
        {
          questionNumber: 4,
          question: "What algorithm is used to avoid deadlocks by testing for safe states?",
          options: ["Banker's Algorithm", "Dijkstra's Shortest Path", "Round Robin", "Page Replacement"],
          userAnswer: 0,
          correctAnswer: 0,
          isCorrect: true,
          explanation: "The Banker's Algorithm simulates resource allocation to guarantee the system remains in a safe state."
        },
        {
          questionNumber: 5,
          question: "In paging, what divides physical memory into fixed-sized blocks?",
          options: ["Pages", "Frames", "Segments", "Sectors"],
          userAnswer: 0,
          correctAnswer: 1,
          isCorrect: false,
          explanation: "Physical memory is divided into Frames. Logical memory is divided into Pages."
        },
        {
          questionNumber: 6,
          question: "What hardware unit translates logical addresses into physical addresses?",
          options: ["ALU", "Cache Controller", "Memory Management Unit (MMU)", "Instruction Register"],
          userAnswer: 2,
          correctAnswer: 2,
          isCorrect: true,
          explanation: "The Memory Management Unit (MMU) is the hardware device that maps virtual addresses to physical addresses."
        },
        {
          questionNumber: 7,
          question: "What occurs when a requested page is not currently in physical RAM?",
          options: ["Page Fault", "Segmentation Fault", "Stack Overflow", "Bus Error"],
          userAnswer: 0,
          correctAnswer: 0,
          isCorrect: true,
          explanation: "A page fault is an interrupt raised when a program tries to access a page that has not been mapped into RAM."
        },
        {
          questionNumber: 8,
          question: "Which of the following is a non-preemptive CPU scheduling algorithm?",
          options: ["Round Robin", "Shortest Remaining Time First", "First-Come First-Served (FCFS)", "Multilevel Feedback Queue"],
          userAnswer: 2,
          correctAnswer: 2,
          isCorrect: true,
          explanation: "FCFS is strictly non-preemptive: once the CPU has been allocated to a process, the process keeps it until completion or I/O."
        },
        {
          questionNumber: 9,
          question: "What is context switching?",
          options: ["Saving the state of the old process and loading the saved state for a new process", "Switching user interface themes", "Converting decimal addresses to binary", "Moving code from disk to cache"],
          userAnswer: 0,
          correctAnswer: 0,
          isCorrect: true,
          explanation: "Context switching involves saving the CPU context (registers, PCB) of the running process and restoring another."
        },
        {
          questionNumber: 10,
          question: "What is internal fragmentation?",
          options: ["Unallocated space between partitions", "Unused memory internal to an allocated partition or page", "Disk head thrashing", "Memory leaked by malloc without free"],
          userAnswer: 3,
          correctAnswer: 1,
          isCorrect: false,
          explanation: "Internal fragmentation occurs when allocated storage is larger than the requested memory (e.g. within a fixed page size)."
        }
      ]
    };
  }

  // Populate UI
  resultQuizTitle.textContent = result.title || "Quiz Completed!";
  scoreMainNumber.textContent = result.correctAnswers;
  scoreDenominator.textContent = `/ ${result.totalQuestions}`;
  scorePercentagePill.textContent = `${result.percentage}%`;

  // Apply Performance Tier Badge according to strict requirements:
  // 90–100 → Excellent
  // 70–89 → Good
  // 50–69 → Average
  // Below 50 → Needs Improvement
  let tierClass = 'tier-needs-improvement';
  let tierIcon = '⚠️';
  let tierLabel = 'Needs Improvement';

  if (result.percentage >= 90) {
    tierClass = 'tier-excellent';
    tierIcon = '🏆';
    tierLabel = 'Excellent';
  } else if (result.percentage >= 70) {
    tierClass = 'tier-good';
    tierIcon = '⭐';
    tierLabel = 'Good';
  } else if (result.percentage >= 50) {
    tierClass = 'tier-average';
    tierIcon = '📊';
    tierLabel = 'Average';
  }

  performanceTierBadge.className = `performance-tier ${tierClass}`;
  performanceTierBadge.innerHTML = `<span>${tierIcon}</span> <span>Performance: ${tierLabel}</span>`;

  // Stat Chips
  statCorrect.textContent = result.correctAnswers;
  statWrong.textContent = result.wrongAnswers;
  statAccuracy.textContent = `${result.percentage}%`;
  statTotal.textContent = result.totalQuestions;

  // Performance Analysis Section
  strongTopicsList.innerHTML = '';
  if (result.strongAreas && result.strongAreas.length > 0) {
    result.strongAreas.forEach(topic => {
      const li = document.createElement('li');
      li.className = 'topic-item';
      li.innerHTML = `<span style="color:var(--success); font-weight:bold;">✓</span> ${escapeHtml(topic)}`;
      strongTopicsList.appendChild(li);
    });
  } else {
    strongTopicsList.innerHTML = '<li class="topic-item">Foundational Knowledge</li>';
  }

  weakTopicsList.innerHTML = '';
  if (result.weakAreas && result.weakAreas.length > 0) {
    result.weakAreas.forEach(topic => {
      const li = document.createElement('li');
      li.className = 'topic-item';
      li.innerHTML = `<span style="color:var(--danger); font-weight:bold;">•</span> ${escapeHtml(topic)}`;
      weakTopicsList.appendChild(li);
    });
  } else {
    weakTopicsList.innerHTML = '<li class="topic-item">None! All target concepts answered accurately.</li>';
  }

  recommendationText.textContent = result.recommendation || "Review your document to strengthen missed topics before taking another quiz.";

  // Render Answer Review List
  renderAnswerReview(result.review);

  // Scroll to review button
  if (scrollToReviewBtn && reviewSection) {
    scrollToReviewBtn.addEventListener('click', () => {
      reviewSection.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function renderAnswerReview(reviewItems) {
    if (!reviewCardsList) return;
    reviewCardsList.innerHTML = '';

    if (!reviewItems || reviewItems.length === 0) {
      reviewCardsList.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No review data available.</p>';
      return;
    }

    const optionLetters = ['A', 'B', 'C', 'D'];

    reviewItems.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = `review-card ${item.isCorrect ? 'is-correct' : 'is-wrong'}`;

      const userOptionText = (item.options && item.userAnswer !== undefined && item.options[item.userAnswer]) 
        ? item.options[item.userAnswer] 
        : 'Not Answered';
      const userOptionLetter = optionLetters[item.userAnswer] || '-';

      const correctOptionText = (item.options && item.correctAnswer !== undefined && item.options[item.correctAnswer])
        ? item.options[item.correctAnswer]
        : 'Unknown';
      const correctOptionLetter = optionLetters[item.correctAnswer] || '-';

      card.innerHTML = `
        <div class="review-header">
          <div>
            <div class="review-q-num">Question ${item.questionNumber || idx + 1}</div>
            <div class="review-q-text">${escapeHtml(item.question)}</div>
          </div>
          <div class="badge ${item.isCorrect ? 'badge-success' : 'badge-danger'}">
            ${item.isCorrect ? '✓ Correct' : '✕ Incorrect'}
          </div>
        </div>

        <div class="review-answers-box">
          <div class="review-row ${item.isCorrect ? 'user-correct' : 'user-incorrect'}">
            <strong>Your Answer:</strong>
            <span>(${userOptionLetter}) ${escapeHtml(userOptionText)}</span>
          </div>

          ${!item.isCorrect ? `
            <div class="review-row correct-revealed">
              <strong>Correct Answer:</strong>
              <span>(${correctOptionLetter}) ${escapeHtml(correctOptionText)}</span>
            </div>
          ` : ''}
        </div>

        <div class="review-explanation">
          <strong>Explanation:</strong> ${escapeHtml(item.explanation)}
        </div>
      `;

      reviewCardsList.appendChild(card);
    });
  }
});
