/**
 * KnowledgeForge AI - Quiz History Script (history.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  const historyListContainer = document.getElementById('historyListContainer');
  const emptyState = document.getElementById('emptyState');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const historyCountBadge = document.getElementById('historyCountBadge');

  loadHistory();

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear all quiz history? This action cannot be undone.')) {
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/history`, {
          method: 'DELETE'
        });

        if (res.ok) {
          showToast('History cleared', 'success');
          loadHistory();
        } else {
          throw new Error('Failed to clear history on server');
        }
      } catch (err) {
        console.warn('Clearing history locally:', err);
        localStorage.removeItem('quiz_history');
        showToast('History cleared', 'success');
        loadHistory();
      }
    });
  }

  async function loadHistory() {
    try {
      const res = await fetch(`${API_BASE}/history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      renderHistoryItems(data.history || data);
    } catch (err) {
      console.warn('Using local history fallback:', err);
      const fallback = [
        {
          id: "hist_1",
          title: "Operating Systems Architecture & Kernels",
          score: 8,
          totalQuestions: 10,
          percentage: 80,
          performanceLevel: "Good",
          date: "13 Sep 2026",
          difficulty: "medium",
          sourceDocument: "os_lecture_notes.pdf",
          strongAreas: ["Process Management", "CPU Scheduling"],
          weakAreas: ["Deadlocks", "Memory Management"],
          recommendation: "Review deadlock prevention algorithms and paging before attempting another quiz."
        },
        {
          id: "hist_2",
          title: "Java Object-Oriented Programming (OOP)",
          score: 9,
          totalQuestions: 10,
          percentage: 90,
          performanceLevel: "Excellent",
          date: "12 Sep 2026",
          difficulty: "hard",
          sourceDocument: "java_oop_concepts.txt",
          strongAreas: ["Polymorphism", "Inheritance", "Encapsulation"],
          weakAreas: ["Abstract Classes vs Interfaces"],
          recommendation: "Solidify edge cases around interface default methods."
        },
        {
          id: "hist_3",
          title: "Database Management Systems (DBMS)",
          score: 7,
          totalQuestions: 10,
          percentage: 70,
          performanceLevel: "Good",
          date: "11 Sep 2026",
          difficulty: "medium",
          sourceDocument: "dbms_normalization.pdf",
          strongAreas: ["Relational Algebra", "SQL Queries"],
          weakAreas: ["Boyce-Codd Normal Form (BCNF)", "ACID Properties"],
          recommendation: "Focus on 3NF vs BCNF decomposition to improve score."
        }
      ];
      renderHistoryItems(fallback);
    }
  }

  function renderHistoryItems(items) {
    if (!historyListContainer) return;
    historyListContainer.innerHTML = '';

    if (!items || items.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (historyCountBadge) historyCountBadge.textContent = '0 Quizzes';
      if (clearAllBtn) clearAllBtn.disabled = true;
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (clearAllBtn) clearAllBtn.disabled = false;
    if (historyCountBadge) historyCountBadge.textContent = `${items.length} ${items.length === 1 ? 'Quiz' : 'Quizzes'}`;

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card';

      let tierBadgeClass = 'badge-neutral';
      if (item.percentage >= 90) tierBadgeClass = 'badge-success';
      else if (item.percentage >= 70) tierBadgeClass = 'badge-primary';
      else if (item.percentage >= 50) tierBadgeClass = 'badge-warning';
      else tierBadgeClass = 'badge-danger';

      card.innerHTML = `
        <div class="history-score-badge">
          <div class="history-score-val">${item.score}/${item.totalQuestions}</div>
          <div class="history-score-pct">${item.percentage}%</div>
        </div>

        <div class="history-details" style="flex:1;">
          <h3>${escapeHtml(item.title)}</h3>
          <div class="history-meta">
            <span>📅 ${escapeHtml(item.date || 'Recent')}</span>
            <span>📄 ${escapeHtml(item.sourceDocument || 'Document')}</span>
            <span class="badge ${tierBadgeClass}">${escapeHtml(item.performanceLevel || 'Completed')}</span>
          </div>
        </div>

        <div class="history-actions">
          <button class="btn btn-secondary btn-sm view-result-btn">
            View Analysis
          </button>
          <button class="btn btn-danger btn-sm delete-btn" title="Delete Quiz Record">
            ✕
          </button>
        </div>
      `;

      // View Result button
      card.querySelector('.view-result-btn').addEventListener('click', () => {
        sessionStorage.setItem('currentQuizResult', JSON.stringify(item));
        window.location.href = 'result.html';
      });

      // Delete button
      card.querySelector('.delete-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete history for "${item.title}"?`)) return;

        try {
          const res = await fetch(`${API_BASE}/history/${encodeURIComponent(item.id)}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            showToast('Quiz deleted from history', 'info');
            loadHistory();
          } else {
            throw new Error('Failed to delete on server');
          }
        } catch (err) {
          card.remove();
          showToast('Removed quiz from view', 'info');
        }
      });

      historyListContainer.appendChild(card);
    });
  }
});
