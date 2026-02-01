/**
 * CreateExerciseDialog.js
 * Dialog for creating a weekly exercise from generated puzzles
 */

/**
 * Show the create exercise dialog
 * @param {ApiClient} apiClient - API client instance
 * @param {object[]} puzzles - Current generated puzzles
 * @returns {Promise<object|null>} - Created exercise or null if cancelled
 */
export function showCreateExerciseDialog(apiClient, puzzles) {
  return new Promise(async (resolve) => {
    let currentWeek = null;

    try {
      currentWeek = await apiClient.getCurrentWeek();
    } catch (error) {
      // Will show error in dialog
    }

    const dialog = document.createElement('div');
    dialog.className = 'create-exercise-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <button class="dialog-close">&times;</button>
        <h3>Create Weekly Exercise</h3>

        ${currentWeek?.has_exercise ? `
          <div class="warning-banner">
            An exercise already exists for this week (${escapeHtml(currentWeek.week_label)}).
            You can create an exercise for a different week.
          </div>
        ` : ''}

        <form id="exercise-form" class="exercise-form">
          <div class="form-group">
            <label for="exercise-name">Exercise Name (optional)</label>
            <input type="text" id="exercise-name"
              placeholder="${currentWeek ? `Week of ${currentWeek.week_label}` : 'Enter a name'}">
          </div>

          <div class="form-group">
            <label for="week-start">Week Start (Monday)</label>
            <input type="date" id="week-start"
              value="${currentWeek?.week_start || getDefaultMonday()}">
          </div>

          <div class="puzzles-summary">
            <h4>Puzzles to Include (${puzzles.length})</h4>
            <div class="puzzles-preview">
              ${puzzles.slice(0, 5).map((p, i) => `
                <div class="puzzle-preview-item">
                  <span class="puzzle-num">#${i + 1}</span>
                  <span class="puzzle-rating">Rating: ${p.rating || 'N/A'}</span>
                </div>
              `).join('')}
              ${puzzles.length > 5 ? `<div class="more-puzzles">+ ${puzzles.length - 5} more</div>` : ''}
            </div>
          </div>

          <div class="form-error" id="form-error"></div>

          <div class="dialog-actions">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="submit" class="save-btn primary-btn">Create Exercise</button>
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

    dialog.querySelector('#exercise-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = dialog.querySelector('#exercise-name').value.trim();
      const weekStart = dialog.querySelector('#week-start').value;

      const errorEl = dialog.querySelector('#form-error');
      const saveBtn = dialog.querySelector('.save-btn');

      // Validate week start is a Monday
      const weekDate = new Date(weekStart);
      if (weekDate.getDay() !== 1) {
        errorEl.textContent = 'Week start must be a Monday';
        return;
      }

      try {
        errorEl.textContent = '';
        saveBtn.disabled = true;
        saveBtn.textContent = 'Creating...';

        const puzzleIds = puzzles.map(p => p.id);

        const result = await apiClient.createExercise({
          puzzleIds,
          name: name || null,
          weekStart,
          filters: {
            count: puzzles.length
          }
        });

        closeDialog(result);
      } catch (error) {
        errorEl.textContent = error.message;
        saveBtn.disabled = false;
        saveBtn.textContent = 'Create Exercise';
      }
    });

    document.body.appendChild(dialog);
  });
}

function getDefaultMonday() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export default showCreateExerciseDialog;
