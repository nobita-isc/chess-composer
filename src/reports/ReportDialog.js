/**
 * ReportDialog.js
 * Modal dialog for submitting puzzle reports
 */

import { REPORT_REASONS, REPORT_REASON_LABELS } from './PuzzleReportManager.js';

/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Show the report dialog modal
 * @param {string} puzzleId - Puzzle ID being reported
 * @param {string} puzzleName - Display name/theme of the puzzle
 * @param {function} onSubmit - Callback function(puzzleId, reason, notes) called on submit
 */
export function showReportDialog(puzzleId, puzzleName, onSubmit) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'report-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'report-dialog-title');

  // Generate radio buttons for reasons
  const reasonOptions = Object.entries(REPORT_REASONS)
    .map(([key, value]) => `
      <label class="reason-option">
        <input type="radio" name="report-reason" value="${value}" required>
        <span class="reason-label">${REPORT_REASON_LABELS[value]}</span>
      </label>
    `).join('');

  overlay.innerHTML = `
    <div class="report-content">
      <button class="report-close" aria-label="Close dialog">&times;</button>

      <h2 id="report-dialog-title">Report Puzzle Issue</h2>
      <p class="report-puzzle-info">Puzzle: <code>${escapeHtml(puzzleId)}</code> (${escapeHtml(puzzleName) || 'Unknown theme'})</p>

      <form id="report-form" class="report-form">
        <div class="form-group">
          <label class="form-label">What's the issue?</label>
          <div class="reason-options">
            ${reasonOptions}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="report-notes">Additional notes (optional)</label>
          <textarea
            id="report-notes"
            name="notes"
            class="report-notes"
            rows="3"
            maxlength="500"
            placeholder="Describe the issue in more detail..."
          ></textarea>
          <span class="char-count"><span id="notes-count">0</span>/500</span>
        </div>

        <div class="form-actions">
          <button type="button" class="cancel-btn">Cancel</button>
          <button type="submit" class="submit-btn">Submit Report</button>
        </div>
      </form>
    </div>
  `;

  // Escape key handler
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
    }
  };

  // Helper to close dialog
  const closeDialog = () => {
    document.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentNode) {
      document.body.removeChild(overlay);
    }
  };

  // Add event listeners
  const form = overlay.querySelector('#report-form');
  const notesInput = overlay.querySelector('#report-notes');
  const notesCount = overlay.querySelector('#notes-count');
  const closeBtn = overlay.querySelector('.report-close');
  const cancelBtn = overlay.querySelector('.cancel-btn');

  // Update character count
  notesInput.addEventListener('input', () => {
    notesCount.textContent = notesInput.value.length;
  });

  // Close button
  closeBtn.addEventListener('click', closeDialog);

  // Cancel button
  cancelBtn.addEventListener('click', closeDialog);

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDialog();
    }
  });

  // Escape key to close
  document.addEventListener('keydown', handleKeyDown);

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const reason = formData.get('report-reason');
    const notes = formData.get('notes') || '';

    if (!reason) {
      showFormError(form, 'Please select a reason for the report');
      return;
    }

    // Disable form while submitting
    const submitBtn = form.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      await onSubmit(puzzleId, reason, notes);
      closeDialog();
    } catch (error) {
      showFormError(form, error.message || 'Failed to submit report');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Report';
    }
  });

  // Show dialog
  document.body.appendChild(overlay);

  // Focus first radio button
  const firstRadio = overlay.querySelector('input[type="radio"]');
  if (firstRadio) {
    firstRadio.focus();
  }
}

/**
 * Show error message in form
 * @param {HTMLFormElement} form - Form element
 * @param {string} message - Error message
 */
function showFormError(form, message) {
  // Remove existing error
  const existingError = form.querySelector('.form-error');
  if (existingError) {
    existingError.remove();
  }

  // Create error element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'form-error';
  errorDiv.textContent = message;

  // Insert before form actions
  const formActions = form.querySelector('.form-actions');
  form.insertBefore(errorDiv, formActions);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

export default showReportDialog;
