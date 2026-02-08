/**
 * Chess Quiz Composer - Main Application Entry Point
 *
 * Refactored to use server API instead of client-side database
 */

import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { apiClient, ApiError } from './api/ApiClient.js';
import { getRandomPuzzles } from './data/samplePuzzles.js';
import { showReportDialog } from './reports/ReportDialog.js';
import { showAdminPanel, renderAdminPage } from './reports/AdminPanel.js';
import { showExercisePanel, renderExercisePage } from './exercises/ExercisePanel.js';
import { authManager } from './auth/AuthManager.js';
import { renderLoginView } from './auth/LoginView.js';
import { renderStudentDashboard } from './auth/StudentDashboard.js';
import { ViewRouter } from './core/ViewRouter.js';
import { renderUsersPage } from './auth/UserManagementPanel.js';

class ChessQuizComposer {
  constructor() {
    this.puzzles = [];
    this.boardInstances = [];
    this.apiClient = apiClient;
    this.initializeUI();
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      this.showLoading('Connecting to server...');

      // Fetch theme stats from server
      const stats = await this.apiClient.getStats();

      // Populate theme selector
      await this.populateThemeSelector();

      this.hideLoading();
      this.showMessage(`Ready! ${stats.totalPuzzles.toLocaleString()} puzzles available.`, 'success');

    } catch (error) {
      console.error('Initialization error:', error);
      this.hideLoading();

      if (error instanceof ApiError && error.status === 0) {
        this.showError('Cannot connect to server. Please ensure the server is running.');
      } else {
        this.showError('Failed to initialize. Please refresh the page.');
      }
    }
  }

  /**
   * Initialize UI event listeners
   */
  initializeUI() {
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.handleGenerate());
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExport());
    }
  }

  /**
   * Populate theme selector with themes from API
   */
  async populateThemeSelector() {
    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;

    try {
      const stats = await this.apiClient.getStats();
      const themeCounts = new Map(stats.themes.map(t => [t.theme, t.count]));

      // Theme categories
      const themeCategories = {
        'Checkmate Patterns': [
          'backrankmate', 'smotheredmate', 'arabianmate', 'anastasiasmate',
          'doublebishopmate', 'dovetailmate', 'hookmate', 'operamate',
          'pillsburysmate', 'bodenmate', 'matein1', 'matein2', 'matein3'
        ],
        'Tactical Motifs': [
          'fork', 'pin', 'skewer', 'discoveredattack', 'deflection',
          'attraction', 'sacrifice', 'hangingpiece', 'capturingdefender',
          'trappedpiece', 'xrayattack', 'intermezzo', 'zwischenzug'
        ],
        'Advanced Tactics': [
          'zugzwang', 'perpetualcheck', 'clearance', 'interference',
          'doublecheck', 'discoveredcheck', 'quietmove', 'defensivemove',
          'exposedking', 'kingsideattack', 'queensideattack', 'promotion',
          'underpromotion', 'enpassant', 'master', 'brilliant'
        ],
        'Endgames': [
          'endgame', 'queenendgame', 'rookendgame', 'bishopendgame',
          'knightendgame', 'queenrookendgame', 'pawnendgame', 'advancedpawn'
        ],
        'Game Phases': [
          'opening', 'middlegame', 'short', 'long', 'verylong'
        ]
      };

      themeSelect.innerHTML = '';

      // All Themes option
      const allOption = document.createElement('option');
      allOption.value = '';
      allOption.textContent = `All Themes (${stats.totalPuzzles.toLocaleString()} puzzles)`;
      themeSelect.appendChild(allOption);

      // Available themes from server
      const availableThemes = stats.themes.map(t => t.theme);

      Object.entries(themeCategories).forEach(([category, themeIds]) => {
        const availableInCategory = themeIds.filter(id => availableThemes.includes(id));

        if (availableInCategory.length > 0) {
          const optgroup = document.createElement('optgroup');
          optgroup.label = category;

          const sortedThemes = availableInCategory.sort((a, b) => {
            const countA = themeCounts.get(a) || 0;
            const countB = themeCounts.get(b) || 0;
            return countB - countA;
          });

          sortedThemes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme;
            const count = themeCounts.get(theme) || 0;
            option.textContent = `${this.formatThemeName(theme)} (${count.toLocaleString()})`;
            optgroup.appendChild(option);
          });

          themeSelect.appendChild(optgroup);
        }
      });

      // Other themes
      const categorizedThemes = new Set(Object.values(themeCategories).flat());
      const otherThemes = availableThemes.filter(t => !categorizedThemes.has(t));

      if (otherThemes.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Other Themes';

        otherThemes.sort((a, b) => {
          const countA = themeCounts.get(a) || 0;
          const countB = themeCounts.get(b) || 0;
          return countB - countA;
        }).forEach(theme => {
          const option = document.createElement('option');
          option.value = theme;
          const count = themeCounts.get(theme) || 0;
          option.textContent = `${this.formatThemeName(theme)} (${count.toLocaleString()})`;
          optgroup.appendChild(option);
        });

        themeSelect.appendChild(optgroup);
      }
    } catch (error) {
      console.error('Failed to populate themes:', error);
    }
  }

  /**
   * Format theme name for display
   */
  formatThemeName(themeId) {
    const specialCases = {
      'matein1': 'Mate in 1',
      'matein2': 'Mate in 2',
      'matein3': 'Mate in 3',
      'matein4': 'Mate in 4',
      'matein5': 'Mate in 5',
      'backrankmate': 'Back Rank Mate',
      'smotheredmate': 'Smothered Mate',
      'anastasiasmate': "Anastasia's Mate",
      'arabianmate': 'Arabian Mate',
      'doublebishopmate': 'Double Bishop Mate',
      'dovetailmate': 'Dovetail Mate',
      'hookmate': 'Hook Mate',
      'operamate': 'Opera Mate',
      'pillsburysmate': "Pillsbury's Mate",
      'bodenmate': "Boden's Mate",
      'fork': 'Fork',
      'knightfork': 'Knight Fork',
      'royalfork': 'Royal Fork',
      'pin': 'Pin',
      'skewer': 'Skewer',
      'discoveredattack': 'Discovered Attack',
      'discoveredcheck': 'Discovered Check',
      'doublecheck': 'Double Check',
      'deflection': 'Deflection',
      'attraction': 'Attraction',
      'trappedpiece': 'Trapped Piece',
      'sacrifice': 'Sacrifice',
      'queensacrifice': 'Queen Sacrifice',
      'rooksacrifice': 'Rook Sacrifice',
      'defensivemove': 'Defensive Move',
      'clearance': 'Clearance',
      'interference': 'Interference',
      'zugzwang': 'Zugzwang',
      'perpetualcheck': 'Perpetual Check',
      'hangingpiece': 'Hanging Piece',
      'capturingdefender': 'Capturing Defender',
      'exposedking': 'Exposed King',
      'kingsideattack': 'Kingside Attack',
      'queensideattack': 'Queenside Attack',
      'promotion': 'Promotion',
      'underpromotion': 'Underpromotion',
      'enpassant': 'En Passant',
      'xrayattack': 'X-Ray Attack',
      'quietmove': 'Quiet Move',
      'intermezzo': 'Intermezzo',
      'zwischenzug': 'Zwischenzug',
      'queenendgame': 'Queen Endgame',
      'rookendgame': 'Rook Endgame',
      'bishopendgame': 'Bishop Endgame',
      'knightendgame': 'Knight Endgame',
      'queenrookendgame': 'Queen & Rook Endgame',
      'pawnendgame': 'Pawn Endgame',
      'advancedpawn': 'Advanced Pawn',
      'middlegame': 'Middlegame',
      'endgame': 'Endgame',
      'opening': 'Opening',
      'short': 'Short Puzzle',
      'long': 'Long Puzzle',
      'verylong': 'Very Long Puzzle',
      'master': 'Master-level',
      'brilliant': 'Brilliant Move',
      'crushing': 'Crushing Move'
    };

    if (!themeId) return 'Mixed Themes';

    const lower = themeId.toLowerCase();
    if (specialCases[lower]) return specialCases[lower];

    return themeId
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Handle generate puzzles button click
   */
  async handleGenerate() {
    const themeSelect = document.getElementById('theme-select');
    const countInput = document.getElementById('puzzle-count');
    const ratingRangeSelect = document.getElementById('rating-range');

    const theme = themeSelect.value || null;
    const count = parseInt(countInput.value);
    const ratingRange = ratingRangeSelect.value;

    if (count < 1 || count > 20) {
      this.showError('Please enter a number between 1 and 20');
      return;
    }

    let minRating = 1000;
    let maxRating = 3000;
    if (ratingRange) {
      const [min, max] = ratingRange.split('-').map(Number);
      minRating = min;
      maxRating = max || 3000;
    }

    try {
      const themeName = theme ? this.formatThemeName(theme) : 'All Themes';
      const ratingText = ratingRange ? ` (${ratingRange} rating)` : '';
      this.showLoading(`Generating ${count} puzzles for ${themeName}${ratingText}...`);

      // Generate puzzles via API
      const puzzleData = await this.apiClient.generatePuzzles({
        theme,
        count,
        minRating,
        maxRating,
        minPopularity: 80
      });

      this.puzzles = this.processPuzzles(puzzleData, theme);

      this.hideLoading();
      this.renderPuzzles();

      document.getElementById('export-btn').disabled = false;

    } catch (error) {
      console.error('Generate error:', error);
      this.hideLoading();

      if (error instanceof ApiError) {
        this.showError(error.message);
      } else {
        this.showError('Failed to generate puzzles. Is the server running?');
      }
    }
  }

  /**
   * Process puzzles from API response
   */
  processPuzzles(puzzleData, selectedTheme) {
    return puzzleData.map((puzzle, i) => {
      const chess = new Chess(puzzle.fen);
      const sideInPosition = chess.turn();
      const puzzleTheme = selectedTheme || (puzzle.themes && puzzle.themes[0]) || null;

      return {
        id: puzzle.id || `puzzle_${Date.now()}_${i}`,
        fen: puzzle.fen,
        fenAfterOpponent: puzzle.fenAfterOpponent || puzzle.fen,
        theme: puzzleTheme,
        themeName: this.formatThemeName(puzzleTheme),
        opponentMove: puzzle.opponentMoveSAN,
        solution: puzzle.solutionSAN || puzzle.solution,
        solutionLine: puzzle.solutionLine || [],
        evaluation: {
          isMate: true,
          mateIn: puzzle.mateIn,
          bestMove: puzzle.solution
        },
        sideToMove: sideInPosition === 'w' ? 'White' : 'Black',
        sideToFind: sideInPosition === 'w' ? 'Black' : 'White',
        mateIn: puzzle.mateIn,
        rating: puzzle.rating,
        popularity: puzzle.popularity
      };
    });
  }

  /**
   * Render puzzles to the DOM
   */
  renderPuzzles() {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    this.puzzles.forEach((puzzle, index) => {
      const puzzleCard = this.createPuzzleCard(puzzle, index + 1);
      resultsContainer.appendChild(puzzleCard);
    });

    setTimeout(() => {
      this.initializeBoards();
    }, 100);
  }

  /**
   * Create puzzle card HTML element
   */
  createPuzzleCard(puzzle, number) {
    const card = document.createElement('div');
    card.className = 'puzzle-card';
    const solutionMoves = puzzle.solutionLine.slice(1).filter((_, i) => i % 2 === 0);
    const fullSolutionText = solutionMoves.length > 0 ? solutionMoves.join(' → ') : (puzzle.solution || 'N/A');

    let difficultyStars = '⭐';
    let difficultyLabel = 'Beginner';
    const rating = puzzle.rating || 1200;

    if (rating >= 2500) {
      difficultyStars = '⭐⭐⭐⭐';
      difficultyLabel = 'Expert';
    } else if (rating >= 2000) {
      difficultyStars = '⭐⭐⭐';
      difficultyLabel = 'Advanced';
    } else if (rating >= 1500) {
      difficultyStars = '⭐⭐';
      difficultyLabel = 'Intermediate';
    }

    card.innerHTML = `
      <div class="puzzle-header">
        <span class="puzzle-number">Puzzle #${number}</span>
        <span class="puzzle-theme">${puzzle.themeName}</span>
        ${puzzle.rating ? `<span class="puzzle-difficulty" title="Rating: ${rating}">${difficultyStars} ${difficultyLabel}</span>` : ''}
        <div class="puzzle-header-actions">
          <button class="report-btn" data-puzzle-id="${puzzle.id}" data-puzzle-theme="${puzzle.themeName}" title="Report issue">⚠️</button>
          <button class="fullscreen-btn" data-puzzle-id="${puzzle.id}" title="View full screen">⛶</button>
        </div>
      </div>

      <div class="board-container">
        <div id="board-${puzzle.id}" style="width: 300px; height: 300px;"></div>
      </div>

      ${puzzle.opponentMove ?
        `<div class="opponent-move-indicator">
          <button class="animate-opponent-btn" data-puzzle-id="${puzzle.id}">
            ▶️ Play Opponent's Move: <code>${puzzle.opponentMove}</code>
          </button>
        </div>` : ''}

      <div class="puzzle-meta">
        <div class="puzzle-meta-item">
          <strong>Position:</strong> ${puzzle.sideToMove} just moved
        </div>
        <div class="puzzle-meta-item">
          <strong>You are:</strong> ${puzzle.sideToFind}
        </div>
        ${puzzle.mateIn ?
          `<div class="puzzle-meta-item">
            <strong>Find mate in:</strong> ${puzzle.mateIn}
          </div>` : ''}
        ${puzzle.rating ?
          `<div class="puzzle-meta-item">
            <strong>Rating:</strong> ${puzzle.rating}
          </div>` : ''}
        <div class="puzzle-instructions">
          <strong>💡 Instructions:</strong> ${puzzle.opponentMove ?
            'Click "Play Opponent\'s Move" first, then drag your pieces to solve!' :
            'Drag your pieces to find the winning move!'}
        </div>
      </div>

      <div class="puzzle-solution">
        <div class="puzzle-meta-item">
          <strong>Solution:</strong> <code class="solution-move" style="filter: blur(8px); user-select: none;">${fullSolutionText}</code>
        </div>
        <button class="show-solution-btn" data-puzzle-id="${puzzle.id}">
          Show Solution
        </button>
      </div>

      <div class="puzzle-fen">
        <span class="fen-label">FEN:</span>
        <div style="font-size: 0.8em; word-break: break-all;">${puzzle.fen}</div>
        <div class="fen-buttons">
          <button class="copy-fen" data-fen="${puzzle.fen}">Copy FEN</button>
          <button class="lichess-analyze" data-fen="${puzzle.fen}">📊 Analyze on Lichess</button>
        </div>
      </div>
    `;

    // Event listeners
    const copyBtn = card.querySelector('.copy-fen');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(puzzle.fen);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy FEN'; }, 2000);
    });

    const lichessBtn = card.querySelector('.lichess-analyze');
    lichessBtn.addEventListener('click', () => {
      const fenEncoded = encodeURIComponent(puzzle.fen);
      window.open(`https://lichess.org/analysis/fromPosition/${fenEncoded}`, '_blank');
    });

    const animateBtn = card.querySelector('.animate-opponent-btn');
    if (animateBtn) {
      animateBtn.addEventListener('click', () => this.animateOpponentMove(puzzle.id));
    }

    const solutionBtn = card.querySelector('.show-solution-btn');
    if (solutionBtn) {
      solutionBtn.addEventListener('click', () => this.showSolution(puzzle.id));
    }

    const fullscreenBtn = card.querySelector('.fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.showFullscreen(puzzle.id));
    }

    const reportBtn = card.querySelector('.report-btn');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        this.handleReport(puzzle.id, puzzle.themeName);
      });
    }

    return card;
  }

  /**
   * Initialize chess boards
   */
  initializeBoards() {
    this.boardInstances = [];

    this.puzzles.forEach((puzzle) => {
      const boardElement = document.getElementById(`board-${puzzle.id}`);
      if (boardElement) {
        try {
          const chess = new Chess(puzzle.fen);

          const puzzleState = {
            currentMoveIndex: 0,
            chess: chess,
            isComplete: false,
            opponentMoveShown: false
          };

          const moveHandler = (orig, dest) => {
            this.handleMove(puzzle.id, puzzleState, orig, dest, ground);
          };

          const fenTurn = chess.turn();
          const solverColor = puzzle.opponentMove
            ? (fenTurn === 'w' ? 'black' : 'white')
            : (fenTurn === 'w' ? 'white' : 'black');

          const ground = Chessground(boardElement, {
            fen: puzzle.fen,
            orientation: solverColor,
            coordinates: true,
            movable: {
              free: false,
              color: fenTurn === 'w' ? 'white' : 'black',
              dests: this.getDestinationMap(chess),
              events: { after: moveHandler }
            },
            draggable: { enabled: true, showGhost: true, distance: 0 },
            animation: { enabled: true, duration: 200 },
            highlight: { lastMove: true, check: true },
            selectable: { enabled: true }
          });

          this.boardInstances.push({
            puzzleId: puzzle.id,
            board: ground,
            state: puzzleState,
            moveHandler: moveHandler
          });
        } catch (error) {
          console.error('Error creating board:', error);
        }
      }
    });
  }

  /**
   * Generate legal move destinations map
   */
  getDestinationMap(chess) {
    const dests = new Map();
    const moves = chess.moves({ verbose: true });

    moves.forEach(move => {
      if (!dests.has(move.from)) {
        dests.set(move.from, []);
      }
      dests.get(move.from).push(move.to);
    });

    return dests;
  }

  /**
   * Handle a move made by the user
   */
  handleMove(puzzleId, puzzleState, source, target, ground) {
    const puzzle = this.puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return;

    const expectedMoveIndex = puzzleState.currentMoveIndex;
    const solutionLine = puzzle.solutionLine;
    const expectedMove = solutionLine[expectedMoveIndex];

    let move = null;
    try {
      move = puzzleState.chess.move({
        from: source,
        to: target,
        promotion: 'q'
      });
    } catch (error) {
      this.showFeedback(puzzleId, 'illegal', 'Illegal move!');
      return;
    }

    if (move.san === expectedMove) {
      puzzleState.currentMoveIndex++;

      const newColor = puzzleState.chess.turn() === 'w' ? 'white' : 'black';
      ground.set({
        fen: puzzleState.chess.fen(),
        movable: {
          color: newColor,
          dests: this.getDestinationMap(puzzleState.chess)
        }
      });

      if (puzzleState.currentMoveIndex >= solutionLine.length) {
        puzzleState.isComplete = true;
        ground.set({ movable: { color: undefined } });
        this.showFeedback(puzzleId, 'complete', 'Puzzle solved! Excellent!');
        this.markPuzzleComplete(puzzleId);
        return;
      }

      this.showFeedback(puzzleId, 'correct', `✓ Correct! ${move.san}`);

      if (puzzleState.currentMoveIndex < solutionLine.length) {
        setTimeout(() => {
          this.playOpponentMove(puzzleId, puzzleState, ground);
        }, 800);
      }
    } else {
      puzzleState.chess.undo();
      const currentColor = puzzleState.chess.turn() === 'w' ? 'white' : 'black';
      const currentDests = this.getDestinationMap(puzzleState.chess);
      const boardInstance = this.boardInstances.find(b => b.puzzleId === puzzleId);

      requestAnimationFrame(() => {
        ground.set({
          fen: puzzleState.chess.fen(),
          turnColor: currentColor,
          check: puzzleState.chess.inCheck(),
          movable: {
            free: false,
            color: currentColor,
            dests: currentDests,
            showDests: true,
            events: { after: boardInstance?.moveHandler }
          }
        });
      });
      this.showFeedback(puzzleId, 'incorrect', '✗ Not quite! Keep trying.');
    }
  }

  /**
   * Play the opponent's move automatically
   */
  playOpponentMove(puzzleId, puzzleState, ground) {
    const puzzle = this.puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return;

    const solutionLine = puzzle.solutionLine;
    if (puzzleState.currentMoveIndex >= solutionLine.length) return;

    const opponentMoveSAN = solutionLine[puzzleState.currentMoveIndex];
    const boardInstance = this.boardInstances.find(b => b.puzzleId === puzzleId);

    try {
      const move = puzzleState.chess.move(opponentMoveSAN);
      if (move) {
        const newColor = puzzleState.chess.turn() === 'w' ? 'white' : 'black';
        const newDests = this.getDestinationMap(puzzleState.chess);

        puzzleState.currentMoveIndex++;

        requestAnimationFrame(() => {
          ground.set({
            fen: puzzleState.chess.fen(),
            lastMove: [move.from, move.to],
            check: puzzleState.chess.inCheck(),
            turnColor: newColor,
            movable: {
              color: newColor,
              dests: newDests,
              showDests: true,
              events: { after: boardInstance?.moveHandler }
            }
          });
        });

        this.showFeedback(puzzleId, 'opponent', `Opponent played: ${move.san}`);

        if (puzzleState.currentMoveIndex >= solutionLine.length) {
          puzzleState.isComplete = true;
          setTimeout(() => {
            this.showFeedback(puzzleId, 'complete', 'Puzzle solved! Excellent!');
            this.markPuzzleComplete(puzzleId);
          }, 1000);
        }
      }
    } catch (error) {
      // Silently handle error
    }
  }

  /**
   * Animate the opponent's move on the board
   */
  animateOpponentMove(puzzleId) {
    const puzzle = this.puzzles.find(p => p.id === puzzleId);
    if (!puzzle || !puzzle.opponentMove) return;

    const boardInstance = this.boardInstances.find(b => b.puzzleId === puzzleId);
    if (!boardInstance) return;

    try {
      const opponentMoveSAN = puzzle.solutionLine[0];
      const move = boardInstance.state.chess.move(opponentMoveSAN);
      boardInstance.state.currentMoveIndex = 1;
      boardInstance.state.opponentMoveShown = true;

      const newColor = boardInstance.state.chess.turn() === 'w' ? 'white' : 'black';
      const newDests = this.getDestinationMap(boardInstance.state.chess);

      requestAnimationFrame(() => {
        boardInstance.board.set({
          fen: boardInstance.state.chess.fen(),
          lastMove: move ? [move.from, move.to] : undefined,
          check: boardInstance.state.chess.inCheck(),
          turnColor: newColor,
          movable: {
            free: false,
            color: newColor,
            dests: newDests,
            showDests: true,
            events: { after: boardInstance.moveHandler }
          }
        });
      });

      const btn = document.querySelector(`[data-puzzle-id="${puzzleId}"].animate-opponent-btn`);
      if (btn) {
        btn.disabled = true;
        btn.textContent = `✓ Opponent played: ${puzzle.opponentMove}`;
        btn.style.background = '#6c757d';
      }

      const card = btn?.closest('.puzzle-card');
      if (card) {
        const solutionArea = card.querySelector('.puzzle-solution');
        if (solutionArea) solutionArea.style.display = 'block';

        const instructions = card.querySelector('.puzzle-instructions');
        if (instructions) {
          instructions.innerHTML = '<strong>💡 Instructions:</strong> Now drag your pieces to find the winning move!';
        }
      }

      this.showFeedback(puzzleId, 'opponent', `Opponent played: ${puzzle.opponentMove}`);
    } catch (error) {
      // Silently handle error
    }
  }

  /**
   * Show feedback message for a move
   */
  showFeedback(puzzleId, type, message) {
    const card = document.querySelector(`[data-puzzle-id="${puzzleId}"]`)?.closest('.puzzle-card');
    if (!card) return;

    let feedbackArea = card.querySelector('.move-feedback');
    if (!feedbackArea) {
      feedbackArea = document.createElement('div');
      feedbackArea.className = 'move-feedback';
      const boardContainer = card.querySelector('.board-container');
      if (boardContainer) boardContainer.appendChild(feedbackArea);
    }

    feedbackArea.className = `move-feedback feedback-${type}`;
    feedbackArea.textContent = message;
  }

  /**
   * Mark puzzle as complete
   */
  markPuzzleComplete(puzzleId) {
    const card = document.querySelector(`[data-puzzle-id="${puzzleId}"]`)?.closest('.puzzle-card');
    if (!card || card.classList.contains('puzzle-complete')) return;

    card.classList.add('puzzle-complete');

    const solutionBtn = card.querySelector('.show-solution-btn');
    if (solutionBtn) solutionBtn.style.display = 'none';

    const solutionArea = card.querySelector('.puzzle-solution');
    if (solutionArea) {
      solutionArea.style.display = 'block';
      const solutionMove = solutionArea.querySelector('.solution-move');
      if (solutionMove) solutionMove.style.filter = 'none';
    }
  }

  /**
   * Show the solution
   */
  showSolution(puzzleId) {
    const btn = document.querySelector(`[data-puzzle-id="${puzzleId}"].show-solution-btn`);
    if (!btn) return;

    const solutionMove = btn.closest('.puzzle-solution').querySelector('.solution-move');
    if (solutionMove) {
      solutionMove.style.filter = 'none';
      solutionMove.style.userSelect = 'text';
      solutionMove.style.background = '#28a745';
      solutionMove.style.color = 'white';
      solutionMove.style.padding = '4px 8px';
      solutionMove.style.borderRadius = '4px';
      solutionMove.style.fontWeight = 'bold';
    }

    btn.textContent = '✓ Solution Revealed';
    btn.disabled = true;
    btn.style.background = '#28a745';
    btn.style.color = 'white';
  }

  /**
   * Show puzzle in fullscreen mode
   */
  showFullscreen(puzzleId) {
    const puzzle = this.puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return;

    const solutionMoves = puzzle.solutionLine.slice(1).filter((_, i) => i % 2 === 0);
    const fullSolutionText = solutionMoves.length > 0 ? solutionMoves.join(' → ') : (puzzle.solution || 'N/A');

    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-overlay';
    overlay.innerHTML = `
      <div class="fullscreen-content">
        <button class="fullscreen-close">✕</button>

        <div class="fullscreen-header">
          <h2>${puzzle.themeName}</h2>
          <div class="fullscreen-controls">
            <button class="flip-board-btn" data-fullscreen-id="${puzzle.id}">🔄 Flip Board</button>
          </div>
        </div>

        <div class="fullscreen-board-container">
          <div id="fullscreen-board-${puzzle.id}" style="width: 600px; height: 600px;"></div>
        </div>

        ${puzzle.opponentMove ? `
          <div class="fullscreen-actions">
            <button class="fullscreen-animate-btn" data-fullscreen-id="${puzzle.id}">
              ▶️ Play Opponent's Move: <code>${puzzle.opponentMove}</code>
            </button>
          </div>
        ` : `
          <div class="fullscreen-actions">
            <div class="no-opponent-move">
              <em>No opponent move - it's your turn to find the winning move!</em>
            </div>
          </div>
        `}

        <div class="fullscreen-meta">
          <div class="meta-row">
            <span><strong>Position:</strong> ${puzzle.sideToMove} just moved</span>
            <span><strong>You are:</strong> ${puzzle.sideToFind}</span>
          </div>
          <div class="meta-row">
            ${puzzle.mateIn ? `<span><strong>Find mate in:</strong> ${puzzle.mateIn}</span>` : ''}
            ${puzzle.rating ? `<span><strong>Rating:</strong> ${puzzle.rating}</span>` : ''}
          </div>
        </div>

        <div class="fullscreen-solution">
          <div class="solution-text">
            <strong>Solution:</strong>
            <code class="fullscreen-solution-move" style="filter: blur(8px); user-select: none;">${fullSolutionText}</code>
          </div>
          <button class="fullscreen-show-solution-btn" data-fullscreen-id="${puzzle.id}">
            Show Solution
          </button>
        </div>

        <div class="fullscreen-fen">
          <div class="fen-text">
            <strong>FEN:</strong>
            <div style="font-size: 0.9em; word-break: break-all; margin-top: 5px;">${puzzle.fen}</div>
          </div>
          <div class="fen-buttons">
            <button class="fullscreen-copy-fen" data-fen="${puzzle.fen}">Copy FEN</button>
            <button class="fullscreen-lichess-analyze" data-fen="${puzzle.fen}">📊 Analyze on Lichess</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let boardInstance = null;
    const chess = new Chess(puzzle.fen);
    const fenTurn = chess.turn();
    let boardOrientation = puzzle.opponentMove
      ? (fenTurn === 'w' ? 'black' : 'white')
      : (fenTurn === 'w' ? 'white' : 'black');

    const fullscreenPuzzleState = {
      currentMoveIndex: 0,
      chess: chess,
      isComplete: false,
      opponentMoveShown: false
    };

    const feedbackArea = document.createElement('div');
    feedbackArea.className = 'move-feedback';

    const fullscreenMoveHandler = (orig, dest) => {
      this.handleFullscreenMove(puzzle, fullscreenPuzzleState, orig, dest, boardInstance, feedbackArea, fullscreenMoveHandler);
    };

    setTimeout(() => {
      const boardElement = document.getElementById(`fullscreen-board-${puzzle.id}`);
      if (boardElement) {
        boardInstance = Chessground(boardElement, {
          fen: puzzle.fen,
          orientation: boardOrientation,
          coordinates: true,
          movable: {
            free: false,
            color: fullscreenPuzzleState.chess.turn() === 'w' ? 'white' : 'black',
            dests: this.getDestinationMap(fullscreenPuzzleState.chess),
            events: { after: fullscreenMoveHandler }
          },
          draggable: { enabled: true, showGhost: true },
          animation: { enabled: true, duration: 200 },
          highlight: { lastMove: true, check: true },
          selectable: { enabled: true }
        });

        const boardContainer = overlay.querySelector('.fullscreen-board-container');
        if (boardContainer) boardContainer.appendChild(feedbackArea);

        const flipBtn = overlay.querySelector('.flip-board-btn');
        if (flipBtn) {
          flipBtn.addEventListener('click', () => {
            boardOrientation = boardOrientation === 'white' ? 'black' : 'white';
            boardInstance.set({ orientation: boardOrientation });
          });
        }
      }
    }, 100);

    // Close handlers
    const closeOverlay = () => {
      if (fullscreenPuzzleState.currentMoveIndex > 0 || fullscreenPuzzleState.isComplete) {
        this.syncFullscreenToCard(puzzle.id, fullscreenPuzzleState);
      }
      if (boardInstance && typeof boardInstance.destroy === 'function') {
        boardInstance.destroy();
      }
      document.body.removeChild(overlay);
    };

    overlay.querySelector('.fullscreen-close').addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });

    // Animate opponent move
    const animateBtn = overlay.querySelector('.fullscreen-animate-btn');
    if (animateBtn) {
      animateBtn.addEventListener('click', () => {
        if (boardInstance && puzzle.fenAfterOpponent) {
          const opponentMoveSAN = puzzle.solutionLine[0];
          const move = fullscreenPuzzleState.chess.move(opponentMoveSAN);
          fullscreenPuzzleState.currentMoveIndex = 1;
          fullscreenPuzzleState.opponentMoveShown = true;

          const newColor = fullscreenPuzzleState.chess.turn() === 'w' ? 'white' : 'black';
          const newDests = this.getDestinationMap(fullscreenPuzzleState.chess);

          boardInstance.set({
            fen: fullscreenPuzzleState.chess.fen(),
            lastMove: move ? [move.from, move.to] : undefined,
            turnColor: newColor,
            movable: {
              free: false,
              color: newColor,
              dests: newDests,
              showDests: true,
              events: { after: fullscreenMoveHandler }
            }
          });

          animateBtn.disabled = true;
          animateBtn.textContent = `✓ Opponent played: ${puzzle.opponentMove}`;
          animateBtn.style.background = '#6c757d';

          this.showFullscreenFeedback(feedbackArea, 'opponent', `Opponent played: ${puzzle.opponentMove}`);
        }
      });
    }

    // Solution button
    const solutionBtn = overlay.querySelector('.fullscreen-show-solution-btn');
    const solutionMove = overlay.querySelector('.fullscreen-solution-move');
    if (solutionBtn && solutionMove) {
      solutionBtn.addEventListener('click', () => {
        solutionMove.style.filter = 'none';
        solutionMove.style.userSelect = 'text';
        solutionMove.style.background = '#28a745';
        solutionMove.style.color = 'white';
        solutionMove.style.padding = '4px 8px';
        solutionMove.style.borderRadius = '4px';
        solutionMove.style.fontWeight = 'bold';
        solutionBtn.textContent = '✓ Solution Revealed';
        solutionBtn.disabled = true;
        solutionBtn.style.background = '#28a745';
        solutionBtn.style.color = 'white';
      });
    }

    // Copy FEN
    const copyFenBtn = overlay.querySelector('.fullscreen-copy-fen');
    if (copyFenBtn) {
      copyFenBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(puzzle.fen);
        const originalText = copyFenBtn.textContent;
        copyFenBtn.textContent = 'Copied!';
        copyFenBtn.style.background = '#28a745';
        setTimeout(() => {
          copyFenBtn.textContent = originalText;
          copyFenBtn.style.background = '';
        }, 2000);
      });
    }

    // Lichess analysis
    const lichessBtn = overlay.querySelector('.fullscreen-lichess-analyze');
    if (lichessBtn) {
      lichessBtn.addEventListener('click', () => {
        const fenEncoded = encodeURIComponent(puzzle.fen);
        window.open(`https://lichess.org/analysis/fromPosition/${fenEncoded}`, '_blank');
      });
    }
  }

  /**
   * Handle fullscreen move
   */
  handleFullscreenMove(puzzle, puzzleState, source, target, ground, feedbackArea, moveHandler) {
    const expectedMoveIndex = puzzleState.currentMoveIndex;
    const solutionLine = puzzle.solutionLine;
    const expectedMove = solutionLine[expectedMoveIndex];

    let move = null;
    try {
      move = puzzleState.chess.move({ from: source, to: target, promotion: 'q' });
    } catch (error) {
      this.showFullscreenFeedback(feedbackArea, 'illegal', 'Illegal move!');
      return;
    }

    if (move.san === expectedMove) {
      puzzleState.currentMoveIndex++;

      const newColor = puzzleState.chess.turn() === 'w' ? 'white' : 'black';
      ground.set({
        fen: puzzleState.chess.fen(),
        movable: { color: newColor, dests: this.getDestinationMap(puzzleState.chess) }
      });

      if (puzzleState.currentMoveIndex >= solutionLine.length) {
        puzzleState.isComplete = true;
        ground.set({ movable: { color: undefined } });
        this.showFullscreenFeedback(feedbackArea, 'complete', 'Puzzle solved! Excellent!');
        this.markPuzzleComplete(puzzle.id);
        return;
      }

      this.showFullscreenFeedback(feedbackArea, 'correct', `Correct! ${move.san}`);

      if (puzzleState.currentMoveIndex < solutionLine.length) {
        setTimeout(() => {
          this.playFullscreenOpponentMove(puzzle, puzzleState, ground, feedbackArea, moveHandler);
        }, 800);
      }
    } else {
      puzzleState.chess.undo();
      const currentColor = puzzleState.chess.turn() === 'w' ? 'white' : 'black';
      const currentDests = this.getDestinationMap(puzzleState.chess);

      requestAnimationFrame(() => {
        ground.set({
          fen: puzzleState.chess.fen(),
          turnColor: currentColor,
          check: puzzleState.chess.inCheck(),
          movable: {
            free: false,
            color: currentColor,
            dests: currentDests,
            showDests: true,
            events: { after: moveHandler }
          }
        });
      });
      this.showFullscreenFeedback(feedbackArea, 'incorrect', '✗ Not quite! Keep trying.');
    }
  }

  /**
   * Play opponent's move in fullscreen
   */
  playFullscreenOpponentMove(puzzle, puzzleState, ground, feedbackArea, moveHandler) {
    const solutionLine = puzzle.solutionLine;
    if (puzzleState.currentMoveIndex >= solutionLine.length) return;

    const opponentMoveSAN = solutionLine[puzzleState.currentMoveIndex];

    try {
      const move = puzzleState.chess.move(opponentMoveSAN);
      if (move) {
        const newColor = puzzleState.chess.turn() === 'w' ? 'white' : 'black';
        const newDests = this.getDestinationMap(puzzleState.chess);
        puzzleState.currentMoveIndex++;

        requestAnimationFrame(() => {
          ground.set({
            fen: puzzleState.chess.fen(),
            lastMove: [move.from, move.to],
            check: puzzleState.chess.inCheck(),
            turnColor: newColor,
            movable: {
              free: false,
              color: newColor,
              dests: newDests,
              showDests: true,
              events: { after: moveHandler }
            }
          });
        });

        this.showFullscreenFeedback(feedbackArea, 'opponent', `Opponent played: ${move.san}`);

        if (puzzleState.currentMoveIndex >= solutionLine.length) {
          puzzleState.isComplete = true;
          setTimeout(() => {
            this.showFullscreenFeedback(feedbackArea, 'complete', 'Puzzle solved! Excellent!');
            this.markPuzzleComplete(puzzle.id);
          }, 1000);
        }
      }
    } catch (error) {
      // Silently handle error
    }
  }

  showFullscreenFeedback(feedbackArea, type, message) {
    feedbackArea.className = `move-feedback feedback-${type}`;
    feedbackArea.textContent = message;
  }

  syncFullscreenToCard(puzzleId, fullscreenState) {
    const boardInstance = this.boardInstances.find(b => b.puzzleId === puzzleId);
    if (!boardInstance) return;

    const updatedState = {
      ...boardInstance.state,
      currentMoveIndex: fullscreenState.currentMoveIndex,
      isComplete: fullscreenState.isComplete,
      opponentMoveShown: fullscreenState.opponentMoveShown
    };

    const instanceIndex = this.boardInstances.findIndex(b => b.puzzleId === puzzleId);
    if (instanceIndex !== -1) {
      this.boardInstances[instanceIndex] = { ...this.boardInstances[instanceIndex], state: updatedState };
    }

    boardInstance.state.chess.load(fullscreenState.chess.fen());

    const newColor = boardInstance.state.chess.turn() === 'w' ? 'white' : 'black';
    boardInstance.board.set({
      fen: fullscreenState.chess.fen(),
      movable: {
        color: fullscreenState.isComplete ? undefined : newColor,
        dests: fullscreenState.isComplete ? new Map() : this.getDestinationMap(boardInstance.state.chess),
        events: { after: boardInstance.moveHandler }
      }
    });

    if (fullscreenState.opponentMoveShown) {
      const card = document.querySelector(`[data-puzzle-id="${puzzleId}"]`)?.closest('.puzzle-card');
      const btn = card?.querySelector('.animate-opponent-btn');
      if (btn && !btn.disabled) {
        const puzzle = this.puzzles.find(p => p.id === puzzleId);
        if (puzzle) {
          btn.disabled = true;
          btn.textContent = `✓ Opponent played: ${puzzle.opponentMove}`;
          btn.style.background = '#6c757d';
        }
      }
    }
  }

  /**
   * Handle export FEN list
   */
  handleExport() {
    if (this.puzzles.length === 0) {
      this.showError('No puzzles to export');
      return;
    }

    const fenList = this.puzzles.map((puzzle, index) =>
      `${index + 1}. ${puzzle.themeName}: ${puzzle.fen}`
    ).join('\n');

    const blob = new Blob([fenList], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-puzzles-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showMessage('FEN list exported successfully!', 'success');
  }

  /**
   * Handle report button click
   */
  handleReport(puzzleId, puzzleTheme) {
    showReportDialog(puzzleId, puzzleTheme, async (id, reason, notes) => {
      try {
        const result = await this.apiClient.reportPuzzle(id, reason, notes);
        if (result.success) {
          this.showMessage('Report submitted successfully', 'success');
        } else {
          throw new Error(result.error || 'Failed to submit report');
        }
      } catch (error) {
        this.showError(error.message);
        throw error;
      }
    });
  }

  // ==================== UI Helpers ====================

  showLoading(message = 'Loading...') {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.querySelector('p').textContent = message;
      loading.style.display = 'block';
    }
  }

  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  showMessage(message, type = 'info') {
    if (type === 'success' || type === 'info') {
      this.showToast(message, type);
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-weight: 600;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4000);
  }
}

// Initialize application with auth routing
document.addEventListener('DOMContentLoaded', async () => {
  apiClient.setAuthManager(authManager);

  if (!authManager.isAuthenticated()) {
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
      appLayout.innerHTML = '<div class="container"></div>';
      appLayout.style.display = 'block';
    }
    const container = document.querySelector('.container');
    renderLoginView(container, () => {
      window.location.reload();
    });
    return;
  }

  const user = authManager.getCurrentUser();

  if (user.role === 'student') {
    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
      appLayout.innerHTML = '<div class="container"></div>';
      appLayout.style.display = 'block';
    }
    const container = document.querySelector('.container');
    renderStudentDashboard(container, apiClient);
    return;
  }

  // Admin user: populate sidebar footer with user info
  const sidebarFooter = document.getElementById('sidebar-footer');
  if (sidebarFooter) {
    const initial = (user.username || 'A').charAt(0).toUpperCase();
    sidebarFooter.innerHTML = `
      <div class="sidebar-user">
        <div class="sidebar-avatar">${escapeHtmlAttr(initial)}</div>
        <div>
          <div class="sidebar-username">${escapeHtmlAttr(user.username)}</div>
          <div class="sidebar-role">Admin</div>
        </div>
      </div>
      <button id="logout-btn" class="sidebar-logout-btn" title="Logout">
        <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span class="sidebar-label">Logout</span>
      </button>
    `;

    document.getElementById('logout-btn').addEventListener('click', () => {
      authManager.logout();
    });
  }

  // Add Users nav item to sidebar
  const dynamicNav = document.getElementById('sidebar-dynamic-nav');
  if (dynamicNav) {
    const usersBtn = document.createElement('button');
    usersBtn.id = 'users-btn';
    usersBtn.className = 'sidebar-nav-item';
    usersBtn.title = 'User Management';
    usersBtn.innerHTML = `
      <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      <span class="sidebar-label">Users</span>
    `;
    dynamicNav.appendChild(usersBtn);
  }

  const app = new ChessQuizComposer();
  await app.initialize();
  window.chessApp = app;

  // Set up ViewRouter
  const generateView = document.getElementById('view-generate');
  const viewContainer = document.getElementById('view-container');

  if (generateView && viewContainer) {
    const viewRouter = new ViewRouter({
      generateView,
      viewContainer,
      getBoards: () => app.boardInstances
    });

    app.viewRouter = viewRouter;

    // Wire sidebar nav buttons
    const navGenerate = document.getElementById('nav-generate');
    if (navGenerate) {
      navGenerate.addEventListener('click', () => {
        viewRouter.navigate('generate');
      });
    }

    const exercisesBtn = document.getElementById('exercises-btn');
    if (exercisesBtn) {
      exercisesBtn.addEventListener('click', () => {
        viewRouter.navigate('exercises', (container) => {
          return renderExercisePage(container, apiClient, () => app.puzzles);
        });
      });
    }

    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) {
      adminBtn.addEventListener('click', () => {
        viewRouter.navigate('admin', (container) => {
          return renderAdminPage(container, apiClient);
        });
      });
    }

    const usersBtnEl = document.getElementById('users-btn');
    if (usersBtnEl) {
      usersBtnEl.addEventListener('click', () => {
        viewRouter.navigate('users', (container) => {
          return renderUsersPage(container, apiClient);
        });
      });
    }
  }
});

function escapeHtmlAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
