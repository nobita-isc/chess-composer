/**
 * AdminPanel.js
 * Admin screen for managing puzzle reports
 *
 * Features:
 * - View all reported puzzles
 * - Pagination
 * - Block/Unblock puzzles
 * - Dismiss reports
 * - Edit puzzle FEN
 * - Export database
 */

import { Chess } from 'chess.js';
import { REPORT_REASON_LABELS } from './PuzzleReportManager.js';

/**
 * Show the admin panel overlay
 * @param {PuzzleReportManager} reportManager - Report manager instance
 */
export function showAdminPanel(reportManager) {
  // State
  let currentPage = 1;
  const pageSize = 20;
  let includeDismissed = false;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'admin-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'admin-panel-title');

  overlay.innerHTML = `
    <div class="admin-content">
      <button class="admin-close" aria-label="Close admin panel">&times;</button>

      <header class="admin-header">
        <h2 id="admin-panel-title">Puzzle Reports Admin</h2>
        <div class="admin-stats" id="admin-stats">
          Loading stats...
        </div>
      </header>

      <div class="admin-controls">
        <div class="filter-controls">
          <label class="filter-checkbox">
            <input type="checkbox" id="include-dismissed">
            <span>Show dismissed reports</span>
          </label>
        </div>
        <div class="action-controls">
          <button class="export-btn" id="export-db-btn">
            <span class="btn-icon">📥</span> Export Database
          </button>
        </div>
      </div>

      <div class="reports-table-container">
        <table class="reports-table">
          <thead>
            <tr>
              <th>Puzzle ID</th>
              <th>Reason</th>
              <th>Notes</th>
              <th>Reported</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="reports-tbody">
            <tr><td colspan="6" class="loading-cell">Loading reports...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" id="pagination">
        <!-- Pagination controls will be inserted here -->
      </div>
    </div>
  `;

  // Escape key handler
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closePanel();
    }
  };

  // Helper to close panel
  const closePanel = () => {
    document.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentNode) {
      document.body.removeChild(overlay);
    }
  };

  // Render stats
  const renderStats = async () => {
    const statsEl = overlay.querySelector('#admin-stats');
    try {
      const stats = await reportManager.getStats();
      statsEl.innerHTML = `
        <span class="stat-item">📋 ${stats.totalReports} total reports</span>
        <span class="stat-item">⏳ ${stats.pendingReports} pending</span>
        <span class="stat-item">🚫 ${stats.blockedPuzzles} blocked</span>
      `;
    } catch (error) {
      statsEl.textContent = 'Failed to load stats';
    }
  };

  // Render reports table
  const renderReports = async () => {
    const tbody = overlay.querySelector('#reports-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading...</td></tr>';

    try {
      const result = await reportManager.getReports({
        page: currentPage,
        pageSize,
        includeDismissed
      });

      if (result.reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No reports found</td></tr>';
        renderPagination(0, 0);
        return;
      }

      tbody.innerHTML = '';
      for (const report of result.reports) {
        const puzzleInfo = reportManager.getPuzzleInfo(report.puzzle_id);
        const modification = await reportManager.getModification(report.puzzle_id);
        const isBlocked = modification?.blocked === 1;
        const isDismissed = report.dismissed === 1;

        const escapedPuzzleId = escapeHtml(report.puzzle_id);
        const escapedPuzzleIdAttr = escapeHtmlAttr(report.puzzle_id);
        const escapedReason = escapeHtml(report.reason);
        const escapedFenAttr = escapeHtmlAttr(puzzleInfo?.fen || '');

        const row = document.createElement('tr');
        row.className = isDismissed ? 'dismissed-row' : '';
        row.innerHTML = `
          <td>
            <code class="puzzle-id">${escapedPuzzleId}</code>
            ${puzzleInfo ? `<div class="puzzle-meta-small">Rating: ${escapeHtml(String(puzzleInfo.rating || 'N/A'))}</div>` : ''}
          </td>
          <td>
            <span class="reason-badge reason-${escapedReason}">
              ${escapeHtml(REPORT_REASON_LABELS[report.reason] || report.reason)}
            </span>
          </td>
          <td class="notes-cell">
            ${report.notes ? `<div class="notes-text">${escapeHtml(report.notes)}</div>` : '<em class="no-notes">No notes</em>'}
          </td>
          <td class="date-cell">
            ${formatDate(report.reported_at)}
          </td>
          <td>
            ${isBlocked ? '<span class="status-badge blocked">Blocked</span>' : ''}
            ${isDismissed ? '<span class="status-badge dismissed">Dismissed</span>' : ''}
            ${!isBlocked && !isDismissed ? '<span class="status-badge pending">Pending</span>' : ''}
          </td>
          <td class="actions-cell">
            <div class="action-buttons">
              ${!isBlocked ?
                `<button class="action-btn block-btn" data-puzzle-id="${escapedPuzzleIdAttr}" title="Block this puzzle">
                  Block
                </button>` :
                `<button class="action-btn unblock-btn" data-puzzle-id="${escapedPuzzleIdAttr}" title="Unblock this puzzle">
                  Unblock
                </button>`
              }
              ${!isDismissed ?
                `<button class="action-btn dismiss-btn" data-report-id="${report.id}" title="Dismiss this report">
                  Dismiss
                </button>` : ''
              }
              <button class="action-btn edit-btn" data-puzzle-id="${escapedPuzzleIdAttr}" data-fen="${escapedFenAttr}" title="Edit FEN">
                Edit FEN
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(row);
      }

      renderPagination(result.total, result.page);
      attachRowEventListeners(tbody);
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="6" class="error-cell">Failed to load reports: ${escapeHtml(error.message)}</td></tr>`;
    }
  };

  // Render pagination
  const renderPagination = (total, page) => {
    const paginationEl = overlay.querySelector('#pagination');
    const totalPages = Math.ceil(total / pageSize);

    if (totalPages <= 1) {
      paginationEl.innerHTML = `<span class="page-info">Showing ${total} report${total !== 1 ? 's' : ''}</span>`;
      return;
    }

    paginationEl.innerHTML = `
      <button class="page-btn prev-btn" ${page <= 1 ? 'disabled' : ''}>← Previous</button>
      <span class="page-info">Page ${page} of ${totalPages} (${total} total)</span>
      <button class="page-btn next-btn" ${page >= totalPages ? 'disabled' : ''}>Next →</button>
    `;

    // Pagination event listeners
    paginationEl.querySelector('.prev-btn')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderReports();
      }
    });

    paginationEl.querySelector('.next-btn')?.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderReports();
      }
    });
  };

  // Attach event listeners to action buttons in table rows
  const attachRowEventListeners = (tbody) => {
    // Block buttons
    tbody.querySelectorAll('.block-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const puzzleId = btn.dataset.puzzleId;
        btn.disabled = true;
        btn.textContent = 'Blocking...';

        const result = await reportManager.blockPuzzle(puzzleId);
        if (result.success) {
          showToast('Puzzle blocked successfully', 'success');
          renderReports();
          renderStats();
        } else {
          showToast('Failed to block puzzle: ' + result.error, 'error');
          btn.disabled = false;
          btn.textContent = '🚫 Block';
        }
      });
    });

    // Unblock buttons
    tbody.querySelectorAll('.unblock-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const puzzleId = btn.dataset.puzzleId;
        btn.disabled = true;
        btn.textContent = 'Unblocking...';

        const result = await reportManager.unblockPuzzle(puzzleId);
        if (result.success) {
          showToast('Puzzle unblocked successfully', 'success');
          renderReports();
          renderStats();
        } else {
          showToast('Failed to unblock puzzle: ' + result.error, 'error');
          btn.disabled = false;
          btn.textContent = '✅ Unblock';
        }
      });
    });

    // Dismiss buttons
    tbody.querySelectorAll('.dismiss-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const reportId = parseInt(btn.dataset.reportId, 10);
        btn.disabled = true;
        btn.textContent = 'Dismissing...';

        const result = await reportManager.dismissReport(reportId);
        if (result.success) {
          showToast('Report dismissed', 'success');
          renderReports();
          renderStats();
        } else {
          showToast('Failed to dismiss report: ' + result.error, 'error');
          btn.disabled = false;
          btn.textContent = '✖ Dismiss';
        }
      });
    });

    // Edit FEN buttons
    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const puzzleId = btn.dataset.puzzleId;
        const currentFen = btn.dataset.fen;
        showEditFenDialog(puzzleId, currentFen, reportManager, () => {
          renderReports();
        });
      });
    });
  };

  // Event listeners
  const closeBtn = overlay.querySelector('.admin-close');
  closeBtn.addEventListener('click', closePanel);

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePanel();
    }
  });

  // Escape to close
  document.addEventListener('keydown', handleKeyDown);

  // Filter checkbox
  const filterCheckbox = overlay.querySelector('#include-dismissed');
  filterCheckbox.addEventListener('change', () => {
    includeDismissed = filterCheckbox.checked;
    currentPage = 1;
    renderReports();
  });

  // Export button
  const exportBtn = overlay.querySelector('#export-db-btn');
  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    exportBtn.innerHTML = '<span class="btn-icon">⏳</span> Exporting...';

    try {
      await reportManager.exportDatabase();
      showToast('Database exported successfully', 'success');
    } catch (error) {
      showToast('Failed to export database: ' + error.message, 'error');
    }

    exportBtn.disabled = false;
    exportBtn.innerHTML = '<span class="btn-icon">📥</span> Export Database';
  });

  // Show panel
  document.body.appendChild(overlay);

  // Initial render
  renderStats();
  renderReports();
}

/**
 * Show edit FEN dialog
 * @param {string} puzzleId - Puzzle ID
 * @param {string} currentFen - Current FEN string
 * @param {PuzzleReportManager} reportManager - Report manager instance
 * @param {function} onSave - Callback on successful save
 */
function showEditFenDialog(puzzleId, currentFen, reportManager, onSave) {
  const dialog = document.createElement('div');
  dialog.className = 'edit-fen-overlay';

  dialog.innerHTML = `
    <div class="edit-fen-content">
      <button class="edit-fen-close">&times;</button>
      <h3>Edit Puzzle FEN</h3>
      <p class="edit-fen-info">Puzzle ID: <code>${escapeHtml(puzzleId)}</code></p>

      <div class="form-group">
        <label for="edit-fen-input">FEN String:</label>
        <textarea id="edit-fen-input" class="fen-input" rows="2">${escapeHtml(currentFen || '')}</textarea>
        <div id="fen-validation" class="fen-validation"></div>
      </div>

      <div class="form-actions">
        <button class="cancel-btn" type="button">Cancel</button>
        <button class="save-btn" type="button">Save Changes</button>
      </div>
    </div>
  `;

  const closeDialog = () => {
    if (dialog.parentNode) {
      document.body.removeChild(dialog);
    }
  };

  const fenInput = dialog.querySelector('#edit-fen-input');
  const validationEl = dialog.querySelector('#fen-validation');
  const saveBtn = dialog.querySelector('.save-btn');

  // Validate FEN on input
  fenInput.addEventListener('input', () => {
    const fen = fenInput.value.trim();
    if (!fen) {
      validationEl.textContent = '';
      validationEl.className = 'fen-validation';
      return;
    }

    try {
      new Chess(fen);
      validationEl.textContent = '✓ Valid FEN';
      validationEl.className = 'fen-validation valid';
    } catch (error) {
      validationEl.textContent = '✗ Invalid FEN: ' + error.message;
      validationEl.className = 'fen-validation invalid';
    }
  });

  // Close button
  dialog.querySelector('.edit-fen-close').addEventListener('click', closeDialog);

  // Cancel button
  dialog.querySelector('.cancel-btn').addEventListener('click', closeDialog);

  // Click outside to close
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      closeDialog();
    }
  });

  // Save button
  saveBtn.addEventListener('click', async () => {
    const newFen = fenInput.value.trim();

    if (!newFen) {
      validationEl.textContent = 'FEN cannot be empty';
      validationEl.className = 'fen-validation invalid';
      return;
    }

    // Validate FEN
    try {
      new Chess(newFen);
    } catch (error) {
      validationEl.textContent = '✗ Invalid FEN: ' + error.message;
      validationEl.className = 'fen-validation invalid';
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const result = await reportManager.updatePuzzleFEN(puzzleId, newFen);

    if (result.success) {
      showToast('FEN updated successfully', 'success');
      closeDialog();
      onSave();
    } else {
      showToast('Failed to update FEN: ' + result.error, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  });

  document.body.appendChild(dialog);
  fenInput.focus();
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'info'
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `admin-toast toast-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  // Remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

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
 * Escape HTML attribute values
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for use in attributes
 */
function escapeHtmlAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Format timestamp to readable date
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted date string
 */
function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default showAdminPanel;
