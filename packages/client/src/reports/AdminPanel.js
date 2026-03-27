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
            <tr><td colspan="5" class="loading-cell">Loading reports...</td></tr>
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
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading...</td></tr>';

    try {
      const result = await apiClient.getReports({
        page: currentPage,
        pageSize,
        includeDismissed
      });

      const { reports, total, hasMore } = result;

      if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No reports found</td></tr>';
        return;
      }

      const reasonBadge = (reason) => {
        const cls = reason === 'wrong_solution' ? 'badge-advanced' : reason === 'broken_position' ? 'badge-intermediate' : 'badge-theme';
        return `<span class="badge ${cls}">${REPORT_REASON_LABELS[reason] || reason}</span>`;
      };

      const statusBadge = (dismissed) => {
        return dismissed
          ? '<span class="badge badge-beginner">Dismissed</span>'
          : '<span class="badge badge-intermediate">Pending</span>';
      };

      tbody.innerHTML = reports.map(report => `
        <tr data-report-id="${report.id}" data-puzzle-id="${escapeHtml(report.puzzle_id)}">
          <td>
            <div class="ep-cell-name"><code style="font-size:12px">${escapeHtml(report.puzzle_id)}</code></div>
            <div class="ep-cell-muted" style="font-size:12px">${report.notes ? escapeHtml(report.notes) : 'No notes'}</div>
          </td>
          <td>${reasonBadge(report.reason)}</td>
          <td><div class="ep-cell-muted" style="font-size:12px">${formatDate(report.reported_at)}</div></td>
          <td>${statusBadge(report.dismissed)}</td>
          <td>
            <div class="ep-actions">
              <button class="btn-outline btn-sm" data-action="block" title="Block">Block</button>
              <button class="btn-outline btn-sm" data-action="dismiss" title="Dismiss">Dismiss</button>
              <button class="btn-outline btn-sm ep-more-btn" data-action="more" title="More actions">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      // Attach action handlers
      tbody.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const row = btn.closest('tr');
          const reportId = parseInt(row.dataset.reportId);
          const puzzleId = row.dataset.puzzleId;
          const action = btn.dataset.action;

          try {
            if (action === 'block') {
              await apiClient.blockPuzzle(puzzleId);
              showToast('Puzzle blocked');
              await renderStats();
              await renderReports();
            } else if (action === 'dismiss') {
              await apiClient.dismissReport(reportId);
              showToast('Report dismissed');
              await renderStats();
              await renderReports();
            } else if (action === 'more') {
              document.querySelectorAll('.gd-dropdown').forEach(d => d.remove());
              const dropdown = document.createElement('div');
              dropdown.className = 'gd-dropdown';
              dropdown.innerHTML = `
                <button class="gd-dd-item" data-dd="unblock"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>Unblock Puzzle</button>
                <button class="gd-dd-item" data-dd="edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/></svg>Edit FEN</button>
              `;
              const rect = btn.getBoundingClientRect();
              dropdown.style.position = 'fixed';
              dropdown.style.top = `${rect.bottom + 4}px`;
              dropdown.style.right = `${window.innerWidth - rect.right}px`;
              document.body.appendChild(dropdown);
              const closeDd = () => { dropdown.remove(); document.removeEventListener('click', closeDd); };
              setTimeout(() => document.addEventListener('click', closeDd), 0);
              dropdown.querySelectorAll('.gd-dd-item').forEach(item => {
                item.addEventListener('click', async (ev) => {
                  ev.stopPropagation();
                  dropdown.remove();
                  const dd = item.dataset.dd;
                  try {
                    if (dd === 'unblock') {
                      await apiClient.unblockPuzzle(puzzleId);
                      showToast('Puzzle unblocked');
                      await renderStats();
                      await renderReports();
                    } else if (dd === 'edit') {
                      showEditFENDialog(puzzleId);
                    }
                  } catch (err) {
                    showToast(`Error: ${err.message}`, 'error');
                  }
                });
              });
            }
          } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
          }
        });
      });

      renderPagination(total);
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="5" class="error-cell">Error: ${escapeHtml(error.message)}</td></tr>`;
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

/**
 * Render the admin panel as a full-page view inside a container.
 * @param {HTMLElement} container - The DOM element to render into
 * @param {ApiClient} apiClient - API client instance
 * @returns {Function} cleanup function to call when navigating away
 */
export function renderAdminPage(container, apiClient) {
  let currentPage = 1;
  const pageSize = 20;
  let includeDismissed = false;
  const openDialogs = [];

  container.innerHTML = `
    <div class="page-panel admin-content">
      <div class="main-header main-header-row">
        <div>
          <h1 class="page-title">Reports</h1>
          <p class="page-subtitle">Manage puzzle reports and blocked puzzles</p>
        </div>
        <button id="create-puzzle-btn" class="generate-btn">+ Create Custom Puzzle</button>
      </div>

      <div class="admin-stats" id="admin-stats" style="display:flex;gap:12px;margin-bottom:16px"></div>

      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--color-gray-500);cursor:pointer">
          <input type="checkbox" id="include-dismissed" style="accent-color:var(--color-brand-600)">
          <span>Show dismissed reports</span>
        </label>
      </div>

      <div class="ep-table-wrap">
        <table class="ep-table">
          <thead>
            <tr>
              <th class="ep-th-grow">Puzzle</th>
              <th style="width:110px">Reason</th>
              <th style="width:100px">Reported</th>
              <th style="width:90px">Status</th>
              <th style="width:180px">Actions</th>
            </tr>
          </thead>
          <tbody id="reports-tbody">
            <tr><td colspan="5" class="loading-cell">Loading reports...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" id="pagination"></div>
    </div>
  `;

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

  const renderStats = async () => {
    const statsEl = container.querySelector('#admin-stats');
    try {
      const stats = await apiClient.getReportStats();

      statsEl.innerHTML = `
        <div class="gd-stat"><span class="gd-stat-label">Total Reports</span><span class="gd-stat-value">${stats.totalReports}</span></div>
        <div class="gd-stat"><span class="gd-stat-label">Pending</span><span class="gd-stat-value" style="color:var(--color-warning-500)">${stats.pendingReports}</span></div>
        <div class="gd-stat"><span class="gd-stat-label">Blocked Puzzles</span><span class="gd-stat-value" style="color:var(--color-error-600)">${stats.blockedPuzzles}</span></div>
      `;
    } catch (error) {
      statsEl.innerHTML = '<span class="error">Failed to load stats</span>';
    }
  };

  const renderReports = async () => {
    const tbody = container.querySelector('#reports-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading...</td></tr>';

    try {
      const result = await apiClient.getReports({
        page: currentPage,
        pageSize,
        includeDismissed
      });

      const { reports, total } = result;

      if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No reports found</td></tr>';
        return;
      }

      const reasonBadge = (reason) => {
        const cls = reason === 'wrong_solution' ? 'badge-advanced' : reason === 'broken_position' ? 'badge-intermediate' : 'badge-theme';
        return `<span class="badge ${cls}">${REPORT_REASON_LABELS[reason] || reason}</span>`;
      };

      const statusBadge = (dismissed) => {
        return dismissed
          ? '<span class="badge badge-beginner">Dismissed</span>'
          : '<span class="badge badge-intermediate">Pending</span>';
      };

      tbody.innerHTML = reports.map(report => `
        <tr data-report-id="${report.id}" data-puzzle-id="${escapeHtml(report.puzzle_id)}">
          <td>
            <div class="ep-cell-name"><code style="font-size:12px">${escapeHtml(report.puzzle_id)}</code></div>
            <div class="ep-cell-muted" style="font-size:12px">${report.notes ? escapeHtml(report.notes) : 'No notes'}</div>
          </td>
          <td>${reasonBadge(report.reason)}</td>
          <td><div class="ep-cell-muted" style="font-size:12px">${formatDate(report.reported_at)}</div></td>
          <td>${statusBadge(report.dismissed)}</td>
          <td>
            <div class="ep-actions">
              <button class="btn-outline btn-sm" data-action="block" title="Block">Block</button>
              <button class="btn-outline btn-sm" data-action="dismiss" title="Dismiss">Dismiss</button>
              <button class="btn-outline btn-sm ep-more-btn" data-action="more" title="More actions">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const row = btn.closest('tr');
          const reportId = parseInt(row.dataset.reportId);
          const puzzleId = row.dataset.puzzleId;
          const action = btn.dataset.action;

          try {
            if (action === 'block') {
              await apiClient.blockPuzzle(puzzleId);
              showToast('Puzzle blocked');
              await renderStats();
              await renderReports();
            } else if (action === 'dismiss') {
              await apiClient.dismissReport(reportId);
              showToast('Report dismissed');
              await renderStats();
              await renderReports();
            } else if (action === 'more') {
              document.querySelectorAll('.gd-dropdown').forEach(d => d.remove());
              const dropdown = document.createElement('div');
              dropdown.className = 'gd-dropdown';
              dropdown.innerHTML = `
                <button class="gd-dd-item" data-dd="unblock"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>Unblock Puzzle</button>
                <button class="gd-dd-item" data-dd="edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/></svg>Edit FEN</button>
              `;
              const rect = btn.getBoundingClientRect();
              dropdown.style.position = 'fixed';
              dropdown.style.top = `${rect.bottom + 4}px`;
              dropdown.style.right = `${window.innerWidth - rect.right}px`;
              document.body.appendChild(dropdown);
              const closeDd = () => { dropdown.remove(); document.removeEventListener('click', closeDd); };
              setTimeout(() => document.addEventListener('click', closeDd), 0);
              dropdown.querySelectorAll('.gd-dd-item').forEach(item => {
                item.addEventListener('click', async (ev) => {
                  ev.stopPropagation();
                  dropdown.remove();
                  const dd = item.dataset.dd;
                  try {
                    if (dd === 'unblock') {
                      await apiClient.unblockPuzzle(puzzleId);
                      showToast('Puzzle unblocked');
                      await renderStats();
                      await renderReports();
                    } else if (dd === 'edit') {
                      showEditFENDialog(puzzleId);
                    }
                  } catch (err) {
                    showToast(`Error: ${err.message}`, 'error');
                  }
                });
              });
            }
          } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
          }
        });
      });

      renderPagination(total);
    } catch (error) {
      tbody.innerHTML = `<tr><td colspan="5" class="error-cell">Error: ${escapeHtml(error.message)}</td></tr>`;
    }
  };

  const renderPagination = (total) => {
    const pagination = container.querySelector('#pagination');
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

    document.body.appendChild(dialog);
    openDialogs.push(dialog);

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

    cancelBtn.addEventListener('click', () => removeDialog(dialog));

    saveBtn.addEventListener('click', async () => {
      const newFen = fenInput.value.trim();
      if (!validateFEN(newFen)) return;

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        await apiClient.updatePuzzleFEN(puzzleId, newFen);
        showToast('FEN updated');
        removeDialog(dialog);
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    });
  };

  const removeDialog = (dialog) => {
    const idx = openDialogs.indexOf(dialog);
    if (idx !== -1) openDialogs.splice(idx, 1);
    if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
  };

  // Initialize
  container.querySelector('#include-dismissed').addEventListener('change', (e) => {
    includeDismissed = e.target.checked;
    currentPage = 1;
    renderReports();
  });

  container.querySelector('#create-puzzle-btn').addEventListener('click', () => {
    showCreatePuzzleDialog(apiClient);
  });

  renderStats();
  renderReports();

  // Return cleanup function
  return () => {
    openDialogs.forEach(d => {
      if (d.parentNode) d.parentNode.removeChild(d);
    });
    openDialogs.length = 0;
  };
}

export default showAdminPanel;
