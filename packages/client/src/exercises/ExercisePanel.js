/**
 * ExercisePanel.js
 * Main panel for managing student exercises
 */

import { showStudentDialog } from './StudentDialog.js';
import { showCreateExerciseDialog } from './CreateExerciseDialog.js';
import { showGradeDialog } from './GradeDialog.js';
import { openPrintPreview, openPrintSolutions } from './PrintPreview.js';
import { openPuzzlePlayer } from './PuzzlePlayer.js';
import { openExercisePuzzleViewer } from './ExercisePuzzleViewer.js';
import { showAppConfirm, showAppPrompt } from '../shared/app-dialogs.js';

const SKILL_LEVEL_LABELS = {
  'beginner': 'Beginner',
  'intermediate': 'Intermediate',
  'advanced': 'Advanced'
};

const STATUS_LABELS = {
  'assigned': 'Assigned',
  'submitted': 'Submitted',
  'graded': 'Graded'
};

/**
 * Show the exercise management panel
 * @param {ApiClient} apiClient - API client instance
 * @param {Function} getCurrentPuzzles - Function to get current generated puzzles
 */
export function showExercisePanel(apiClient, getCurrentPuzzles, onPuzzlesUpdated = () => {}) {
  let activeTab = 'exercises';

  const overlay = document.createElement('div');
  overlay.className = 'admin-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'exercise-panel-title');

  overlay.innerHTML = `
    <div class="admin-content exercise-panel">
      <button class="admin-close" aria-label="Close panel">&times;</button>

      <header class="admin-header">
        <h2 id="exercise-panel-title">Student Exercises</h2>
        <div class="admin-stats" id="panel-stats">
          Loading...
        </div>
      </header>

      <div class="panel-tabs">
        <button class="tab-btn active" data-tab="exercises">Weekly Exercises</button>
        <button class="tab-btn" data-tab="students">Students</button>
        <button class="tab-btn" data-tab="performance">Performance</button>
      </div>

      <div class="tab-content" id="tab-content">
        <div class="loading-cell">Loading...</div>
      </div>
    </div>
  `;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') closePanel();
  };

  const closePanel = () => {
    document.removeEventListener('keydown', handleKeyDown);
    if (overlay.parentNode) document.body.removeChild(overlay);
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

  const renderStats = async () => {
    const statsEl = overlay.querySelector('#panel-stats');
    try {
      const [students, exercises] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getExercises()
      ]);

      statsEl.innerHTML = `
        <div class="stat-item">
          <span class="stat-value">${students.length}</span>
          <span class="stat-label">Students</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${exercises.length}</span>
          <span class="stat-label">Exercises</span>
        </div>
      `;
    } catch (error) {
      statsEl.innerHTML = '<span class="error">Failed to load stats</span>';
    }
  };

  // ==================== Exercises Tab ====================

  const renderExercisesTab = async () => {
    const content = overlay.querySelector('#tab-content');
    content.innerHTML = '<div class="loading-cell">Loading exercises...</div>';

    try {
      const [exercises, currentWeek] = await Promise.all([
        apiClient.getExercises(),
        apiClient.getCurrentWeek()
      ]);

      content.innerHTML = `
        <div class="exercises-header">
          <div class="current-week-info">
            <strong>Current Week:</strong> ${escapeHtml(currentWeek.week_label)}
            ${currentWeek.has_exercise ?
              '<span class="badge badge-success">Has Exercise</span>' :
              '<span class="badge badge-warning">No Exercise</span>'}
          </div>
          <button id="create-exercise-btn" class="action-btn primary-btn">
            + Create Exercise
          </button>
        </div>

        <div class="exercises-list">
          ${exercises.length === 0 ?
            '<div class="empty-message">No exercises created yet</div>' :
            exercises.map(ex => `
              <div class="exercise-card" data-id="${escapeHtml(ex.id)}">
                <div class="exercise-header">
                  <h4>${escapeHtml(ex.name || ex.week_label)}</h4>
                  <span class="week-label">${escapeHtml(ex.week_label)}</span>
                </div>
                <div class="exercise-meta">
                  <span>${ex.puzzle_count} puzzles</span>
                  <span>${ex.total_assigned} assigned</span>
                  <span>${ex.total_graded} graded</span>
                </div>
                <div class="exercise-actions">
                  <button class="action-btn" data-action="play" title="Play Puzzles">▶️</button>
                  <button class="action-btn" data-action="view" title="View">👁️</button>
                  <button class="action-btn" data-action="print" title="Print Preview">🖨️</button>
                  <button class="action-btn" data-action="print-solutions" title="Print Solutions">📋</button>
                  <button class="action-btn" data-action="assign" title="Assign">📝</button>
                  <button class="action-btn" data-action="delete" title="Delete">🗑️</button>
                </div>
              </div>
            `).join('')}
        </div>
      `;

      // Create exercise button
      content.querySelector('#create-exercise-btn').addEventListener('click', async () => {
        const puzzles = getCurrentPuzzles();
        const result = await showCreateExerciseDialog(apiClient, puzzles || [], onPuzzlesUpdated);
        if (result) {
          showToast('Exercise created successfully');
          renderExercisesTab();
          renderStats();
        }
      });

      // Exercise actions
      content.querySelectorAll('.exercise-card .action-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const card = e.target.closest('.exercise-card');
          const exerciseId = card.dataset.id;
          const action = e.target.dataset.action;

          try {
            switch (action) {
              case 'play':
                const playData = await apiClient.getExercise(exerciseId);
                openPuzzlePlayer(playData);
                break;
              case 'view':
                await showExerciseDetails(exerciseId);
                break;
              case 'print':
                const exerciseData = await apiClient.getExercise(exerciseId);
                openPrintPreview(exerciseData);
                break;
              case 'print-solutions':
                const solutionsData = await apiClient.getExercise(exerciseId);
                openPrintSolutions(solutionsData);
                break;
              case 'assign':
                await showAssignDialog(exerciseId);
                break;
              case 'delete': {
                const confirmed = await showAppConfirm({
                  title: 'Delete Exercise?',
                  message: 'This will permanently delete this exercise and all student assignments.',
                  confirmLabel: 'Delete', confirmColor: 'var(--color-error-500)', icon: 'delete'
                });
                if (confirmed) {
                  await apiClient.deleteExercise(exerciseId);
                  showToast('Exercise deleted');
                  renderExercisesTab();
                  renderStats();
                }
              }
                break;
            }
          } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
          }
        });
      });
    } catch (error) {
      content.innerHTML = `<div class="error-cell">Error: ${escapeHtml(error.message)}</div>`;
    }
  };

  const showExerciseDetails = async (exerciseId) => {
    const dialog = document.createElement('div');
    dialog.className = 'exercise-details-dialog';
    dialog.innerHTML = `
      <div class="dialog-content large-dialog">
        <button class="dialog-close">&times;</button>
        <div class="dialog-body">Loading...</div>
      </div>
    `;

    overlay.appendChild(dialog);
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.remove());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.remove();
    });

    try {
      const [exercise, assignments] = await Promise.all([
        apiClient.getExercise(exerciseId),
        apiClient.getExerciseAssignments(exerciseId)
      ]);

      dialog.querySelector('.dialog-body').innerHTML = `
        <h3>${escapeHtml(exercise.name || exercise.week_label)}</h3>
        <div class="exercise-info">
          <p><strong>Week:</strong> ${escapeHtml(exercise.week_label)}</p>
          <p><strong>Puzzles:</strong> ${exercise.puzzles?.length || 0}</p>
        </div>

        <div class="assignments-header">
          <h4>Student Assignments</h4>
          ${assignments.length > 1 ? `
            <button id="grade-all-btn" class="action-btn primary-btn" title="Grade all students at once">
              ▶️ Grade All Students
            </button>
          ` : ''}
        </div>
        ${assignments.length === 0 ?
          '<p class="empty-message">No students assigned yet</p>' :
          `<table class="assignments-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Skill</th>
                <th>Status</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${assignments.map(a => `
                <tr data-id="${escapeHtml(a.id)}">
                  <td>${escapeHtml(a.student_name)}</td>
                  <td>${SKILL_LEVEL_LABELS[a.skill_level] || a.skill_level}</td>
                  <td>
                    <span class="status-badge status-${a.status}">${STATUS_LABELS[a.status]}</span>
                    ${a.is_final ? '<span class="status-badge status-final">Final</span>' : ''}
                  </td>
                  <td>${a.score != null ? `${a.score}/${a.total_puzzles}` : '-'}</td>
                  <td>
                    <button class="action-btn grade-puzzles-btn" data-id="${escapeHtml(a.id)}" title="Grade with Puzzles">▶️</button>
                    <button class="action-btn grade-btn" data-id="${escapeHtml(a.id)}" title="Quick Grade">📝</button>
                    ${a.answer_pdf_path ?
                      `<button class="action-btn download-btn" data-id="${escapeHtml(a.id)}" title="Download Answer">📥</button>` :
                      ''}
                    <button class="action-btn mark-final-btn ${a.is_final ? 'btn-disabled' : ''}" data-id="${escapeHtml(a.id)}" title="${a.is_final ? 'Already Final' : 'Mark as Final'}" ${a.is_final ? 'disabled' : ''}>🔒</button>
                    <button class="action-btn reset-score-btn" data-id="${escapeHtml(a.id)}" title="Reset Score">🔄</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        }
      `;

      // Grade all students button handler
      const gradeAllBtn = dialog.querySelector('#grade-all-btn');
      if (gradeAllBtn) {
        gradeAllBtn.addEventListener('click', () => {
          openPuzzlePlayer(exercise, {
            gradingMode: true,
            assignments,
            apiClient,
            onGraded: () => {
              showToast('All grades saved successfully');
              dialog.remove();
              showExerciseDetails(exerciseId);
            }
          });
        });
      }

      // Grade with puzzles button handlers (single student)
      dialog.querySelectorAll('.grade-puzzles-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const studentExerciseId = btn.dataset.id;
          const assignment = assignments.find(a => a.id === studentExerciseId);

          openPuzzlePlayer(exercise, {
            gradingMode: true,
            assignments: [assignment],
            apiClient,
            onGraded: () => {
              showToast('Graded successfully');
              dialog.remove();
              showExerciseDetails(exerciseId);
            }
          });
        });
      });

      // Quick grade button handlers
      dialog.querySelectorAll('.grade-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const studentExerciseId = btn.dataset.id;
          const assignment = assignments.find(a => a.id === studentExerciseId);
          const result = await showGradeDialog(apiClient, assignment);
          if (result) {
            showToast('Graded successfully');
            dialog.remove();
            await showExerciseDetails(exerciseId);
          }
        });
      });

      // Download button handlers
      dialog.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const studentExerciseId = btn.dataset.id;
          window.open(apiClient.getAnswerPdfUrl(studentExerciseId), '_blank');
        });
      });

      // Mark final button handlers
      dialog.querySelectorAll('.mark-final-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', async () => {
          const studentExerciseId = btn.dataset.id;
          const assignment = assignments.find(a => a.id === studentExerciseId);

          const markConfirmed = await showAppConfirm({
            title: 'Mark as Final?',
            message: `${assignment.student_name} will no longer be able to solve or modify this exercise.`,
            confirmLabel: 'Mark Final', confirmColor: 'var(--color-warning-500)', icon: 'lock'
          });
          if (!markConfirmed) return;

          try {
            await apiClient.markStudentExerciseAsFinal(studentExerciseId);
            showToast('Marked as final');
            dialog.remove();
            await showExerciseDetails(exerciseId);
          } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
          }
        });
      });

      // Reset score button handlers
      dialog.querySelectorAll('.reset-score-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const studentExerciseId = btn.dataset.id;
          const assignment = assignments.find(a => a.id === studentExerciseId);

          const resetConfirmed = await showAppConfirm({
            title: 'Reset Score?',
            message: `This will clear ${assignment.student_name}'s score, puzzle results, and hint usage.`,
            confirmLabel: 'Reset Score', confirmColor: 'var(--color-error-500)', icon: 'reset'
          });
          if (!resetConfirmed) return;

          try {
            await apiClient.resetStudentExerciseScore(studentExerciseId);
            showToast('Score reset to 0');
            dialog.remove();
            await showExerciseDetails(exerciseId);
          } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
          }
        });
      });
    } catch (error) {
      dialog.querySelector('.dialog-body').innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
    }
  };

  const showAssignDialog = async (exerciseId) => {
    const dialog = document.createElement('div');
    dialog.className = 'assign-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <button class="dialog-close">&times;</button>
        <h3>Assign Exercise to Students</h3>
        <div class="dialog-body">Loading students...</div>
      </div>
    `;

    overlay.appendChild(dialog);
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.remove());

    try {
      const students = await apiClient.getStudents();

      if (students.length === 0) {
        dialog.querySelector('.dialog-body').innerHTML = `
          <p class="empty-message">No students found. Create a student first.</p>
          <button id="create-student-from-assign" class="action-btn primary-btn">+ Add Student</button>
        `;
        dialog.querySelector('#create-student-from-assign').addEventListener('click', async () => {
          dialog.remove();
          const result = await showStudentDialog(apiClient);
          if (result) {
            showToast('Student created');
            renderStats();
            await showAssignDialog(exerciseId);
          }
        });
        return;
      }

      dialog.querySelector('.dialog-body').innerHTML = `
        <div class="student-select-list">
          ${students.map(s => `
            <label class="student-checkbox">
              <input type="checkbox" value="${escapeHtml(s.id)}">
              <span>${escapeHtml(s.name)} (${SKILL_LEVEL_LABELS[s.skill_level]})</span>
            </label>
          `).join('')}
        </div>
        <div class="dialog-actions">
          <button class="cancel-btn">Cancel</button>
          <button class="assign-btn primary-btn">Assign</button>
        </div>
      `;

      dialog.querySelector('.cancel-btn').addEventListener('click', () => dialog.remove());

      dialog.querySelector('.assign-btn').addEventListener('click', async () => {
        const selected = Array.from(dialog.querySelectorAll('input:checked')).map(i => i.value);

        if (selected.length === 0) {
          showToast('Select at least one student', 'error');
          return;
        }

        try {
          const result = await apiClient.assignExercise(exerciseId, selected);

          if (result.errors && result.errors.length > 0) {
            showToast(`Assigned with warnings: ${result.errors[0]}`, 'error');
          } else {
            showToast(`Assigned to ${result.assigned.length} student(s)`);
          }

          dialog.remove();
          renderExercisesTab();
        } catch (error) {
          showToast(`Error: ${error.message}`, 'error');
        }
      });
    } catch (error) {
      dialog.querySelector('.dialog-body').innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
    }
  };

  // ==================== Students Tab ====================

  const renderStudentsTab = async () => {
    const content = overlay.querySelector('#tab-content');
    content.innerHTML = '<div class="loading-cell">Loading students...</div>';

    try {
      const students = await apiClient.getStudents();

      const skillBadgeFn = (level) => {
        const cls = level === 'advanced' ? 'badge-advanced' : level === 'intermediate' ? 'badge-intermediate' : 'badge-beginner';
        return `<span class="badge ${cls}">${SKILL_LEVEL_LABELS[level] || level}</span>`;
      };

      content.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
          <button id="add-student-btn" class="generate-btn" style="font-size:13px;padding:8px 16px">+ Add Student</button>
        </div>
        ${students.length === 0 ?
          '<div class="empty-message">No students yet. Click "+ Add Student" to get started.</div>' :
          `<div class="ep-table-wrap">
            <table class="ep-table">
              <thead>
                <tr>
                  <th class="ep-th-grow">Student</th>
                  <th style="width:100px">Skill</th>
                  <th style="width:180px">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${students.map(s => `
                  <tr data-id="${escapeHtml(s.id)}">
                    <td>
                      <div class="ep-cell-name">${escapeHtml(s.name)}</div>
                      <div class="ep-cell-muted" style="font-size:12px">${s.email ? escapeHtml(s.email) : 'No email'}</div>
                    </td>
                    <td>${skillBadgeFn(s.skill_level)}</td>
                    <td>
                      <div class="ep-actions">
                        <button class="btn-outline btn-sm" data-action="edit">Edit</button>
                        <button class="btn-outline btn-sm" data-action="performance">Stats</button>
                        <button class="btn-outline btn-sm ep-more-btn" data-action="more" title="More actions">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`
        }
      `;

      content.querySelector('#add-student-btn').addEventListener('click', async () => {
        const result = await showStudentDialog(apiClient);
        if (result) {
          showToast('Student created');
          renderStudentsTab();
          renderStats();
        }
      });

      content.querySelectorAll('.ep-table tbody tr').forEach(row => {
        row.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const studentId = row.dataset.id;
            const action = btn.dataset.action;

            try {
              if (action === 'edit') {
                const student = await apiClient.getStudent(studentId);
                const result = await showStudentDialog(apiClient, student);
                if (result) {
                  showToast('Student updated');
                  renderStudentsTab();
                }
              } else if (action === 'performance') {
                await showStudentPerformance(studentId);
              } else if (action === 'more') {
                // Remove existing dropdowns
                document.querySelectorAll('.gd-dropdown').forEach(d => d.remove());
                const dropdown = document.createElement('div');
                dropdown.className = 'gd-dropdown';
                dropdown.innerHTML = `
                  <button class="gd-dd-item gd-dd-danger" data-dd="delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>Delete Student</button>
                `;
                const rect = btn.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = `${rect.bottom + 4}px`;
                dropdown.style.right = `${window.innerWidth - rect.right}px`;
                document.body.appendChild(dropdown);
                const closeDd = () => { dropdown.remove(); document.removeEventListener('click', closeDd); };
                setTimeout(() => document.addEventListener('click', closeDd), 0);
                dropdown.querySelector('[data-dd="delete"]').addEventListener('click', async (ev) => {
                  ev.stopPropagation();
                  dropdown.remove();
                  showConfirmDialog({
                    icon: 'rotate-ccw', iconColor: 'var(--color-error-500)', iconBg: 'var(--color-error-50)',
                    title: 'Delete Student?',
                    message: 'This will permanently delete this student and all their exercise assignments.',
                    confirmLabel: 'Delete', confirmColor: 'var(--color-error-500)',
                    onConfirm: async () => {
                      await apiClient.deleteStudent(studentId);
                      showToast('Student deleted');
                      renderStudentsTab();
                      renderStats();
                    }
                  });
                });
              }
            } catch (error) {
              showToast(`Error: ${error.message}`, 'error');
            }
          });
        });
      });
    } catch (error) {
      content.innerHTML = `<div class="error-cell">Error: ${escapeHtml(error.message)}</div>`;
    }
  };

  const showStudentPerformance = async (studentId) => {
    const dialog = document.createElement('div');
    dialog.className = 'performance-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <button class="dialog-close">&times;</button>
        <div class="dialog-body">Loading...</div>
      </div>
    `;

    overlay.appendChild(dialog);
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.remove());

    try {
      const data = await apiClient.getStudentPerformance(studentId);

      dialog.querySelector('.dialog-body').innerHTML = `
        <h3>Performance: ${escapeHtml(data.student.name)}</h3>

        <div class="performance-summary">
          <div class="stat-card">
            <span class="stat-value">${data.performance.total_exercises}</span>
            <span class="stat-label">Exercises Completed</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${data.performance.average_score !== null ? data.performance.average_score + '%' : '-'}</span>
            <span class="stat-label">Average Score</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${data.performance.total_puzzles_solved}/${data.performance.total_puzzles}</span>
            <span class="stat-label">Puzzles Correct</span>
          </div>
        </div>

        <h4>History</h4>
        ${data.performance.history.length === 0 ?
          '<p class="empty-message">No graded exercises yet</p>' :
          `<table class="history-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Score</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${data.performance.history.map(h => `
                <tr>
                  <td>${escapeHtml(h.week)}</td>
                  <td>${h.score}/${h.total}</td>
                  <td>
                    <span class="score-bar" style="width: ${h.percentage}%">${h.percentage}%</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        }
      `;
    } catch (error) {
      dialog.querySelector('.dialog-body').innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
    }
  };

  // ==================== Performance Tab ====================

  const renderPerformanceTab = async () => {
    const content = overlay.querySelector('#tab-content');
    content.innerHTML = '<div class="loading-cell">Loading performance data...</div>';

    try {
      const students = await apiClient.getStudents();

      if (students.length === 0) {
        content.innerHTML = '<div class="empty-message">No students yet. Add students first.</div>';
        return;
      }

      const performanceData = await Promise.all(
        students.map(s => apiClient.getStudentPerformance(s.id))
      );

      content.innerHTML = `
        <div class="performance-overview">
          <table class="performance-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Skill Level</th>
                <th>Exercises</th>
                <th>Avg Score</th>
                <th>Total Correct</th>
              </tr>
            </thead>
            <tbody>
              ${performanceData.map(data => `
                <tr>
                  <td>${escapeHtml(data.student.name)}</td>
                  <td>${SKILL_LEVEL_LABELS[data.student.skill_level]}</td>
                  <td>${data.performance.total_exercises}</td>
                  <td>${data.performance.average_score !== null ? data.performance.average_score + '%' : '-'}</td>
                  <td>${data.performance.total_puzzles_solved}/${data.performance.total_puzzles}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      content.innerHTML = `<div class="error-cell">Error: ${escapeHtml(error.message)}</div>`;
    }
  };

  // ==================== Tab Switching ====================

  const renderTab = () => {
    switch (activeTab) {
      case 'exercises':
        renderExercisesTab();
        break;
      case 'performance':
        renderPerformanceTab();
        break;
    }
  };

  // ==================== Initialize ====================

  document.body.appendChild(overlay);
  document.addEventListener('keydown', handleKeyDown);

  overlay.querySelector('.admin-close').addEventListener('click', closePanel);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePanel();
  });

  overlay.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      renderTab();
    });
  });

  renderStats();
  renderTab();
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Render the exercise panel as a full-page view inside a container.
 * @param {HTMLElement} container - The DOM element to render into
 * @param {ApiClient} apiClient - API client instance
 * @param {Function} getCurrentPuzzles - Function to get current generated puzzles
 * @returns {Function} cleanup function to call when navigating away
 */
export function renderExercisePage(container, apiClient, getCurrentPuzzles, onPuzzlesUpdated = () => {}) {
  let activeTab = 'exercises';
  const openDialogs = [];

  container.innerHTML = `
    <div class="page-panel exercise-panel">
      <div class="main-header main-header-row">
        <div>
          <h1 class="page-title">Exercise Management</h1>
          <p class="page-subtitle">Create and manage weekly chess exercises</p>
        </div>
        <button id="page-create-btn" class="generate-btn">+ Create Exercise</button>
      </div>

      <div class="ep-tabs" id="ep-tabs">
        <button class="ep-tab ep-tab-active" data-tab="exercises">Weekly Exercises</button>
        <button class="ep-tab" data-tab="performance">Performance</button>
      </div>

      <div class="tab-content" id="tab-content">
        <div class="loading-cell">Loading...</div>
      </div>
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
    const statsEl = container.querySelector('#panel-stats');
    try {
      const [students, exercises] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getExercises()
      ]);

      statsEl.innerHTML = `
        <div class="stat-item">
          <span class="stat-value">${students.length}</span>
          <span class="stat-label">Students</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${exercises.length}</span>
          <span class="stat-label">Exercises</span>
        </div>
      `;
    } catch (error) {
      statsEl.innerHTML = '<span class="error">Failed to load stats</span>';
    }
  };

  // ==================== Exercises Tab ====================

  const renderExercisesTab = async () => {
    const content = container.querySelector('#tab-content');
    content.innerHTML = '<div class="loading-cell">Loading exercises...</div>';

    try {
      const [exercises, currentWeek] = await Promise.all([
        apiClient.getExercises(),
        apiClient.getCurrentWeek()
      ]);

      const gradedFraction = (ex) => ex.total_assigned > 0 ? `${ex.total_graded}/${ex.total_assigned}` : '—';

      const exerciseStatus = (ex) => {
        if (ex.total_assigned === 0) return '<span class="badge badge-theme" style="font-size:11px">No Students</span>';
        if (ex.total_graded === ex.total_assigned) return '<span class="badge badge-beginner" style="font-size:11px">Complete</span>';
        if (ex.total_graded > 0) return '<span class="badge badge-intermediate" style="font-size:11px">In Progress</span>';
        return '<span class="badge badge-advanced" style="font-size:11px">Pending</span>';
      };

      content.innerHTML = `
        <div class="ep-week-banner">
          <span>Current Week: ${escapeHtml(currentWeek.week_label)}</span>
          <span class="badge ${currentWeek.has_exercise ? 'badge-beginner' : 'badge-intermediate'}">${currentWeek.has_exercise ? 'Has Exercise' : 'No Exercise'}</span>
        </div>

        ${exercises.length === 0 ?
          '<div class="empty-message">No exercises created yet</div>' :
          `<div class="ep-table-wrap">
            <table class="ep-table">
              <thead>
                <tr>
                  <th class="ep-th-grow">Exercise</th>
                  <th style="width:90px">Status</th>
                  <th style="width:70px">Puzzles</th>
                  <th style="width:80px">Assigned</th>
                  <th style="width:70px">Graded</th>
                  <th style="width:240px">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${exercises.map(ex => `
                  <tr data-id="${escapeHtml(ex.id)}">
                    <td>
                      <div class="ep-cell-name">${escapeHtml(ex.name || ex.week_label)}</div>
                      <div class="ep-cell-muted" style="font-size:12px">${escapeHtml(ex.week_label)}</div>
                    </td>
                    <td>${exerciseStatus(ex)}</td>
                    <td>${ex.puzzle_count}</td>
                    <td>${ex.total_assigned}</td>
                    <td class="ep-cell-graded">${gradedFraction(ex)}</td>
                    <td>
                      <div class="ep-actions">
                        <button class="btn-outline btn-sm" data-action="play">Play</button>
                        <button class="btn-outline btn-sm" data-action="grade">Grade</button>
                        <button class="btn-outline btn-sm" data-action="assign">Assign</button>
                        <button class="btn-outline btn-sm ep-more-btn" data-action="more" title="More actions">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`
        }
      `;

      // Exercise row actions
      content.querySelectorAll('.ep-table tbody tr').forEach(row => {
        row.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const exerciseId = row.dataset.id;
            const action = btn.dataset.action;

            try {
              switch (action) {
                case 'play': {
                  const data = await apiClient.getExercise(exerciseId);
                  openExercisePuzzleViewer(data);
                  break;
                }
                case 'grade': {
                  await showExerciseDetails(exerciseId);
                  break;
                }
                case 'assign': {
                  await showAssignDialog(exerciseId);
                  break;
                }
                case 'more': {
                  // Remove any existing dropdown
                  content.querySelectorAll('.gd-dropdown').forEach(d => d.remove());
                  const dropdown = document.createElement('div');
                  dropdown.className = 'gd-dropdown';
                  dropdown.innerHTML = `
                    <button class="gd-dd-item" data-dd="rename"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/></svg>Rename</button>
                    <button class="gd-dd-item" data-dd="print"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>Print Preview</button>
                    <button class="gd-dd-item" data-dd="print-solutions"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Print Solutions</button>
                    <div class="gd-dd-sep"></div>
                    <button class="gd-dd-item gd-dd-danger" data-dd="delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>Delete Exercise</button>
                  `;
                  // Position dropdown using fixed positioning to escape table layout
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
                        if (dd === 'rename') {
                          const currentName = row.querySelector('.ep-cell-name')?.textContent || '';
                          const newName = await showAppPrompt({ title: 'Rename Exercise', defaultValue: currentName, placeholder: 'Exercise name' });
                          if (newName && newName !== currentName) {
                            await apiClient.updateExercise(exerciseId, newName);
                            showToast('Exercise renamed');
                            renderExercisesTab();
                          }
                        } else if (dd === 'print') {
                          const data = await apiClient.getExercise(exerciseId);
                          openPrintPreview(data);
                        } else if (dd === 'print-solutions') {
                          const data = await apiClient.getExercise(exerciseId);
                          openPrintSolutions(data);
                        } else if (dd === 'delete') {
                          showConfirmDialog({
                            icon: 'rotate-ccw', iconColor: 'var(--color-error-500)', iconBg: 'var(--color-error-50)',
                            title: 'Delete Exercise?',
                            message: 'This will permanently delete this exercise and all student assignments. This cannot be undone.',
                            confirmLabel: 'Delete', confirmColor: 'var(--color-error-500)',
                            onConfirm: async () => {
                              await apiClient.deleteExercise(exerciseId);
                              showToast('Exercise deleted');
                              renderExercisesTab();
                            }
                          });
                        }
                      } catch (error) {
                        showToast(`Error: ${error.message}`, 'error');
                      }
                    });
                  });
                  break;
                }
              }
            } catch (error) {
              showToast(`Error: ${error.message}`, 'error');
            }
          });
        });
      });
    } catch (error) {
      content.innerHTML = `<div class="error-cell">Error: ${escapeHtml(error.message)}</div>`;
    }
  };

  const showExerciseDetails = async (exerciseId) => {
    const overlay = document.createElement('div');
    overlay.className = 'pv-overlay';
    document.body.style.overflow = 'hidden';

    overlay.innerHTML = '<div class="gd-dialog"><div class="gd-loading">Loading...</div></div>';
    document.body.appendChild(overlay);
    openDialogs.push(overlay);

    const closeDialog = () => {
      document.body.style.overflow = '';
      removeDialog(overlay);
    };

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });

    try {
      const [exercise, assignments] = await Promise.all([
        apiClient.getExercise(exerciseId),
        apiClient.getExerciseAssignments(exerciseId)
      ]);

      const totalStudents = assignments.length;
      const gradedCount = assignments.filter(a => a.status === 'graded').length;
      const submittedCount = assignments.filter(a => a.status === 'submitted').length;
      const avgScore = gradedCount > 0
        ? Math.round(assignments.filter(a => a.score != null).reduce((sum, a) => sum + (a.score / a.total_puzzles) * 100, 0) / gradedCount)
        : 0;

      const skillBadge = (level) => {
        const cls = level === 'advanced' ? 'badge-advanced' : level === 'intermediate' ? 'badge-intermediate' : 'badge-beginner';
        return `<span class="badge ${cls}">${SKILL_LEVEL_LABELS[level] || level}</span>`;
      };

      const statusBadge = (status) => {
        const cls = status === 'graded' ? 'badge-beginner' : status === 'submitted' ? 'badge-intermediate' : 'badge-theme';
        return `<span class="badge ${cls}">${STATUS_LABELS[status] || status}</span>`;
      };

      const renderRow = (a) => {
        const isGraded = a.status === 'graded';
        const isSubmitted = a.status === 'submitted';
        const borderStyle = isGraded ? 'border-color: var(--color-success-500);' : '';

        const primaryBtn = isGraded
          ? `<button class="btn-outline btn-sm" data-action="edit" data-id="${escapeHtml(a.id)}">Edit</button>`
          : isSubmitted
            ? `<button class="generate-btn btn-sm" data-action="grade-puzzles" data-id="${escapeHtml(a.id)}">Grade</button>`
            : `<button class="btn-outline btn-sm" data-action="quick-grade" data-id="${escapeHtml(a.id)}">Quick Grade</button>`;

        const metaInfo = isGraded
          ? `${statusBadge(a.status)} <span style="font-size:13px;font-weight:600;color:var(--color-success-600)">${a.score}/${a.total_puzzles}</span>`
          : isSubmitted
            ? `${statusBadge(a.status)} <span style="font-size:12px;color:var(--color-gray-400);font-style:italic">Awaiting grade</span>`
            : `${statusBadge(a.status)} <span style="font-size:12px;color:var(--color-gray-400);font-style:italic">Not submitted</span>`;

        return `
          <div class="gd-row" style="${borderStyle}" data-student-id="${escapeHtml(a.id)}">
            <div class="gd-row-left">
              <div class="gd-row-top">${escapeHtml(a.student_name)} ${skillBadge(a.skill_level)}</div>
              <div class="gd-row-meta">${metaInfo}</div>
            </div>
            <div class="gd-row-actions">
              ${primaryBtn}
              <button class="gd-more-btn btn-outline btn-sm" data-id="${escapeHtml(a.id)}" style="padding:6px 8px !important;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </button>
            </div>
          </div>
        `;
      };

      overlay.querySelector('.gd-dialog').innerHTML = `
        <div class="gd-header">
          <span class="gd-title">Grade: ${escapeHtml(exercise.name || exercise.week_label)}</span>
          <button class="pv-close-btn" data-action="close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="gd-body">
          <div class="gd-stats">
            <div class="gd-stat"><span class="gd-stat-label">Students</span><span class="gd-stat-value">${totalStudents}</span></div>
            <div class="gd-stat"><span class="gd-stat-label">Graded</span><span class="gd-stat-value" style="color:var(--color-success-600)">${gradedCount}/${totalStudents}</span></div>
            <div class="gd-stat"><span class="gd-stat-label">Avg Score</span><span class="gd-stat-value" style="color:var(--color-brand-600)">${avgScore}%</span></div>
          </div>
          <div class="gd-list">
            ${assignments.length === 0 ? '<p style="text-align:center;color:var(--color-gray-400)">No students assigned yet</p>' : assignments.map(renderRow).join('')}
          </div>
        </div>
        <div class="gd-footer">
          <button class="btn-outline" data-action="close">Close</button>
          ${submittedCount > 0 ? `<button class="generate-btn" data-action="grade-all">Grade All Submitted</button>` : ''}
        </div>
      `;

      // Close
      overlay.querySelectorAll('[data-action="close"]').forEach(btn => {
        btn.addEventListener('click', closeDialog);
      });

      // Grade with puzzles
      overlay.querySelectorAll('[data-action="grade-puzzles"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const a = assignments.find(x => x.id === btn.dataset.id);
          openPuzzlePlayer(exercise, {
            gradingMode: true, assignments: [a], apiClient,
            onGraded: () => { showToast('Graded successfully'); closeDialog(); showExerciseDetails(exerciseId); }
          });
        });
      });

      // Edit / Quick grade
      overlay.querySelectorAll('[data-action="edit"], [data-action="quick-grade"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const a = assignments.find(x => x.id === btn.dataset.id);
          const result = await showGradeDialog(apiClient, a);
          if (result) { showToast('Saved'); closeDialog(); showExerciseDetails(exerciseId); }
        });
      });

      // Grade all submitted
      const gradeAllBtn = overlay.querySelector('[data-action="grade-all"]');
      if (gradeAllBtn) {
        gradeAllBtn.addEventListener('click', () => {
          const submitted = assignments.filter(a => a.status === 'submitted');
          openPuzzlePlayer(exercise, {
            gradingMode: true, assignments: submitted, apiClient,
            onGraded: () => { showToast('All grades saved'); closeDialog(); showExerciseDetails(exerciseId); }
          });
        });
      }

      // "..." dropdown menus
      overlay.querySelectorAll('.gd-more-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          // Remove any existing dropdown
          overlay.querySelectorAll('.gd-dropdown').forEach(d => d.remove());

          const a = assignments.find(x => x.id === btn.dataset.id);
          const dropdown = document.createElement('div');
          dropdown.className = 'gd-dropdown';
          dropdown.innerHTML = `
            <button class="gd-dd-item" data-dd="view"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>View Puzzles</button>
            <button class="gd-dd-item" data-dd="grade-puzzles"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Grade Puzzles</button>
            <button class="gd-dd-item" data-dd="quick-grade"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/></svg>Quick Grade</button>
            <div class="gd-dd-sep"></div>
            ${!a.is_final ? `<button class="gd-dd-item" data-dd="mark-final"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>Mark as Final</button>` : ''}
            <button class="gd-dd-item gd-dd-danger" data-dd="reset"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>Reset Score</button>
          `;

          // Position dropdown using fixed positioning to escape overflow clipping
          const rect = btn.getBoundingClientRect();
          dropdown.style.position = 'fixed';
          dropdown.style.top = `${rect.bottom + 4}px`;
          dropdown.style.right = `${window.innerWidth - rect.right}px`;
          overlay.appendChild(dropdown);

          // Close dropdown on outside click
          const closeDropdown = () => { dropdown.remove(); document.removeEventListener('click', closeDropdown); };
          setTimeout(() => document.addEventListener('click', closeDropdown), 0);

          dropdown.querySelectorAll('.gd-dd-item').forEach(item => {
            item.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              dropdown.remove();
              const action = item.dataset.dd;

              if (action === 'view') {
                openExercisePuzzleViewer(exercise);
              } else if (action === 'grade-puzzles') {
                openExercisePuzzleViewer(exercise, {
                  gradingMode: true, assignment: a, apiClient,
                  onGraded: () => { showToast('Graded successfully'); closeDialog(); showExerciseDetails(exerciseId); }
                });
              } else if (action === 'quick-grade') {
                const result = await showGradeDialog(apiClient, a);
                if (result) { showToast('Saved'); closeDialog(); showExerciseDetails(exerciseId); }
              } else if (action === 'mark-final') {
                showConfirmDialog({
                  icon: 'lock', iconColor: 'var(--color-warning-500)', iconBg: 'var(--color-warning-50)',
                  title: 'Mark as Final?',
                  message: `${a.student_name} will no longer be able to solve or modify this exercise. This action cannot be undone.`,
                  confirmLabel: 'Mark Final', confirmColor: 'var(--color-warning-500)',
                  onConfirm: async () => {
                    await apiClient.markStudentExerciseAsFinal(a.id);
                    showToast('Marked as final'); closeDialog(); showExerciseDetails(exerciseId);
                  }
                });
              } else if (action === 'reset') {
                showConfirmDialog({
                  icon: 'rotate-ccw', iconColor: 'var(--color-error-500)', iconBg: 'var(--color-error-50)',
                  title: 'Reset Score?',
                  message: `This will clear ${a.student_name}'s score, puzzle results, and hint usage. The exercise will return to assigned status.`,
                  confirmLabel: 'Reset Score', confirmColor: 'var(--color-error-500)',
                  onConfirm: async () => {
                    await apiClient.resetStudentExerciseScore(a.id);
                    showToast('Score reset'); closeDialog(); showExerciseDetails(exerciseId);
                  }
                });
              }
            });
          });
        });
      });
    } catch (error) {
      overlay.querySelector('.gd-dialog').innerHTML = `<div style="padding:40px;text-align:center;color:var(--color-error-500)">${escapeHtml(error.message)}</div>`;
    }
  };

  const showConfirmDialog = ({ icon, iconColor, iconBg, title, message, confirmLabel, confirmColor, onConfirm }) => {
    const overlay = document.createElement('div');
    overlay.className = 'pv-overlay';
    overlay.style.zIndex = '60000';
    overlay.innerHTML = `
      <div class="gd-confirm">
        <div class="gd-confirm-icon" style="background:${iconBg}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${icon === 'lock' ? '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>' : '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>'}
          </svg>
        </div>
        <h3 class="gd-confirm-title">${escapeHtml(title)}</h3>
        <p class="gd-confirm-msg">${escapeHtml(message)}</p>
        <div class="gd-confirm-btns">
          <button class="btn-outline" data-action="cancel" style="flex:1;padding:12px">Cancel</button>
          <button class="generate-btn" data-action="confirm" style="flex:1;padding:12px;background:${confirmColor}">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', async () => {
      try {
        await onConfirm();
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
      }
      overlay.remove();
    });
  };

  const showAssignDialog = async (exerciseId) => {
    const overlay = document.createElement('div');
    overlay.className = 'pv-overlay';
    document.body.style.overflow = 'hidden';

    overlay.innerHTML = `
      <div class="gd-dialog" style="width:480px">
        <div class="gd-header">
          <span class="gd-title">Assign to Students</span>
          <button class="pv-close-btn" data-action="close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="gd-body" id="assign-body">
          <div class="gd-loading">Loading students...</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    openDialogs.push(overlay);

    const closeDialog = () => {
      document.body.style.overflow = '';
      removeDialog(overlay);
    };

    overlay.querySelector('[data-action="close"]').addEventListener('click', closeDialog);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDialog(); });

    try {
      const students = await apiClient.getStudents();
      const body = overlay.querySelector('#assign-body');

      if (students.length === 0) {
        body.innerHTML = `
          <p style="text-align:center;color:var(--color-gray-400);padding:20px 0">No students found. Create a student first.</p>
          <button class="generate-btn" style="width:100%" id="create-student-from-assign">+ Add Student</button>
        `;
        body.querySelector('#create-student-from-assign').addEventListener('click', async () => {
          closeDialog();
          const result = await showStudentDialog(apiClient);
          if (result) {
            showToast('Student created');
            await showAssignDialog(exerciseId);
          }
        });
        return;
      }

      body.innerHTML = `
        <div class="gd-list">
          ${students.map(s => {
            const skillCls = s.skill_level === 'advanced' ? 'badge-advanced' : s.skill_level === 'intermediate' ? 'badge-intermediate' : 'badge-beginner';
            return `
              <label class="gd-check-row">
                <input type="checkbox" value="${escapeHtml(s.id)}" class="gd-checkbox">
                <span class="gd-check-name">${escapeHtml(s.name)}</span>
                <span class="badge ${skillCls}">${SKILL_LEVEL_LABELS[s.skill_level] || s.skill_level}</span>
              </label>
            `;
          }).join('')}
        </div>
      `;

      // Add footer
      const footer = document.createElement('div');
      footer.className = 'gd-footer';
      footer.innerHTML = `
        <button class="btn-outline" data-action="cancel">Cancel</button>
        <button class="generate-btn" data-action="assign">Assign Selected</button>
      `;
      overlay.querySelector('.gd-dialog').appendChild(footer);

      footer.querySelector('[data-action="cancel"]').addEventListener('click', closeDialog);
      footer.querySelector('[data-action="assign"]').addEventListener('click', async () => {
        const selected = Array.from(overlay.querySelectorAll('.gd-checkbox:checked')).map(i => i.value);

        if (selected.length === 0) {
          showToast('Select at least one student', 'error');
          return;
        }

        try {
          const result = await apiClient.assignExercise(exerciseId, selected);

          if (result.errors && result.errors.length > 0) {
            showToast(`Assigned with warnings: ${result.errors[0]}`, 'error');
          } else {
            showToast(`Assigned to ${result.assigned.length} student(s)`);
          }

          closeDialog();
          renderExercisesTab();
        } catch (error) {
          showToast(`Error: ${error.message}`, 'error');
        }
      });
    } catch (error) {
      overlay.querySelector('#assign-body').innerHTML = `<div style="padding:20px;text-align:center;color:var(--color-error-500)">${escapeHtml(error.message)}</div>`;
    }
  };

  // ==================== Students Tab ====================

  const renderStudentsTab = async () => {
    const content = container.querySelector('#tab-content');
    content.innerHTML = '<div class="loading-cell">Loading students...</div>';

    try {
      const students = await apiClient.getStudents();

      const skillBadgeFn = (level) => {
        const cls = level === 'advanced' ? 'badge-advanced' : level === 'intermediate' ? 'badge-intermediate' : 'badge-beginner';
        return `<span class="badge ${cls}">${SKILL_LEVEL_LABELS[level] || level}</span>`;
      };

      content.innerHTML = `
        <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
          <button id="add-student-btn" class="generate-btn" style="font-size:13px;padding:8px 16px">+ Add Student</button>
        </div>
        ${students.length === 0 ?
          '<div class="empty-message">No students yet. Click "+ Add Student" to get started.</div>' :
          `<div class="ep-table-wrap">
            <table class="ep-table">
              <thead>
                <tr>
                  <th class="ep-th-grow">Student</th>
                  <th style="width:100px">Skill</th>
                  <th style="width:180px">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${students.map(s => `
                  <tr data-id="${escapeHtml(s.id)}">
                    <td>
                      <div class="ep-cell-name">${escapeHtml(s.name)}</div>
                      <div class="ep-cell-muted" style="font-size:12px">${s.email ? escapeHtml(s.email) : 'No email'}</div>
                    </td>
                    <td>${skillBadgeFn(s.skill_level)}</td>
                    <td>
                      <div class="ep-actions">
                        <button class="btn-outline btn-sm" data-action="edit">Edit</button>
                        <button class="btn-outline btn-sm" data-action="performance">Stats</button>
                        <button class="btn-outline btn-sm ep-more-btn" data-action="more" title="More actions">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`
        }
      `;

      content.querySelector('#add-student-btn').addEventListener('click', async () => {
        const result = await showStudentDialog(apiClient);
        if (result) {
          showToast('Student created');
          renderStudentsTab();
          renderStats();
        }
      });

      content.querySelectorAll('.ep-table tbody tr').forEach(row => {
        row.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const studentId = row.dataset.id;
            const action = btn.dataset.action;

            try {
              if (action === 'edit') {
                const student = await apiClient.getStudent(studentId);
                const result = await showStudentDialog(apiClient, student);
                if (result) {
                  showToast('Student updated');
                  renderStudentsTab();
                }
              } else if (action === 'performance') {
                await showStudentPerformance(studentId);
              } else if (action === 'more') {
                // Remove existing dropdowns
                document.querySelectorAll('.gd-dropdown').forEach(d => d.remove());
                const dropdown = document.createElement('div');
                dropdown.className = 'gd-dropdown';
                dropdown.innerHTML = `
                  <button class="gd-dd-item gd-dd-danger" data-dd="delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>Delete Student</button>
                `;
                const rect = btn.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = `${rect.bottom + 4}px`;
                dropdown.style.right = `${window.innerWidth - rect.right}px`;
                document.body.appendChild(dropdown);
                const closeDd = () => { dropdown.remove(); document.removeEventListener('click', closeDd); };
                setTimeout(() => document.addEventListener('click', closeDd), 0);
                dropdown.querySelector('[data-dd="delete"]').addEventListener('click', async (ev) => {
                  ev.stopPropagation();
                  dropdown.remove();
                  showConfirmDialog({
                    icon: 'rotate-ccw', iconColor: 'var(--color-error-500)', iconBg: 'var(--color-error-50)',
                    title: 'Delete Student?',
                    message: 'This will permanently delete this student and all their exercise assignments.',
                    confirmLabel: 'Delete', confirmColor: 'var(--color-error-500)',
                    onConfirm: async () => {
                      await apiClient.deleteStudent(studentId);
                      showToast('Student deleted');
                      renderStudentsTab();
                      renderStats();
                    }
                  });
                });
              }
            } catch (error) {
              showToast(`Error: ${error.message}`, 'error');
            }
          });
        });
      });
    } catch (error) {
      content.innerHTML = `<div class="error-cell">Error: ${escapeHtml(error.message)}</div>`;
    }
  };

  const showStudentPerformance = async (studentId) => {
    const dialog = document.createElement('div');
    dialog.className = 'performance-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <button class="dialog-close">&times;</button>
        <div class="dialog-body">Loading...</div>
      </div>
    `;

    document.body.appendChild(dialog);
    openDialogs.push(dialog);
    dialog.querySelector('.dialog-close').addEventListener('click', () => removeDialog(dialog));

    try {
      const data = await apiClient.getStudentPerformance(studentId);

      dialog.querySelector('.dialog-body').innerHTML = `
        <h3>Performance: ${escapeHtml(data.student.name)}</h3>

        <div class="performance-summary">
          <div class="stat-card">
            <span class="stat-value">${data.performance.total_exercises}</span>
            <span class="stat-label">Exercises Completed</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${data.performance.average_score !== null ? data.performance.average_score + '%' : '-'}</span>
            <span class="stat-label">Average Score</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">${data.performance.total_puzzles_solved}/${data.performance.total_puzzles}</span>
            <span class="stat-label">Puzzles Correct</span>
          </div>
        </div>

        <h4>History</h4>
        ${data.performance.history.length === 0 ?
          '<p class="empty-message">No graded exercises yet</p>' :
          `<table class="history-table">
            <thead>
              <tr>
                <th>Week</th>
                <th>Score</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${data.performance.history.map(h => `
                <tr>
                  <td>${escapeHtml(h.week)}</td>
                  <td>${h.score}/${h.total}</td>
                  <td>
                    <span class="score-bar" style="width: ${h.percentage}%">${h.percentage}%</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
        }
      `;
    } catch (error) {
      dialog.querySelector('.dialog-body').innerHTML = `<div class="error">${escapeHtml(error.message)}</div>`;
    }
  };

  // ==================== Performance Tab ====================

  const renderPerformanceTab = async () => {
    const content = container.querySelector('#tab-content');
    content.innerHTML = '<div class="loading-cell">Loading performance data...</div>';

    try {
      const students = await apiClient.getStudents();

      if (students.length === 0) {
        content.innerHTML = '<div class="empty-message">No students yet. Add students first.</div>';
        return;
      }

      const performanceData = await Promise.all(
        students.map(s => apiClient.getStudentPerformance(s.id))
      );

      content.innerHTML = `
        <div class="performance-overview">
          <table class="performance-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Skill Level</th>
                <th>Exercises</th>
                <th>Avg Score</th>
                <th>Total Correct</th>
              </tr>
            </thead>
            <tbody>
              ${performanceData.map(data => `
                <tr>
                  <td>${escapeHtml(data.student.name)}</td>
                  <td>${SKILL_LEVEL_LABELS[data.student.skill_level]}</td>
                  <td>${data.performance.total_exercises}</td>
                  <td>${data.performance.average_score !== null ? data.performance.average_score + '%' : '-'}</td>
                  <td>${data.performance.total_puzzles_solved}/${data.performance.total_puzzles}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      content.innerHTML = `<div class="error-cell">Error: ${escapeHtml(error.message)}</div>`;
    }
  };

  // ==================== Tab Switching ====================

  const renderTab = () => {
    switch (activeTab) {
      case 'exercises':
        renderExercisesTab();
        break;
      case 'performance':
        renderPerformanceTab();
        break;
    }
  };

  const removeDialog = (dialog) => {
    const idx = openDialogs.indexOf(dialog);
    if (idx !== -1) openDialogs.splice(idx, 1);
    if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
  };

  // ==================== Initialize ====================

  container.querySelectorAll('.ep-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.ep-tab').forEach(b => b.classList.remove('ep-tab-active'));
      btn.classList.add('ep-tab-active');
      activeTab = btn.dataset.tab;
      renderTab();
    });
  });

  // Top-level create button
  container.querySelector('#page-create-btn').addEventListener('click', async () => {
    const puzzles = getCurrentPuzzles();
    const result = await showCreateExerciseDialog(apiClient, puzzles || [], onPuzzlesUpdated);
    if (result) {
      showToast('Exercise created successfully');
      renderTab();
    }
  });

  renderTab();

  // Return cleanup function
  return () => {
    openDialogs.forEach(d => {
      if (d.parentNode) d.parentNode.removeChild(d);
    });
    openDialogs.length = 0;
  };
}

export default showExercisePanel;
