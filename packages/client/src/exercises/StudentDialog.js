/**
 * StudentDialog.js
 * Dialog for creating/editing students
 */

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
];

/**
 * Show the student dialog
 * @param {ApiClient} apiClient - API client instance
 * @param {object|null} student - Existing student data for editing
 * @returns {Promise<object|null>} - Created/updated student or null if cancelled
 */
export function showStudentDialog(apiClient, student = null) {
  const isEditing = !!student;

  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'student-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <button class="dialog-close">&times;</button>
        <h3>${isEditing ? 'Edit Student' : 'Add Student'}</h3>

        <form id="student-form" class="student-form">
          <div class="form-group">
            <label for="student-name">Name *</label>
            <input type="text" id="student-name" required
              value="${escapeHtml(student?.name || '')}"
              placeholder="Enter student name">
          </div>

          <div class="form-group">
            <label for="student-email">Email</label>
            <input type="email" id="student-email"
              value="${escapeHtml(student?.email || '')}"
              placeholder="student@example.com">
          </div>

          <div class="form-group">
            <label for="student-skill">Skill Level</label>
            <select id="student-skill">
              ${SKILL_LEVELS.map(level => `
                <option value="${level.value}" ${student?.skill_level === level.value ? 'selected' : ''}>
                  ${level.label}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label for="student-notes">Notes</label>
            <textarea id="student-notes" rows="3"
              placeholder="Optional notes about the student">${escapeHtml(student?.notes || '')}</textarea>
          </div>

          <div class="form-error" id="form-error"></div>

          <div class="dialog-actions">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="submit" class="save-btn primary-btn">
              ${isEditing ? 'Save Changes' : 'Add Student'}
            </button>
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

    dialog.querySelector('#student-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = dialog.querySelector('#student-name').value.trim();
      const email = dialog.querySelector('#student-email').value.trim();
      const skill_level = dialog.querySelector('#student-skill').value;
      const notes = dialog.querySelector('#student-notes').value.trim();

      const errorEl = dialog.querySelector('#form-error');
      const saveBtn = dialog.querySelector('.save-btn');

      if (!name) {
        errorEl.textContent = 'Name is required';
        return;
      }

      try {
        errorEl.textContent = '';
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        let result;
        if (isEditing) {
          result = await apiClient.updateStudent(student.id, {
            name,
            email: email || null,
            skill_level,
            notes: notes || null
          });
        } else {
          result = await apiClient.createStudent({
            name,
            email: email || null,
            skill_level,
            notes: notes || null
          });
        }

        closeDialog(result);
      } catch (error) {
        errorEl.textContent = error.message;
        saveBtn.disabled = false;
        saveBtn.textContent = isEditing ? 'Save Changes' : 'Add Student';
      }
    });

    document.body.appendChild(dialog);
    dialog.querySelector('#student-name').focus();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export default showStudentDialog;
