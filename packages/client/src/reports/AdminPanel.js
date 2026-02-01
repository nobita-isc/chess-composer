/**
 * AdminPanel.js
 * Admin screen for managing puzzle reports
 *
 * Refactored to use API client instead of direct report manager.
 */

import { Chess } from 'chess.js';
import { showCreatePuzzleDialog } from '../puzzles/CreatePuzzleDialog.js';

const REPORT_REASON_LABELS = {
  'wrong_solution': 'Wrong Solution',
  'duplicate': 'Duplicate Puzzle',
  'broken_position': 'Broken Position',
  'other': 'Other'
};

/**
 * Show the admin panel overlay
 * @param {ApiClient} apiClient - API client instance
 */
export function showAdminPanel(apiClient) {
  let currentPage = 1;
  const pageSize = 20;
  let includeDismissed = false;

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
        <button id="create-puzzle-btn" class="action-btn" style="background: #28a745; padding: 8px 16px; border-radius: 4px; color: white; font-weight: 600;">
          + Create Custom Puzzle
        </button>
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

      <div class="pagination" id="pagination"></div>
    </div>
  `;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') closePanel();
  };

  const closePanel = () => {
    document.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentNode) document.body.removeChild(overlay);
  };

  const renderStats = async () => {
    const statsEl = overlay.querySelector('#admin-stats');
    try {
      const stats = await apiClient.getReportStats();

      statsEl.innerHTML = `
        <div class="stat-item">
          <span class="stat-value">${stats.totalReports}</span>
          <span class="stat-label">Total Reports</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.pendingReports}</span>
          <span class="stat-label">Pending</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${stats.blockedPuzzles}</span>
          <span class="stat-label">Blocked Puzzles</span>
        </div>
      `;
    } catch (error) {
      statsEl.innerHTML = '<span class="error">Failed to load stats</span>';
    }
  };

  const renderReports = async () => {
    const tbody = overlay.querySelector('#reports-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading...</td></tr>';

    try {
      const result = await apiClient.getReports({
        page: currentPage,
        pageSize,
        includeDismissed
      });

      const { reports, total, hasMore } = result;

      if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No reports found</td></tr>';
        return;
      }

      tbody.innerHTML = reports.map(report => `
        <tr data-report-id="${report.id}" data-puzzle-id="${escapeHtml(report.puzzle_id)}">
          <td class="puzzle-id-cell">
            <code>${escapeHtml(report.puzzle_id)}</code>
          </td>
          <td class="reason-cell">
            <span class="reason-badge reason-${report.reason}">
              ${REPORT_REASON_LABELS[report.reason] || report.reason}
            </span>
          </td>
          <td class="notes-cell">
            ${report.notes ? escapeHtml(report.notes) : '<em class="no-notes">No notes</em>'}
          </td>
          <td class="date-cell">
            ${formatDate(report.reported_at)}
          </td>
          <td class="status-cell">
            ${report.dismissed ?
              '<span class="status-badge status-dismissed">Dismissed</span>' :
              '<span class="status-badge status-pending">Pending</span>'}
          </td>
          <td class="actions-cell">
            <button class="action-btn block-btn" data-action="block" title="Block puzzle">🚫</button>
            <button class="action-btn unblock-btn" data-action="unblock" title="Unblock puzzle">✅</button>
            <button class="action-btn dismiss-btn" data-action="dismiss" title="Dismiss report">👁️</button>
            <button class="action-btn edit-btn" data-action="edit" title="Edit FEN">✏️</button>
          </td>
        </tr>
      `).join('');

      // Attach action handlers
      tbody.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const row = e.target.closest('tr');
          const reportId = parseInt(row.dataset.reportId);
          const puzzleId = row.dataset.puzzleId;
          const action = e.target.dataset.action;

          try {
            switch (action) {
              case 'block':
                await apiClient.blockPuzzle(puzzleId);
                showToast('Puzzle blocked');
                break;
              case 'unblock':
                await apiClient.unblockPuzzle(puzzleId);
                showToast('Puzzle unblocked');
                break;
              case 'dismiss':
                await apiClient.dismissReport(reportId);
                showToast('Report dismissed');
                break;
              case 'edit':
                showEditFENDialog(puzzleId);
                return;
            }
            await renderStats();
            await renderReports();
          } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
          }
        });
      });

      renderPagination(total);
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="6" class="error-cell">Error: ${escapeHtml(error.message)}</td></tr>`;
    }
  };

  const renderPagination = (total) => {
    const pagination = overlay.querySelector('#pagination');
    const totalPages = Math.ceil(total / pageSize);

    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    let html = '';

    if (currentPage > 1) {
      html += `<button class="page-btn" data-page="${currentPage - 1}">← Previous</button>`;
    }

    html += `<span class="page-info">Page ${currentPage} of ${totalPages}</span>`;

    if (currentPage < totalPages) {
      html += `<button class="page-btn" data-page="${currentPage + 1}">Next →</button>`;
    }

    pagination.innerHTML = html;

    pagination.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        renderReports();
      });
    });
  };

  const showEditFENDialog = async (puzzleId) => {
    let currentFen = '';

    try {
      const puzzle = await apiClient.getPuzzle(puzzleId);
      currentFen = puzzle.fen || '';
    } catch (error) {
      currentFen = '';
    }

    const dialog = document.createElement('div');
    dialog.className = 'edit-fen-dialog';
    dialog.innerHTML = `
      <div class="edit-fen-content">
        <h3>Edit FEN for ${escapeHtml(puzzleId)}</h3>
        <div class="fen-input-group">
          <textarea id="fen-input" rows="3">${escapeHtml(currentFen)}</textarea>
          <div id="fen-validation" class="fen-validation"></div>
        </div>
        <div class="dialog-actions">
          <button class="cancel-btn">Cancel</button>
          <button class="save-btn" disabled>Save</button>
        </div>
      </div>
    `;

    overlay.appendChild(dialog);

    const fenInput = dialog.querySelector('#fen-input');
    const validation = dialog.querySelector('#fen-validation');
    const saveBtn = dialog.querySelector('.save-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');

    const validateFEN = (fen) => {
      try {
        new Chess(fen);
        validation.innerHTML = '<span class="valid">✓ Valid FEN</span>';
        validation.className = 'fen-validation valid';
        saveBtn.disabled = false;
        return true;
      } catch (error) {
        validation.innerHTML = '<span class="invalid">✗ Invalid FEN</span>';
        validation.className = 'fen-validation invalid';
        saveBtn.disabled = true;
        return false;
      }
    };

    fenInput.addEventListener('input', () => validateFEN(fenInput.value));
    validateFEN(currentFen);

    cancelBtn.addEventListener('click', () => dialog.remove());

    saveBtn.addEventListener('click', async () => {
      const newFen = fenInput.value.trim();
      if (!validateFEN(newFen)) return;

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        await apiClient.updatePuzzleFEN(puzzleId, newFen);
        showToast('FEN updated');
        dialog.remove();
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    });
  };

  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'error' ? '#dc3545' : '#28a745'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 20000;
      font-weight: 600;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // Initialize
  document.body.appendChild(overlay);
  document.addEventListener('keydown', handleKeyDown);

  overlay.querySelector('.admin-close').addEventListener('click', closePanel);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePanel();
  });

  overlay.querySelector('#include-dismissed').addEventListener('change', (e) => {
    includeDismissed = e.target.checked;
    currentPage = 1;
    renderReports();
  });

  overlay.querySelector('#create-puzzle-btn').addEventListener('click', () => {
    showCreatePuzzleDialog(apiClient);
  });

  renderStats();
  renderReports();
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default showAdminPanel;
