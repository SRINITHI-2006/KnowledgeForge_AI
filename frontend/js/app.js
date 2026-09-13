/**
 * KnowledgeForge AI - Shared App Script (app.js)
 * Utilities, Navigation, and Notification Helpers
 */

const API_BASE = '/api';

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', () => {
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');

  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // Highlight active link based on current path
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentPath || (currentPath === '' && href === 'index.html'))) {
      link.classList.add('active');
    }
  });
});

/**
 * Display a temporary floating toast message
 * @param {string} message - Text to display
 * @param {'success'|'danger'|'warning'|'info'} type
 */
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const colors = {
    success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
    danger: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    info: { bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3' }
  };
  const color = colors[type] || colors.info;

  toast.style.cssText = `
    background-color: ${color.bg};
    border: 1px solid ${color.border};
    color: ${color.text};
    padding: 12px 18px;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.25s ease;
  `;

  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
    <button style="background:none; border:none; cursor:pointer; color:${color.text}; font-size:1.1rem; line-height:1;">&times;</button>
  `;

  toast.querySelector('button').addEventListener('click', () => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  });

  toastContainer.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }
  }, 4500);
}

/**
 * Escape HTML to prevent XSS in rendering
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Format bytes to readable size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
