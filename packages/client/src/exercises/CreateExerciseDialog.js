/**
 * CreateExerciseDialog.js
 * Dialog for creating a weekly exercise from generated puzzles.
 * Handles three entry states:
 *   1. No puzzles exist - shows inline generate form
 *   2. Puzzles exist - shows confirmation with option to regenerate
 *   3. Ready - normal exercise creation form
 */

import {
  populateThemeSelect,
  buildGenerateParams,
  processPuzzles,
  RATING_RANGE_OPTIONS
} from '../puzzles/puzzleGeneration.js';
import { renderPuzzleThumbnail, attachThumbnailZoom } from '../puzzles/staticBoard.js';

/**
 * Show the create exercise dialog
 * @param {ApiClient} apiClient - API client instance
 * @param {object[]} initialPuzzles - Current generated puzzles (may be empty)
 * @param {Function} onPuzzlesUpdated - Callback when puzzles are generated in-dialog
 * @returns {Promise<object|null>} - Created exercise or null if cancelled
 */
export function showCreateExerciseDialog(apiClient, initialPuzzles, onPuzzlesUpdated = () => {}) {
  return new Promise((resolve) => {
    let activePuzzles = initialPuzzles || [];
    let closed = false;

    const dialog = document.createElement('div');
    dialog.className = 'create-exercise-dialog';
    dialog.innerHTML = `
      <div class="dialog-content create-exercise-dialog-content">
        <button class="dialog-close" aria-label="Close">&times;</button>
        <h3>Create Weekly Exercise</h3>
        <div class="dialog-inner"></div>
      </div>
    `;

    const closeDialog = (result) => {
      closed = true;
      if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
      resolve(result);
    };

    dialog.querySelector('.dialog-close').addEventListener('click', () => closeDialog(null));
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeDialog(null);
    });

    document.body.appendChild(dialog);

    const innerEl = dialog.querySelector('.dialog-inner');

    // ==================== State: No Puzzles (Generate Form) ====================

    const renderGenerateForm = async () => {
      innerEl.innerHTML = `
        <div class="dlg-generate-notice">
          <p>No puzzles generated yet. Configure options below to generate puzzles for this exercise.</p>
        </div>
        <form id="dlg-generate-form" class="inline-generate-form">
          <div class="form-group">
            <label for="dlg-theme-select">Chess Theme</label>
            <select id="dlg-theme-select" class="theme-select">
              <option value="">Loading themes...</option>
            </select>
          </div>
          <div class="form-group">
            <label for="dlg-rating-range">Rating Range</label>
            <select id="dlg-rating-range">
              ${RATING_RANGE_OPTIONS.map(o =>
                `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="dlg-puzzle-count">Number of Puzzles (1-20)</label>
            <input type="number" id="dlg-puzzle-count" min="1" max="20" value="10">
          </div>
          <div class="form-error" id="dlg-gen-error"></div>
          <div class="dialog-actions">
            <button type="button" class="cancel-btn">Cancel</button>
            <button type="submit" class="primary-btn">Generate Puzzles</button>
          </div>
        </form>
      `;

      await populateThemeSelect(innerEl.querySelector('#dlg-theme-select'), apiClient);

      innerEl.querySelector('.cancel-btn').addEventListener('click', () => closeDialog(null));

      innerEl.querySelector('#dlg-generate-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const theme = innerEl.querySelector('#dlg-theme-select').value || null;
        const ratingRange = innerEl.querySelector('#dlg-rating-range').value;
        const count = parseInt(innerEl.querySelector('#dlg-puzzle-count').value);
        const errorEl = innerEl.querySelector('#dlg-gen-error');

        if (isNaN(count) || count < 1 || count > 20) {
          errorEl.textContent = 'Enter a number between 1 and 20';
          return;
        }

        await runGenerate(theme, ratingRange, count);
      });
    };

    // ==================== State: Confirm Existing Puzzles ====================

    const renderConfirmExisting = () => {
      const n = activePuzzles.length;
      innerEl.innerHTML = `
        <div class="existing-puzzles-notice">
          <p>You have <strong>${n} puzzle${n !== 1 ? 's' : ''}</strong> already generated.</p>
          <div class="puzzle-thumbnail-grid">
            ${activePuzzles.map((p, i) => renderPuzzleThumbnail(p, i)).join('')}
          </div>
        </div>
        <div class="confirm-actions">
          <button class="generate-btn" id="dlg-use-existing">Use Current ${n} Puzzle${n !== 1 ? 's' : ''}</button>
          <button class="btn-outline" id="dlg-regenerate" style="padding:10px 20px">Generate New Puzzles</button>
        </div>
      `;

      attachThumbnailZoom(innerEl, activePuzzles);

      innerEl.querySelector('#dlg-use-existing').addEventListener('click', () => {
        renderExerciseForm(activePuzzles);
      });

      innerEl.querySelector('#dlg-regenerate').addEventListener('click', () => {
        renderGenerateForm();
      });
    };

    // ==================== State: Generating (Spinner) ====================

    const renderGenerating = (message) => {
      innerEl.innerHTML = `
        <div class="dlg-generating">
          <div class="dlg-spinner"></div>
          <p>${escapeHtml(message)}</p>
        </div>
      `;
    };

    // ==================== Generate Action ====================

    const runGenerate = async (theme, ratingRange, count) => {
      renderGenerating(`Generating ${count} puzzles...`);
      try {
        const params = buildGenerateParams(theme, ratingRange, count);
        const rawPuzzles = await apiClient.generatePuzzles(params);
        if (closed) return;
        const processed = processPuzzles(rawPuzzles, theme);
        activePuzzles = processed;
        onPuzzlesUpdated(processed);
        renderExerciseForm(processed);
      } catch (err) {
        if (closed) return;
        await renderGenerateForm();
        const errorEl = innerEl.querySelector('#dlg-gen-error');
        if (errorEl) {
          errorEl.textContent = err.message || 'Failed to generate puzzles';
        }
      }
    };

    // ==================== State: Exercise Creation Form ====================

    const renderExerciseForm = async (puzzles) => {
      let currentWeek = null;
      try {
        currentWeek = await apiClient.getCurrentWeek();
      } catch (error) {
        // Will use defaults
      }

      innerEl.innerHTML = `
        ${currentWeek?.has_exercise ? `
          <div class="warning-banner">
            An exercise already exists for this week (${escapeHtml(currentWeek.week_label)}).
            You can create an exercise for a different week.
          </div>
        ` : ''}

        <form id="exercise-form" class="exercise-form" style="display:flex;flex-direction:column;max-height:calc(90vh - 80px)">
          <div style="flex:1;overflow-y:auto;padding-right:4px">
            <div class="form-group">
              <label for="exercise-name">Exercise Name (optional)</label>
              <input type="text" id="exercise-name"
                placeholder="${currentWeek ? `Week of ${escapeHtml(currentWeek.week_label)}` : 'Enter a name'}">
            </div>

            <div class="form-group">
              <label for="week-start">Week Start (Monday)</label>
              <input type="date" id="week-start"
                value="${currentWeek?.week_start || getDefaultMonday()}">
            </div>

            <div class="puzzles-summary">
              <h4>Puzzles to Include (${puzzles.length})</h4>
              <div class="puzzle-thumbnail-grid" style="max-height:300px;overflow-y:auto">
                ${puzzles.map((p, i) => renderPuzzleThumbnail(p, i)).join('')}
              </div>
            </div>

            <div class="form-error" id="form-error"></div>
          </div>

          <div class="dialog-actions" style="flex-shrink:0;border-top:1px solid var(--color-gray-200);padding-top:16px;margin-top:16px">
            <button type="button" class="btn-outline" style="padding:10px 20px">Cancel</button>
            <button type="submit" class="save-btn generate-btn" style="padding:10px 20px">Create Exercise</button>
          </div>
        </form>
      `;

      innerEl.querySelector('.btn-outline').addEventListener('click', () => closeDialog(null));
      attachThumbnailZoom(innerEl, puzzles);

      innerEl.querySelector('#exercise-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = innerEl.querySelector('#exercise-name').value.trim();
        const weekStart = innerEl.querySelector('#week-start').value;
        const errorEl = innerEl.querySelector('#form-error');
        const saveBtn = innerEl.querySelector('.save-btn');

        const [yr, mo, dy] = weekStart.split('-').map(Number);
        const weekDate = new Date(yr, mo - 1, dy);
        if (weekDate.getDay() !== 1) {
          errorEl.textContent = 'Week start must be a Monday';
          return;
        }

        try {
          errorEl.textContent = '';
          saveBtn.disabled = true;
          saveBtn.textContent = 'Creating...';

          const result = await apiClient.createExercise({
            puzzleIds: puzzles.map(p => p.id),
            name: name || null,
            weekStart,
            filters: { count: puzzles.length }
          });

          closeDialog(result);
        } catch (error) {
          errorEl.textContent = error.message;
          saveBtn.disabled = false;
          saveBtn.textContent = 'Create Exercise';
        }
      });
    };

    // ==================== Entry Point ====================

    if (activePuzzles.length === 0) {
      renderGenerateForm();
    } else {
      renderConfirmExisting();
    }
  });
}

function getDefaultMonday() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export default showCreateExerciseDialog;
