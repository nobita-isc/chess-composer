/**
 * ExercisePanel.js
 * Main panel for managing student exercises
 */

import { showStudentDialog } from './StudentDialog.js';
import { showCreateExerciseDialog } from './CreateExerciseDialog.js';
import { showGradeDialog } from './GradeDialog.js';
import { openPrintPreview } from './PrintPreview.js';
import { openPuzzlePlayer } from './PuzzlePlayer.js';

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
export function showExercisePanel(apiClient, getCurrentPuzzles) {
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
        if (!puzzles || puzzles.length === 0) {
          showToast('Generate puzzles first before creating an exercise', 'error');
          return;
        }

        const result = await showCreateExerciseDialog(apiClient, puzzles);
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
              case 'assign':
                await showAssignDialog(exerciseId);
                break;
              case 'delete':
                if (confirm('Delete this exercise?')) {
                  await apiClient.deleteExercise(exerciseId);
                  showToast('Exercise deleted');
                  renderExercisesTab();
                  renderStats();
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

          if (!confirm(`Mark ${assignment.student_name}'s exercise as final? They will no longer be able to solve or modify it.`)) {
            return;
          }

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

          if (!confirm(`Reset ${assignment.student_name}'s score to 0? This will clear all puzzle results and hints.`)) {
            return;
          }

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

      content.innerHTML = `
        <div class="students-header">
          <button id="add-student-btn" class="action-btn primary-btn">+ Add Student</button>
        </div>

        <div class="students-list">
          ${students.length === 0 ?
            '<div class="empty-message">No students yet</div>' :
            `<table class="students-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Skill Level</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${students.map(s => `
                  <tr data-id="${escapeHtml(s.id)}">
                    <td>${escapeHtml(s.name)}</td>
                    <td>${s.email ? escapeHtml(s.email) : '<em>-</em>'}</td>
                    <td>${SKILL_LEVEL_LABELS[s.skill_level] || s.skill_level}</td>
                    <td>
                      <button class="action-btn" data-action="edit" title="Edit">✏️</button>
                      <button class="action-btn" data-action="performance" title="Performance">📊</button>
                      <button class="action-btn" data-action="delete" title="Delete">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
          }
        </div>
      `;

      content.querySelector('#add-student-btn').addEventListener('click', async () => {
        const result = await showStudentDialog(apiClient);
        if (result) {
          showToast('Student created');
          renderStudentsTab();
          renderStats();
        }
      });

      content.querySelectorAll('.students-table .action-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const row = e.target.closest('tr');
          const studentId = row.dataset.id;
          const action = e.target.dataset.action;

          try {
            switch (action) {
              case 'edit':
                const student = await apiClient.getStudent(studentId);
                const result = await showStudentDialog(apiClient, student);
                if (result) {
                  showToast('Student updated');
                  renderStudentsTab();
                }
                break;
              case 'performance':
                await showStudentPerformance(studentId);
                break;
              case 'delete':
                if (confirm('Delete this student? This will also remove their exercise assignments.')) {
                  await apiClient.deleteStudent(studentId);
                  showToast('Student deleted');
                  renderStudentsTab();
                  renderStats();
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
      case 'students':
        renderStudentsTab();
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
export function renderExercisePage(container, apiClient, getCurrentPuzzles) {
  let activeTab = 'exercises';
  const openDialogs = [];

  container.innerHTML = `
    <div class="page-panel admin-content exercise-panel">
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
                  <button class="action-btn" data-action="assign" title="Assign">📝</button>
                  <button class="action-btn" data-action="delete" title="Delete">🗑️</button>
                </div>
              </div>
            `).join('')}
        </div>
      `;

      content.querySelector('#create-exercise-btn').addEventListener('click', async () => {
        const puzzles = getCurrentPuzzles();
        if (!puzzles || puzzles.length === 0) {
          showToast('Generate puzzles first before creating an exercise', 'error');
          return;
        }

        const result = await showCreateExerciseDialog(apiClient, puzzles);
        if (result) {
          showToast('Exercise created successfully');
          renderExercisesTab();
          renderStats();
        }
      });

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
              case 'assign':
                await showAssignDialog(exerciseId);
                break;
              case 'delete':
                if (confirm('Delete this exercise?')) {
                  await apiClient.deleteExercise(exerciseId);
                  showToast('Exercise deleted');
                  renderExercisesTab();
                  renderStats();
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

    document.body.appendChild(dialog);
    openDialogs.push(dialog);
    dialog.querySelector('.dialog-close').addEventListener('click', () => removeDialog(dialog));
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) removeDialog(dialog);
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

      const gradeAllBtn = dialog.querySelector('#grade-all-btn');
      if (gradeAllBtn) {
        gradeAllBtn.addEventListener('click', () => {
          openPuzzlePlayer(exercise, {
            gradingMode: true,
            assignments,
            apiClient,
            onGraded: () => {
              showToast('All grades saved successfully');
              removeDialog(dialog);
              showExerciseDetails(exerciseId);
            }
          });
        });
      }

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
              removeDialog(dialog);
              showExerciseDetails(exerciseId);
            }
          });
        });
      });

      dialog.querySelectorAll('.grade-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const studentExerciseId = btn.dataset.id;
          const assignment = assignments.find(a => a.id === studentExerciseId);
          const result = await showGradeDialog(apiClient, assignment);
          if (result) {
            showToast('Graded successfully');
            removeDialog(dialog);
            await showExerciseDetails(exerciseId);
          }
        });
      });

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

          if (!confirm(`Mark ${assignment.student_name}'s exercise as final? They will no longer be able to solve or modify it.`)) {
            return;
          }

          try {
            await apiClient.markStudentExerciseAsFinal(studentExerciseId);
            showToast('Marked as final');
            removeDialog(dialog);
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

          if (!confirm(`Reset ${assignment.student_name}'s score to 0? This will clear all puzzle results and hints.`)) {
            return;
          }

          try {
            await apiClient.resetStudentExerciseScore(studentExerciseId);
            showToast('Score reset to 0');
            removeDialog(dialog);
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

    document.body.appendChild(dialog);
    openDialogs.push(dialog);
    dialog.querySelector('.dialog-close').addEventListener('click', () => removeDialog(dialog));

    try {
      const students = await apiClient.getStudents();

      if (students.length === 0) {
        dialog.querySelector('.dialog-body').innerHTML = `
          <p class="empty-message">No students found. Create a student first.</p>
          <button id="create-student-from-assign" class="action-btn primary-btn">+ Add Student</button>
        `;
        dialog.querySelector('#create-student-from-assign').addEventListener('click', async () => {
          removeDialog(dialog);
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

      dialog.querySelector('.cancel-btn').addEventListener('click', () => removeDialog(dialog));

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

          removeDialog(dialog);
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
    const content = container.querySelector('#tab-content');
    content.innerHTML = '<div class="loading-cell">Loading students...</div>';

    try {
      const students = await apiClient.getStudents();

      content.innerHTML = `
        <div class="students-header">
          <button id="add-student-btn" class="action-btn primary-btn">+ Add Student</button>
        </div>

        <div class="students-list">
          ${students.length === 0 ?
            '<div class="empty-message">No students yet</div>' :
            `<table class="students-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Skill Level</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${students.map(s => `
                  <tr data-id="${escapeHtml(s.id)}">
                    <td>${escapeHtml(s.name)}</td>
                    <td>${s.email ? escapeHtml(s.email) : '<em>-</em>'}</td>
                    <td>${SKILL_LEVEL_LABELS[s.skill_level] || s.skill_level}</td>
                    <td>
                      <button class="action-btn" data-action="edit" title="Edit">✏️</button>
                      <button class="action-btn" data-action="performance" title="Performance">📊</button>
                      <button class="action-btn" data-action="delete" title="Delete">🗑️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
          }
        </div>
      `;

      content.querySelector('#add-student-btn').addEventListener('click', async () => {
        const result = await showStudentDialog(apiClient);
        if (result) {
          showToast('Student created');
          renderStudentsTab();
          renderStats();
        }
      });

      content.querySelectorAll('.students-table .action-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const row = e.target.closest('tr');
          const studentId = row.dataset.id;
          const action = e.target.dataset.action;

          try {
            switch (action) {
              case 'edit':
                const student = await apiClient.getStudent(studentId);
                const result = await showStudentDialog(apiClient, student);
                if (result) {
                  showToast('Student updated');
                  renderStudentsTab();
                }
                break;
              case 'performance':
                await showStudentPerformance(studentId);
                break;
              case 'delete':
                if (confirm('Delete this student? This will also remove their exercise assignments.')) {
                  await apiClient.deleteStudent(studentId);
                  showToast('Student deleted');
                  renderStudentsTab();
                  renderStats();
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
      case 'students':
        renderStudentsTab();
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

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      renderTab();
    });
  });

  renderStats();
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
