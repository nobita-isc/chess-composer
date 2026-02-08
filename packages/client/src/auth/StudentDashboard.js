/**
 * StudentDashboard.js
 * Full student dashboard: exercises, performance, grades
 */

import { authManager } from './AuthManager.js';
import { openPuzzlePlayer } from '../exercises/PuzzlePlayer.js';

const STATUS_LABELS = {
  'assigned': 'Assigned',
  'submitted': 'Submitted',
  'graded': 'Graded'
};

const STATUS_COLORS = {
  'assigned': '#6366f1',
  'submitted': '#f59e0b',
  'graded': '#22c55e'
};

export function renderStudentDashboard(container, apiClient) {
  const user = authManager.getCurrentUser();
  const studentId = user.student_id;
  let activeTab = 'exercises';

  container.innerHTML = `
    <div class="student-dashboard">
      <header class="dashboard-header">
        <div class="dashboard-title">
          <h1>My Dashboard</h1>
          <p class="dashboard-subtitle">Welcome, ${escapeHtml(user.username)}</p>
        </div>
        <div class="dashboard-actions">
          <button id="dashboard-logout-btn" class="logout-btn">Logout</button>
        </div>
      </header>

      <div class="dashboard-tabs">
        <button class="tab-btn active" data-tab="exercises">My Exercises</button>
        <button class="tab-btn" data-tab="performance">Performance</button>
      </div>

      <div class="dashboard-content" id="dashboard-content">
        <div class="loading-cell">Loading...</div>
      </div>
    </div>
  `;

  container.querySelector('#dashboard-logout-btn').addEventListener('click', () => {
    authManager.logout();
  });

  const tabBtns = container.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      renderTab();
    });
  });

  const contentEl = container.querySelector('#dashboard-content');

  async function renderTab() {
    contentEl.innerHTML = '<div class="loading-cell">Loading...</div>';

    try {
      if (activeTab === 'exercises') {
        await renderExercisesTab();
      } else if (activeTab === 'performance') {
        await renderPerformanceTab();
      }
    } catch (error) {
      contentEl.innerHTML = `<div class="error-message">Failed to load data: ${escapeHtml(error.message)}</div>`;
    }
  }

  async function renderExercisesTab() {
    const exercises = await apiClient.getStudentExercises(studentId);

    if (!exercises || exercises.length === 0) {
      contentEl.innerHTML = `
        <div class="empty-state">
          <p>No exercises assigned yet.</p>
          <p class="empty-hint">Your teacher will assign exercises for you to solve.</p>
        </div>
      `;
      return;
    }

    const sortedExercises = [...exercises].sort((a, b) =>
      (b.week_start || '').localeCompare(a.week_start || '')
    );

    contentEl.innerHTML = `
      <div class="exercise-list">
        ${sortedExercises.map(ex => renderExerciseCard(ex)).join('')}
      </div>
    `;

    contentEl.querySelectorAll('.exercise-card-clickable').forEach(card => {
      card.addEventListener('click', async () => {
        const exerciseId = card.dataset.exerciseId;
        const studentExerciseId = card.dataset.studentExerciseId;
        const status = card.dataset.status;
        const weekEnd = card.dataset.weekEnd;
        const isFinal = card.dataset.isFinal === '1';
        const puzzleResults = card.dataset.puzzleResults || null;
        const puzzleHints = card.dataset.puzzleHints || null;
        await launchPuzzlePlayer(exerciseId, studentExerciseId, status, weekEnd, isFinal, puzzleResults, puzzleHints);
      });
    });
  }

  function isPastDeadline(weekEnd) {
    if (!weekEnd) return false;
    const deadline = new Date(weekEnd + 'T23:59:59');
    return new Date() > deadline;
  }

  function renderExerciseCard(exercise) {
    const status = exercise.status || 'assigned';
    const statusLabel = STATUS_LABELS[status] || status;
    const statusColor = STATUS_COLORS[status] || '#6b7280';
    const weekLabel = exercise.week_label || `${exercise.week_start || 'Unknown'} - ${exercise.week_end || ''}`;
    const pastDeadline = isPastDeadline(exercise.week_end);
    const isFinal = exercise.is_final === 1;

    const hasScore = exercise.score != null;

    const scoreHtml = hasScore
      ? `<div class="exercise-score">
           <span class="score-value">${exercise.score}/${exercise.total_puzzles ?? 0}</span>
           <span class="score-label">Score</span>
         </div>`
      : '';

    const hasPuzzleResults = exercise.puzzle_results && exercise.puzzle_results.length > 0;
    const puzzleResultsHtml = hasPuzzleResults
      ? `<div class="puzzle-dots">
           ${exercise.puzzle_results.split(',').map(r =>
             `<span class="dot ${r === '1' ? 'dot-correct' : r === '0' ? 'dot-wrong' : 'dot-unknown'}"></span>`
           ).join('')}
         </div>`
      : '';

    const notesHtml = exercise.notes
      ? `<div class="exercise-notes"><strong>Feedback:</strong> ${escapeHtml(exercise.notes)}</div>`
      : '';

    const isLocked = isFinal || pastDeadline;
    const actionLabel = isFinal ? 'Review (Final)' : (pastDeadline ? 'Review' : 'Solve Puzzles');

    return `
      <div class="exercise-card exercise-card-clickable"
           data-exercise-id="${exercise.exercise_id}"
           data-student-exercise-id="${exercise.id}"
           data-status="${status}"
           data-week-end="${exercise.week_end || ''}"
           data-is-final="${exercise.is_final || 0}"
           data-puzzle-results="${escapeHtml(exercise.puzzle_results || '')}"
           data-puzzle-hints="${escapeHtml(exercise.puzzle_hints || '')}">
        <div class="exercise-card-header">
          <div class="exercise-week">${escapeHtml(exercise.name || weekLabel)}</div>
          <div class="exercise-card-badges">
            <span class="status-badge" style="background: ${statusColor}">${statusLabel}</span>
            ${isFinal ? '<span class="status-badge status-final">Final</span>' : ''}
          </div>
        </div>
        <div class="exercise-card-meta">
          <span>${exercise.total_puzzles || 0} puzzles</span>
          <span>${weekLabel}</span>
        </div>
        ${scoreHtml}
        ${puzzleResultsHtml}
        ${notesHtml}
        <div class="exercise-card-action">
          <span class="exercise-card-action-label">${actionLabel} &rarr;</span>
        </div>
      </div>
    `;
  }

  async function launchPuzzlePlayer(exerciseId, studentExerciseId, status, weekEnd, isFinal, puzzleResults, puzzleHints) {
    try {
      const exerciseData = await apiClient.getExercise(exerciseId);

      if (!exerciseData || !exerciseData.puzzles) {
        throw new Error('Failed to load exercise puzzles');
      }

      const pastDeadline = isPastDeadline(weekEnd);
      const isLocked = pastDeadline || isFinal;

      // Locked (final or past deadline): read-only review (no moves)
      // Otherwise: allow solving and saving (studentMode)
      openPuzzlePlayer(exerciseData, {
        apiClient,
        studentMode: !isLocked,
        reviewMode: isLocked,
        studentExerciseId: !isLocked ? studentExerciseId : null,
        existingResults: puzzleResults || null,
        existingHints: puzzleHints || null,
        onComplete: () => {
          renderTab();
        }
      });
    } catch (error) {
      contentEl.innerHTML = `<div class="error-message">Failed to load exercise: ${escapeHtml(error.message)}</div>`;
    }
  }

  async function renderPerformanceTab() {
    const performance = await apiClient.getStudentPerformance(studentId);

    if (!performance || !performance.history || performance.history.length === 0) {
      contentEl.innerHTML = `
        <div class="empty-state">
          <p>No graded exercises yet.</p>
          <p class="empty-hint">Complete exercises to see your performance history.</p>
        </div>
      `;
      return;
    }

    const avgScore = performance.average_score != null
      ? `${Math.round(performance.average_score)}%`
      : 'N/A';

    contentEl.innerHTML = `
      <div class="performance-overview">
        <div class="perf-stat">
          <span class="perf-value">${performance.total_exercises || 0}</span>
          <span class="perf-label">Exercises Completed</span>
        </div>
        <div class="perf-stat">
          <span class="perf-value">${avgScore}</span>
          <span class="perf-label">Average Score</span>
        </div>
        <div class="perf-stat">
          <span class="perf-value">${performance.total_correct || 0}/${performance.total_puzzles || 0}</span>
          <span class="perf-label">Total Correct</span>
        </div>
      </div>

      <h3 class="section-title">History</h3>
      <table class="performance-table">
        <thead>
          <tr>
            <th>Week</th>
            <th>Score</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          ${performance.history.map(h => {
            const pct = h.total_puzzles > 0 ? Math.round((h.score / h.total_puzzles) * 100) : 0;
            return `
              <tr>
                <td>${escapeHtml(h.week_label || h.week_start || '')}</td>
                <td>${h.score}/${h.total_puzzles}</td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${pct}%"></div>
                  </div>
                  <span class="progress-pct">${pct}%</span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  renderTab();
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
