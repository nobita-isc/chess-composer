/**
 * GradeDialog.js
 * Dialog for grading student exercises and uploading answer PDFs
 */

const STATUS_LABELS = {
  'assigned': 'Assigned',
  'submitted': 'Submitted',
  'graded': 'Graded'
};

/**
 * Show the grade dialog
 * @param {ApiClient} apiClient - API client instance
 * @param {object} assignment - Student exercise assignment
 * @returns {Promise<object|null>} - Updated assignment or null if cancelled
 */
export function showGradeDialog(apiClient, assignment) {
  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'grade-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <button class="dialog-close">&times;</button>
        <h3>Grade Exercise</h3>

        <div class="assignment-info">
          <p><strong>Student:</strong> ${escapeHtml(assignment.student_name)}</p>
          <p><strong>Week:</strong> ${escapeHtml(assignment.week_start)} - ${escapeHtml(assignment.week_end)}</p>
          <p><strong>Status:</strong> <span class="status-badge status-${assignment.status}">${STATUS_LABELS[assignment.status]}</span></p>
          <p><strong>Total Puzzles:</strong> ${assignment.total_puzzles}</p>
        </div>

        <form id="grade-form" class="grade-form">
          <div class="form-group">
            <label for="answer-pdf">Upload Answer PDF</label>
            <input type="file" id="answer-pdf" accept=".pdf">
            ${assignment.answer_pdf_path ? `
              <div class="existing-file">
                Current: ${escapeHtml(assignment.answer_pdf_path)}
                <a href="${apiClient.getAnswerPdfUrl(assignment.id)}" target="_blank">Download</a>
              </div>
            ` : ''}
          </div>

          <div class="form-group">
            <label for="score">Score (0 - ${assignment.total_puzzles})</label>
            <input type="number" id="score" min="0" max="${assignment.total_puzzles}"
              value="${assignment.score !== null ? assignment.score : ''}"
              placeholder="Enter number of correct answers">
          </div>

          <div class="form-group">
            <label for="notes">Notes (optional)</label>
            <textarea id="notes" rows="3"
              placeholder="Optional feedback or notes">${escapeHtml(assignment.notes || '')}</textarea>
          </div>

          <div class="form-error" id="form-error"></div>

          <div class="dialog-actions">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="button" class="upload-btn" id="upload-btn">Upload PDF</button>
            <button type="submit" class="save-btn primary-btn">Save Grade</button>
          </div>
        </form>
      </div>
    `;

    const closeDialog = (result) => {
      if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
      resolve(result);
    };

    dialog.querySelector('.dialog-close').addEventListener('click', () => closeDialog(null));
    dialog.querySelector('.cancel-btn').addEventListener('click', () => closeDialog(null));

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeDialog(null);
    });

    // Upload PDF button
    dialog.querySelector('#upload-btn').addEventListener('click', async () => {
      const fileInput = dialog.querySelector('#answer-pdf');
      const file = fileInput.files[0];
      const errorEl = dialog.querySelector('#form-error');
      const uploadBtn = dialog.querySelector('#upload-btn');

      if (!file) {
        errorEl.textContent = 'Please select a PDF file first';
        return;
      }

      if (!file.name.toLowerCase().endsWith('.pdf')) {
        errorEl.textContent = 'Only PDF files are allowed';
        return;
      }

      try {
        errorEl.textContent = '';
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        await apiClient.uploadAnswerPdf(assignment.id, file);

        uploadBtn.textContent = 'Uploaded!';
        uploadBtn.style.background = '#28a745';
      } catch (error) {
        errorEl.textContent = error.message;
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload PDF';
      }
    });

    // Grade form submit
    dialog.querySelector('#grade-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const scoreInput = dialog.querySelector('#score');
      const score = parseInt(scoreInput.value, 10);
      const notes = dialog.querySelector('#notes').value.trim();

      const errorEl = dialog.querySelector('#form-error');
      const saveBtn = dialog.querySelector('.save-btn');

      if (isNaN(score)) {
        errorEl.textContent = 'Please enter a valid score';
        return;
      }

      if (score < 0 || score > assignment.total_puzzles) {
        errorEl.textContent = `Score must be between 0 and ${assignment.total_puzzles}`;
        return;
      }

      try {
        errorEl.textContent = '';
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const result = await apiClient.gradeExercise(assignment.id, score, notes || null);
        closeDialog(result);
      } catch (error) {
        errorEl.textContent = error.message;
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Grade';
      }
    });

    document.body.appendChild(dialog);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export default showGradeDialog;
