/**
 * KnowledgeForge AI - Quiz Generation Script (upload.js)
 */

let selectedFile = null;
let uploadId = null;

document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const filePreviewCard = document.getElementById('filePreviewCard');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const fileSizeDisplay = document.getElementById('fileSizeDisplay');
  const fileTypeDisplay = document.getElementById('fileTypeDisplay');
  const removeFileBtn = document.getElementById('removeFileBtn');
  const generateBtn = document.getElementById('generateBtn');
  
  const textPasteToggle = document.getElementById('textPasteToggle');
  const textPasteArea = document.getElementById('textPasteArea');
  const rawTextInput = document.getElementById('rawTextInput');
  
  const loadingOverlay = document.getElementById('loadingOverlay');
  const loadingStatusText = document.getElementById('loadingStatusText');
  const stepItems = document.querySelectorAll('.loading-step-item');

  // Check if sample text was passed via URL or local storage
  const urlParams = new URLSearchParams(window.location.search);
  const sampleParam = urlParams.get('sample');
  if (sampleParam) {
    loadSampleDoc(sampleParam);
  }

  // Browse files click
  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // Dropzone click
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => {
      fileInput.click();
    });

    // Drag and drop events
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        handleFileSelection(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  // Remove selected file
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
      selectedFile = null;
      uploadId = null;
      fileInput.value = '';
      filePreviewCard.style.display = 'none';
      dropzone.style.display = 'block';
      showToast('File removed', 'info');
    });
  }

  // Direct text paste accordion toggle
  if (textPasteToggle && textPasteArea) {
    textPasteToggle.addEventListener('click', () => {
      const isVisible = textPasteArea.style.display === 'block';
      textPasteArea.style.display = isVisible ? 'none' : 'block';
      textPasteToggle.innerHTML = isVisible 
        ? '<span>+ Or paste text notes directly</span>' 
        : '<span>- Hide direct text input</span>';
    });
  }

  // File validation and handling
  function handleFileSelection(file) {
    const validExtensions = ['.pdf', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValidExt = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExt) {
      showToast('Unsupported file type. Please upload a PDF or TXT file.', 'danger');
      return;
    }

    // Max 10MB = 10 * 1024 * 1024 bytes
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      showToast('File too large. Maximum file size is 10 MB.', 'danger');
      return;
    }

    if (file.size === 0) {
      showToast('Uploaded file is empty. Please select a valid document.', 'danger');
      return;
    }

    selectedFile = file;
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = formatFileSize(file.size);
    fileTypeDisplay.textContent = file.name.endsWith('.pdf') ? 'PDF Document' : 'Text File';

    dropzone.style.display = 'none';
    filePreviewCard.style.display = 'flex';
    showToast(`Loaded ${file.name}`, 'success');
  }

  // Generate Quiz button click handler
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const rawText = rawTextInput ? rawTextInput.value.trim() : '';
      
      if (!selectedFile && !rawText) {
        showToast('Please upload a PDF/TXT document or paste text to generate a quiz.', 'warning');
        return;
      }

      // Read configuration options
      const questionCountEl = document.querySelector('input[name="questionCount"]:checked');
      const difficultyEl = document.querySelector('input[name="difficulty"]:checked');
      
      const numberOfQuestions = questionCountEl ? parseInt(questionCountEl.value, 10) : 5;
      const difficulty = difficultyEl ? difficultyEl.value : 'medium';

      // Start generation sequence with UI animation
      startLoadingUI();

      try {
        let fileId = null;
        let directContent = '';

        // Step 1: Upload file or prepare text
        updateLoadingStep(0, 'Analyzing your document...');

        if (selectedFile) {
          const formData = new FormData();
          formData.append('file', selectedFile);

          const uploadRes = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
          });

          const uploadData = await uploadRes.json();

          if (!uploadRes.ok || !uploadData.success) {
            throw new Error(uploadData.error || 'Failed to process document.');
          }

          fileId = uploadData.fileId;
        } else {
          directContent = rawText;
        }

        // Step 2: Request Quiz Generation from Backend
        await new Promise(r => setTimeout(r, 600)); // smooth step transition
        updateLoadingStep(1, 'Generating intelligent questions...');

        const genRes = await fetch(`${API_BASE}/generate-quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: fileId,
            content: directContent,
            numberOfQuestions: numberOfQuestions,
            difficulty: difficulty,
            documentName: selectedFile ? selectedFile.name : 'Pasted Notes'
          })
        });

        const genData = await genRes.json();

        if (!genRes.ok || !genData.success || !genData.quiz) {
          throw new Error(genData.error || 'Quiz generation failed. Please try again.');
        }

        // Step 3: Preparing your quiz
        await new Promise(r => setTimeout(r, 600));
        updateLoadingStep(2, 'Preparing your quiz...');

        // Save generated quiz to localStorage for quiz.html
        sessionStorage.setItem('currentQuiz', JSON.stringify(genData.quiz));
        sessionStorage.setItem('quizDocName', selectedFile ? selectedFile.name : 'Study Notes');

        await new Promise(r => setTimeout(r, 500));
        window.location.href = 'quiz.html';

      } catch (err) {
        stopLoadingUI();
        console.error('Quiz Generation Error:', err);
        showToast(err.message || 'Unable to generate quiz. Please check connection and try again.', 'danger');
      }
    });
  }

  function startLoadingUI() {
    loadingOverlay.style.display = 'flex';
    stepItems.forEach(el => {
      el.classList.remove('active', 'done');
    });
  }

  function stopLoadingUI() {
    loadingOverlay.style.display = 'none';
  }

  function updateLoadingStep(index, statusMessage) {
    loadingStatusText.textContent = statusMessage;
    stepItems.forEach((el, i) => {
      if (i < index) {
        el.classList.remove('active');
        el.classList.add('done');
      } else if (i === index) {
        el.classList.add('active');
        el.classList.remove('done');
      } else {
        el.classList.remove('active', 'done');
      }
    });
  }

  // Helper to load sample educational text
  function loadSampleDoc(sampleType) {
    let sampleContent = '';
    let docName = 'Sample Notes.txt';

    if (sampleType === 'os') {
      docName = 'operating_systems_lecture.txt';
      sampleContent = `Operating Systems Core Principles:
A process is a program in execution. It consists of text section, data section, stack, and heap. The process control block (PCB) stores state, program counter, and registers.
CPU Scheduling:
Algorithms include First-Come First-Served (FCFS), Shortest-Job-First (SJF), and Round Robin (RR) with time quanta.
Deadlocks:
A deadlock requires four Coffman conditions: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. The Banker's Algorithm prevents deadlocks through safety checks.
Memory Management:
Paging divides memory into fixed frames and logical memory into pages. A page table translates logical addresses to physical addresses. Page faults trigger loading from swap space.`;
    } else if (sampleType === 'java') {
      docName = 'java_oop_concepts.txt';
      sampleContent = `Java OOP Foundations:
Object-Oriented Programming centers on four pillars: Encapsulation, Abstraction, Inheritance, and Polymorphism.
Encapsulation bundles data (attributes) and code (methods) together into classes, hiding internal state using private access modifiers and providing getters and setters.
Inheritance permits a subclass to inherit fields and methods from a superclass using the 'extends' keyword.
Polymorphism allows objects to take multiple forms. Compile-time polymorphism is achieved through method overloading (same method name, different parameters). Runtime polymorphism is achieved via method overriding where a subclass overrides a parent method.
Interfaces declare abstract contracts that classes fulfill using 'implements'.`;
    }

    if (sampleContent && rawTextInput) {
      rawTextInput.value = sampleContent;
      if (textPasteArea) textPasteArea.style.display = 'block';
      if (textPasteToggle) textPasteToggle.innerHTML = '<span>- Hide direct text input (Sample Loaded)</span>';
      showToast(`Loaded sample: ${docName}`, 'success');
    }
  }
});
