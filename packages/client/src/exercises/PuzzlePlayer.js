/**
 * PuzzlePlayer.js
 * Interactive puzzle player for exercises
 * Allows users to play through puzzles and check their answers
 */

import { Chess } from 'chess.js';
import { Chessground } from 'chessground';

/**
 * Parse UCI move (e.g., "e2e4") to { from, to, promotion }
 */
function parseUciMove(uci) {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined
  };
}

/**
 * Get legal moves as a Map for chessground
 */
function getLegalMoves(chess) {
  const dests = new Map();
  const moves = chess.moves({ verbose: true });

  for (const move of moves) {
    if (!dests.has(move.from)) {
      dests.set(move.from, []);
    }
    dests.get(move.from).push(move.to);
  }

  return dests;
}

/**
 * Open interactive puzzle player
 * @param {object} exercise - Exercise with puzzles array
 * @param {object} options - Optional settings
 * @param {boolean} options.gradingMode - Enable grading mode
 * @param {object} options.assignment - Single student assignment (for grading one student)
 * @param {object[]} options.assignments - Multiple student assignments (for grading multiple students)
 * @param {ApiClient} options.apiClient - API client (for saving grade)
 * @param {function} options.onGraded - Callback when grading is saved
 */
export function openPuzzlePlayer(exercise, options = {}) {
  const puzzles = exercise.puzzles || [];
  if (puzzles.length === 0) {
    alert('No puzzles in this exercise');
    return;
  }

  const { gradingMode = false, assignment = null, assignments = null, apiClient = null, onGraded = null } = options;

  // Build students list from assignments or single assignment
  const students = assignments || (assignment ? [assignment] : []);
  const multiStudentMode = students.length > 1;

  let currentIndex = 0;
  let currentStudentIndex = 0;
  let boardInstance = null;
  let puzzleState = null;

  // For grading mode: track results per student
  // studentResults[studentIndex][puzzleIndex] = true/false/null
  const studentResults = students.map((student) => {
    // Load existing puzzle_results if available
    if (student.puzzle_results) {
      const parts = student.puzzle_results.split(',');
      return puzzles.map((_, i) => {
        if (i < parts.length && parts[i] !== '') {
          return parts[i] === '1';
        }
        return null;
      });
    }
    return new Array(puzzles.length).fill(null);
  });

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'puzzle-player-overlay';
  overlay.innerHTML = `
    <div class="puzzle-player-content ${gradingMode ? 'grading-mode' : ''}">
      <button class="puzzle-player-close">&times;</button>

      <div class="puzzle-player-header">
        <h2>${escapeHtml(exercise.name || exercise.week_label)}</h2>
        <div class="puzzle-progress">
          <span id="puzzle-current">1</span> / <span id="puzzle-total">${puzzles.length}</span>
          ${gradingMode ? `<span id="grading-score" class="grading-score">Score: 0/${puzzles.length}</span>` : ''}
        </div>
      </div>

      ${gradingMode && students.length > 0 ? `
        <div class="student-tabs" id="student-tabs">
          ${students.map((s, i) => `
            <button class="student-tab ${i === 0 ? 'active' : ''}" data-index="${i}">
              <span class="student-name">${escapeHtml(s.student_name)}</span>
              <span class="student-score" id="student-score-${i}">0/${puzzles.length}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}

      ${gradingMode ? `
        <div class="grading-overview" id="grading-overview">
          ${puzzles.map((_, i) => `
            <button class="grading-dot" data-index="${i}" title="Puzzle ${i + 1}">
              <span class="dot-number">${i + 1}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}

      <div class="puzzle-player-main">
        <div class="puzzle-board-container">
          <div id="puzzle-board" class="puzzle-board"></div>
          <div id="puzzle-feedback" class="puzzle-feedback"></div>
        </div>

        <div class="puzzle-info-panel">
          <div id="puzzle-turn" class="puzzle-turn-indicator"></div>
          <div id="puzzle-last-move" class="puzzle-last-move"></div>
          <div id="puzzle-rating" class="puzzle-rating"></div>

          ${gradingMode ? `
            <div class="grading-buttons">
              <button id="btn-correct" class="grade-btn grade-correct">
                <span class="grade-icon">✓</span> Correct
              </button>
              <button id="btn-wrong" class="grade-btn grade-wrong">
                <span class="grade-icon">✗</span> Wrong
              </button>
            </div>
            <div id="puzzle-grade-status" class="puzzle-grade-status"></div>
          ` : ''}

          <div class="puzzle-controls">
            <button id="btn-prev" class="puzzle-nav-btn" disabled>&larr; Previous</button>
            <button id="btn-reset" class="puzzle-action-btn">Reset</button>
            <button id="btn-hint" class="puzzle-action-btn">Hint</button>
            <button id="btn-solution" class="puzzle-action-btn">Solution</button>
            <button id="btn-next" class="puzzle-nav-btn">Next &rarr;</button>
          </div>

          <div id="puzzle-solution-display" class="puzzle-solution-display"></div>

          ${gradingMode ? `
            <div class="grading-actions">
              <div class="auto-save-note">Grades are saved automatically</div>
              <button id="btn-save-grade" class="puzzle-save-btn">Done</button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .puzzle-player-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .puzzle-player-content {
      background: #2d2d2d;
      border-radius: 12px;
      padding: 24px;
      max-width: 900px;
      width: 95%;
      max-height: 95vh;
      overflow-y: auto;
      position: relative;
      color: #fff;
    }

    .puzzle-player-close {
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      color: #999;
      font-size: 28px;
      cursor: pointer;
      padding: 4px 8px;
      line-height: 1;
    }

    .puzzle-player-close:hover {
      color: #fff;
    }

    .puzzle-player-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #444;
    }

    .puzzle-player-header h2 {
      margin: 0;
      font-size: 20px;
    }

    .puzzle-progress {
      font-size: 16px;
      color: #888;
    }

    .puzzle-progress #puzzle-current {
      color: #4caf50;
      font-weight: bold;
    }

    .puzzle-player-main {
      display: flex;
      gap: 24px;
    }

    @media (max-width: 768px) {
      .puzzle-player-main {
        flex-direction: column;
      }
    }

    .puzzle-board-container {
      flex: 0 0 auto;
      position: relative;
    }

    .puzzle-board {
      width: 400px;
      height: 400px;
    }

    @media (max-width: 500px) {
      .puzzle-board {
        width: 300px;
        height: 300px;
      }
    }

    .puzzle-feedback {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: bold;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .puzzle-feedback.show {
      opacity: 1;
    }

    .puzzle-feedback.correct {
      background: rgba(76, 175, 80, 0.9);
      color: white;
    }

    .puzzle-feedback.incorrect {
      background: rgba(244, 67, 54, 0.9);
      color: white;
    }

    .puzzle-feedback.complete {
      background: rgba(33, 150, 243, 0.9);
      color: white;
    }

    .puzzle-info-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .puzzle-turn-indicator {
      font-size: 18px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 6px;
      text-align: center;
    }

    .puzzle-turn-indicator.white {
      background: #f0f0f0;
      color: #333;
    }

    .puzzle-turn-indicator.black {
      background: #333;
      color: #f0f0f0;
    }

    .puzzle-last-move {
      font-size: 14px;
      color: #aaa;
      font-style: italic;
    }

    .puzzle-rating {
      font-size: 14px;
      color: #888;
    }

    .puzzle-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: auto;
    }

    .puzzle-nav-btn, .puzzle-action-btn {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s, opacity 0.2s;
    }

    .puzzle-nav-btn {
      background: #4caf50;
      color: white;
    }

    .puzzle-nav-btn:hover:not(:disabled) {
      background: #45a049;
    }

    .puzzle-nav-btn:disabled {
      background: #555;
      color: #888;
      cursor: not-allowed;
    }

    .puzzle-action-btn {
      background: #555;
      color: #ddd;
    }

    .puzzle-action-btn:hover {
      background: #666;
    }

    .puzzle-solution-display {
      background: #3a3a3a;
      border-radius: 6px;
      padding: 12px;
      font-family: monospace;
      font-size: 14px;
      min-height: 60px;
      color: #ccc;
    }

    .puzzle-solution-display .move {
      display: inline-block;
      padding: 2px 6px;
      margin: 2px;
      border-radius: 4px;
      background: #4a4a4a;
    }

    .puzzle-solution-display .move.played {
      background: #4caf50;
      color: white;
    }

    .puzzle-solution-display .move.current {
      background: #2196f3;
      color: white;
    }

    /* Grading Mode Styles */
    .student-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 0;
      border-bottom: 1px solid #444;
      margin-bottom: 8px;
    }

    .student-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 16px;
      background: #3a3a3a;
      border: 2px solid #555;
      border-radius: 8px;
      color: #aaa;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 100px;
    }

    .student-tab:hover {
      border-color: #888;
      color: #fff;
    }

    .student-tab.active {
      border-color: #2196f3;
      background: #2a3a4a;
      color: #fff;
    }

    .student-tab.complete {
      border-color: #4caf50;
      background: #2a4a2a;
    }

    .student-tab .student-name {
      font-weight: 600;
      font-size: 13px;
    }

    .student-tab .student-score {
      font-size: 12px;
      opacity: 0.8;
    }

    .grading-score {
      display: inline-block;
      margin-left: 12px;
      padding: 4px 10px;
      background: #4a4a4a;
      border-radius: 4px;
      font-weight: bold;
    }

    .grading-overview {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 12px 0;
      border-bottom: 1px solid #444;
      margin-bottom: 16px;
    }

    .grading-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #555;
      background: #3a3a3a;
      color: #888;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .grading-dot:hover {
      border-color: #888;
      color: #fff;
    }

    .grading-dot.active {
      border-color: #2196f3;
      background: #2196f3;
      color: white;
    }

    .grading-dot.correct {
      border-color: #4caf50;
      background: #4caf50;
      color: white;
    }

    .grading-dot.wrong {
      border-color: #f44336;
      background: #f44336;
      color: white;
    }

    .grading-buttons {
      display: flex;
      gap: 12px;
      margin: 16px 0;
    }

    .grade-btn {
      flex: 1;
      padding: 16px 20px;
      border: 2px solid transparent;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .grade-btn .grade-icon {
      font-size: 20px;
    }

    .grade-correct {
      background: #2d4a2d;
      color: #4caf50;
      border-color: #4caf50;
    }

    .grade-correct:hover, .grade-correct.selected {
      background: #4caf50;
      color: white;
    }

    .grade-wrong {
      background: #4a2d2d;
      color: #f44336;
      border-color: #f44336;
    }

    .grade-wrong:hover, .grade-wrong.selected {
      background: #f44336;
      color: white;
    }

    .puzzle-grade-status {
      text-align: center;
      font-size: 14px;
      color: #888;
      min-height: 20px;
      transition: color 0.2s;
    }

    .puzzle-grade-status.saving {
      color: #ffc107;
    }

    .puzzle-grade-status.saved {
      color: #4caf50;
      font-weight: 600;
    }

    .puzzle-grade-status.error {
      color: #f44336;
      font-weight: 600;
    }

    .grading-actions {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #444;
    }

    .auto-save-note {
      text-align: center;
      font-size: 12px;
      color: #4caf50;
      margin-bottom: 10px;
    }

    .puzzle-save-btn {
      width: 100%;
      padding: 14px 24px;
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .puzzle-save-btn:hover:not(:disabled) {
      background: #1976d2;
    }

    .puzzle-save-btn.all-done {
      background: #4caf50;
    }

    .puzzle-save-btn.all-done:hover {
      background: #45a049;
    }
  `;
  document.head.appendChild(style);

  /**
   * Initialize puzzle at given index
   */
  function initPuzzle(index) {
    currentIndex = index;
    const puzzle = puzzles[index];

    // Update navigation
    overlay.querySelector('#puzzle-current').textContent = index + 1;
    overlay.querySelector('#btn-prev').disabled = index === 0;
    overlay.querySelector('#btn-next').disabled = index === puzzles.length - 1;

    // Parse moves
    const moves = puzzle.moves ? puzzle.moves.split(' ') : [];

    // Create chess instance and play opponent's first move
    const chess = new Chess(puzzle.fen);
    let lastMoveSan = null;

    if (moves.length > 0) {
      const uciMove = parseUciMove(moves[0]);
      if (uciMove) {
        const move = chess.move(uciMove);
        if (move) {
          lastMoveSan = move.san;
        }
      }
    }

    // Determine player color (whose turn after opponent's move)
    const playerColor = chess.turn();
    const orientation = playerColor === 'b' ? 'black' : 'white';

    // Store puzzle state
    puzzleState = {
      puzzle,
      chess,
      moves,
      currentMoveIndex: 1, // Start after opponent's first move
      playerColor,
      isComplete: false,
      solutionShown: false
    };

    // Update UI
    const turnText = playerColor === 'w' ? 'White to move' : 'Black to move';
    const turnEl = overlay.querySelector('#puzzle-turn');
    turnEl.textContent = turnText;
    turnEl.className = `puzzle-turn-indicator ${playerColor === 'w' ? 'white' : 'black'}`;

    overlay.querySelector('#puzzle-last-move').textContent =
      lastMoveSan ? `After ${lastMoveSan}` : '';

    overlay.querySelector('#puzzle-rating').textContent =
      puzzle.rating ? `Rating: ${puzzle.rating}` : '';

    overlay.querySelector('#puzzle-solution-display').innerHTML = '';
    hideFeedback();

    // Update grading UI if in grading mode
    if (gradingMode) {
      updateGradingUI();
    }

    // Initialize or update board
    const boardEl = overlay.querySelector('#puzzle-board');

    if (boardInstance) {
      boardInstance.destroy();
    }

    boardInstance = Chessground(boardEl, {
      fen: chess.fen(),
      orientation,
      turnColor: playerColor === 'w' ? 'white' : 'black',
      movable: {
        free: false,
        color: playerColor === 'w' ? 'white' : 'black',
        dests: getLegalMoves(chess),
        events: {
          after: handleMove
        }
      },
      draggable: {
        enabled: true,
        showGhost: true
      },
      animation: {
        enabled: true,
        duration: 200
      },
      highlight: {
        lastMove: true,
        check: true
      },
      premovable: {
        enabled: false
      }
    });
  }

  /**
   * Handle user move
   */
  function handleMove(from, to) {
    if (puzzleState.isComplete) return;

    const { chess, moves, currentMoveIndex, playerColor } = puzzleState;

    // Try to make the move
    const move = chess.move({ from, to, promotion: 'q' });

    if (!move) {
      // Invalid move, reset board
      boardInstance.set({ fen: chess.fen() });
      return;
    }

    // Check if this is the expected move
    const expectedUci = moves[currentMoveIndex];
    const expectedMove = parseUciMove(expectedUci);

    const isCorrect = expectedMove &&
      move.from === expectedMove.from &&
      move.to === expectedMove.to;

    if (isCorrect) {
      // Correct move
      showFeedback('Correct!', 'correct');
      puzzleState.currentMoveIndex++;

      // Update board
      boardInstance.set({
        fen: chess.fen(),
        lastMove: [from, to],
        turnColor: chess.turn() === 'w' ? 'white' : 'black',
        movable: {
          dests: new Map() // Disable moves temporarily
        }
      });

      // Check if puzzle is complete
      if (puzzleState.currentMoveIndex >= moves.length) {
        puzzleState.isComplete = true;
        showFeedback('Puzzle Complete!', 'complete');
        boardInstance.set({
          movable: { dests: new Map() }
        });
      } else {
        // Play opponent's next move after delay
        setTimeout(() => playOpponentMove(), 500);
      }
    } else {
      // Incorrect move - undo and allow retry
      chess.undo();
      showFeedback('Try again', 'incorrect');

      boardInstance.set({
        fen: chess.fen(),
        turnColor: playerColor === 'w' ? 'white' : 'black',
        movable: {
          color: playerColor === 'w' ? 'white' : 'black',
          dests: getLegalMoves(chess)
        }
      });
    }
  }

  /**
   * Play opponent's next move
   */
  function playOpponentMove() {
    const { chess, moves, currentMoveIndex, playerColor } = puzzleState;

    if (currentMoveIndex >= moves.length) return;

    const uciMove = parseUciMove(moves[currentMoveIndex]);
    if (!uciMove) return;

    const move = chess.move(uciMove);
    if (!move) return;

    puzzleState.currentMoveIndex++;

    // Animate the move
    boardInstance.move(move.from, move.to);

    boardInstance.set({
      fen: chess.fen(),
      lastMove: [move.from, move.to],
      turnColor: playerColor === 'w' ? 'white' : 'black',
      check: chess.inCheck(),
      movable: {
        color: playerColor === 'w' ? 'white' : 'black',
        dests: getLegalMoves(chess)
      }
    });

    // Check if puzzle is complete after opponent's move
    if (puzzleState.currentMoveIndex >= moves.length) {
      puzzleState.isComplete = true;
      showFeedback('Puzzle Complete!', 'complete');
      boardInstance.set({
        movable: { dests: new Map() }
      });
    }
  }

  /**
   * Show feedback message
   */
  function showFeedback(message, type) {
    const feedbackEl = overlay.querySelector('#puzzle-feedback');
    feedbackEl.textContent = message;
    feedbackEl.className = `puzzle-feedback show ${type}`;

    setTimeout(() => {
      feedbackEl.classList.remove('show');
    }, 1500);
  }

  function hideFeedback() {
    overlay.querySelector('#puzzle-feedback').className = 'puzzle-feedback';
  }

  /**
   * Reset current puzzle
   */
  function resetPuzzle() {
    initPuzzle(currentIndex);
  }

  /**
   * Show hint (highlight the target square)
   */
  function showHint() {
    const { moves, currentMoveIndex, isComplete } = puzzleState;

    if (isComplete || currentMoveIndex >= moves.length) return;

    const expectedMove = parseUciMove(moves[currentMoveIndex]);
    if (!expectedMove) return;

    // Flash the source square
    boardInstance.setAutoShapes([
      { orig: expectedMove.from, brush: 'green' }
    ]);

    setTimeout(() => {
      boardInstance.setAutoShapes([]);
    }, 1500);
  }

  /**
   * Show solution
   */
  function showSolution() {
    const { puzzle, moves } = puzzleState;
    puzzleState.solutionShown = true;

    // Parse all moves to SAN
    const tempChess = new Chess(puzzle.fen);
    const sanMoves = [];

    for (const uci of moves) {
      const uciMove = parseUciMove(uci);
      if (uciMove) {
        const move = tempChess.move(uciMove);
        if (move) {
          sanMoves.push(move.san);
        }
      }
    }

    // Display solution
    const solutionEl = overlay.querySelector('#puzzle-solution-display');
    solutionEl.innerHTML = `
      <strong>Solution:</strong><br>
      ${sanMoves.map((san, i) => {
        const isPlayed = i < puzzleState.currentMoveIndex;
        const isCurrent = i === puzzleState.currentMoveIndex;
        const moveNum = Math.floor(i / 2) + 1;
        const isWhite = i % 2 === (tempChess.turn() === 'b' ? 1 : 0);
        const prefix = isWhite || i === 0 ? `${moveNum}. ` : '';
        return `<span class="move ${isPlayed ? 'played' : ''} ${isCurrent ? 'current' : ''}">${prefix}${san}</span>`;
      }).join(' ')}
    `;
  }

  // ==================== Grading Functions ====================

  /**
   * Get current student's results array
   */
  function getCurrentResults() {
    return studentResults[currentStudentIndex] || [];
  }

  /**
   * Save grade for a specific student immediately
   */
  async function saveStudentGrade(studentIndex) {
    if (!gradingMode || !apiClient || !students[studentIndex]) return;

    const student = students[studentIndex];
    const results = studentResults[studentIndex];
    const correctCount = results.filter(r => r === true).length;

    // Convert results to comma-separated string (1=correct, 0=wrong, empty=not graded)
    const puzzleResultsStr = results.map(r => {
      if (r === true) return '1';
      if (r === false) return '0';
      return '';
    }).join(',');

    // Show saving indicator
    const statusEl = overlay.querySelector('#puzzle-grade-status');
    if (statusEl) {
      statusEl.textContent = 'Saving...';
      statusEl.classList.add('saving');
    }

    try {
      await apiClient.gradeExercise(student.id, correctCount, null, puzzleResultsStr);

      if (statusEl) {
        statusEl.textContent = `Saved (${correctCount}/${puzzles.length})`;
        statusEl.classList.remove('saving');
        statusEl.classList.add('saved');
        setTimeout(() => {
          statusEl.classList.remove('saved');
          updateGradingUI();
        }, 1500);
      }
    } catch (error) {
      if (statusEl) {
        statusEl.textContent = 'Save failed!';
        statusEl.classList.remove('saving');
        statusEl.classList.add('error');
        setTimeout(() => {
          statusEl.classList.remove('error');
        }, 2000);
      }
    }
  }

  /**
   * Mark current puzzle as correct and save immediately
   */
  function markCorrect() {
    studentResults[currentStudentIndex][currentIndex] = true;
    updateGradingUI();
    saveStudentGrade(currentStudentIndex);
    autoAdvance();
  }

  /**
   * Mark current puzzle as wrong and save immediately
   */
  function markWrong() {
    studentResults[currentStudentIndex][currentIndex] = false;
    updateGradingUI();
    saveStudentGrade(currentStudentIndex);
    autoAdvance();
  }

  /**
   * Auto-advance to next ungraded puzzle (within same student only)
   */
  function autoAdvance() {
    const results = getCurrentResults();

    // Find next ungraded puzzle for current student
    for (let i = currentIndex + 1; i < puzzles.length; i++) {
      if (results[i] === null) {
        setTimeout(() => initPuzzle(i), 300);
        return;
      }
    }
    // Check before current
    for (let i = 0; i < currentIndex; i++) {
      if (results[i] === null) {
        setTimeout(() => initPuzzle(i), 300);
        return;
      }
    }

    // All puzzles graded for current student - stay on current puzzle
    // User can manually switch to next student using tabs
  }

  /**
   * Switch to a different student
   */
  function switchStudent(studentIndex) {
    currentStudentIndex = studentIndex;

    // Update student tabs
    const tabs = overlay.querySelectorAll('.student-tab');
    tabs.forEach((tab, i) => {
      tab.classList.toggle('active', i === studentIndex);
    });

    // Go to first ungraded puzzle for this student, or puzzle 0
    const results = getCurrentResults();
    const firstUngraded = results.findIndex(r => r === null);
    initPuzzle(firstUngraded >= 0 ? firstUngraded : 0);
  }

  /**
   * Update grading UI elements
   */
  function updateGradingUI() {
    if (!gradingMode) return;

    const results = getCurrentResults();

    // Update dots for current student
    const dots = overlay.querySelectorAll('.grading-dot');
    dots.forEach((dot, i) => {
      dot.classList.remove('active', 'correct', 'wrong');
      if (i === currentIndex) {
        dot.classList.add('active');
      }
      if (results[i] === true) {
        dot.classList.add('correct');
      } else if (results[i] === false) {
        dot.classList.add('wrong');
      }
    });

    // Update current student score
    const correctCount = results.filter(r => r === true).length;
    const scoreEl = overlay.querySelector('#grading-score');
    if (scoreEl) {
      scoreEl.textContent = `Score: ${correctCount}/${puzzles.length}`;
    }

    // Update all student tabs with their scores
    students.forEach((_, i) => {
      const studentCorrect = studentResults[i].filter(r => r === true).length;
      const studentScoreEl = overlay.querySelector(`#student-score-${i}`);
      if (studentScoreEl) {
        studentScoreEl.textContent = `${studentCorrect}/${puzzles.length}`;
      }

      // Mark tab as complete if all graded
      const tab = overlay.querySelector(`.student-tab[data-index="${i}"]`);
      if (tab) {
        const allGraded = studentResults[i].every(r => r !== null);
        tab.classList.toggle('complete', allGraded);
      }
    });

    // Update grade buttons
    const correctBtn = overlay.querySelector('#btn-correct');
    const wrongBtn = overlay.querySelector('#btn-wrong');
    const statusEl = overlay.querySelector('#puzzle-grade-status');

    if (correctBtn && wrongBtn) {
      correctBtn.classList.remove('selected');
      wrongBtn.classList.remove('selected');

      if (results[currentIndex] === true) {
        correctBtn.classList.add('selected');
        if (statusEl) statusEl.textContent = 'Marked as correct';
      } else if (results[currentIndex] === false) {
        wrongBtn.classList.add('selected');
        if (statusEl) statusEl.textContent = 'Marked as wrong';
      } else {
        if (statusEl) statusEl.textContent = '';
      }
    }

    // Update done button (grades auto-save, this just closes)
    const saveBtn = overlay.querySelector('#btn-save-grade');
    if (saveBtn) {
      const allStudentsGraded = studentResults.every(sr => sr.every(r => r !== null));
      const totalGraded = studentResults.flat().filter(r => r !== null).length;
      const totalPuzzles = students.length * puzzles.length;

      // Always enabled - grades are auto-saved
      saveBtn.disabled = false;

      if (allStudentsGraded) {
        if (students.length > 1) {
          saveBtn.textContent = `Done (${students.length} students graded)`;
        } else {
          const score = studentResults[0].filter(r => r === true).length;
          saveBtn.textContent = `Done (${score}/${puzzles.length})`;
        }
        saveBtn.classList.add('all-done');
      } else {
        const remaining = totalPuzzles - totalGraded;
        saveBtn.classList.remove('all-done');
        saveBtn.textContent = `${remaining} puzzle${remaining > 1 ? 's' : ''} remaining`;
      }
    }
  }

  /**
   * Close and notify (grades are already auto-saved)
   */
  function finishGrading() {
    close(); // close() handles the onGraded callback
  }

  // ==================== Event Listeners ====================

  overlay.querySelector('.puzzle-player-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('#btn-prev').addEventListener('click', () => {
    if (currentIndex > 0) {
      initPuzzle(currentIndex - 1);
    }
  });

  overlay.querySelector('#btn-next').addEventListener('click', () => {
    if (currentIndex < puzzles.length - 1) {
      initPuzzle(currentIndex + 1);
    }
  });

  overlay.querySelector('#btn-reset').addEventListener('click', resetPuzzle);
  overlay.querySelector('#btn-hint').addEventListener('click', showHint);
  overlay.querySelector('#btn-solution').addEventListener('click', showSolution);

  // Grading mode event listeners
  if (gradingMode) {
    overlay.querySelector('#btn-correct')?.addEventListener('click', markCorrect);
    overlay.querySelector('#btn-wrong')?.addEventListener('click', markWrong);
    overlay.querySelector('#btn-save-grade')?.addEventListener('click', finishGrading);

    // Grading dot click handlers
    overlay.querySelectorAll('.grading-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.index, 10);
        initPuzzle(index);
      });
    });

    // Student tab click handlers
    overlay.querySelectorAll('.student-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const index = parseInt(tab.dataset.index, 10);
        switchStudent(index);
      });
    });
  }

  // Keyboard navigation
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      initPuzzle(currentIndex - 1);
    } else if (e.key === 'ArrowRight' && currentIndex < puzzles.length - 1) {
      initPuzzle(currentIndex + 1);
    } else if (e.key === 'r' || e.key === 'R') {
      resetPuzzle();
    } else if (e.key === 'h' || e.key === 'H') {
      showHint();
    } else if (e.key === 's' || e.key === 'S') {
      showSolution();
    } else if (gradingMode && (e.key === 'c' || e.key === 'C' || e.key === '1')) {
      markCorrect();
    } else if (gradingMode && (e.key === 'x' || e.key === 'X' || e.key === '0')) {
      markWrong();
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  function close() {
    document.removeEventListener('keydown', handleKeyDown);
    if (boardInstance) {
      boardInstance.destroy();
    }
    style.remove();
    overlay.remove();

    // Call onGraded callback to refresh the list
    if (gradingMode && onGraded) {
      const results = students.map((student, i) => ({
        studentId: student.id,
        score: studentResults[i].filter(r => r === true).length,
        total: puzzles.length
      }));
      onGraded(results);
    }
  }

  // Initialize
  document.body.appendChild(overlay);
  initPuzzle(0);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

export default openPuzzlePlayer;
