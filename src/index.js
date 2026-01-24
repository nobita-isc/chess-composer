/**
 * Chess Quiz Composer - Main Application Entry Point
 */

import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { ChessEngine } from './core/ChessEngine.js';
import { getRandomPuzzles } from './data/samplePuzzles.js';
import { DatabaseGenerator } from './database/DatabaseGenerator.js';

class ChessQuizComposer {
  constructor() {
    this.engine = null;
    this.databaseGenerator = new DatabaseGenerator();
    this.puzzles = [];
    this.boardInstances = [];
    this.useDatabasePuzzles = true; // Flag to use database vs sample puzzles
    this.initializeUI();
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      // Show loading state
      this.showLoading('Downloading puzzle database...');

      // Try to load SQLite puzzle database
      try {
        // Update loading message as progress happens
        const updateLoading = (msg) => this.showLoading(msg);

        const dbLoaded = await this.databaseGenerator.initialize('/database/puzzles.db', updateLoading);
        if (dbLoaded) {
          this.useDatabasePuzzles = true;

          // Populate theme selector with all available themes
          this.populateThemeSelector();

          this.showMessage('Database ready! Puzzles load instantly now.', 'success');
        } else {
          throw new Error('Database failed to load');
        }
      } catch (dbError) {
        console.warn('Database failed to load, using sample puzzles:', dbError);
        this.useDatabasePuzzles = false;
        this.showMessage('Using sample puzzles (database unavailable)', 'info');
      }

      // Chess engine disabled (can be re-enabled later)
      this.engine = null;

      // Hide loading
      this.hideLoading();

    } catch (error) {
      console.error('Initialization error:', error);
      this.hideLoading();
      this.showError('Failed to initialize application. Please refresh the page.');
    }
  }

  /**
   * Initialize UI event listeners
   */
  initializeUI() {
    // Generate button
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.handleGenerate());
    }

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExport());
    }
  }

  /**
   * Populate theme selector with all available themes from database
   */
  populateThemeSelector() {
    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;

    // Get available themes from database
    const availableThemes = this.databaseGenerator.getAvailableThemes();

    // Get theme counts for sorting by popularity
    const stats = this.databaseGenerator.getStats();
    const themeCounts = new Map(stats.themes.map(t => [t.theme, t.count]));

    // Define theme categories
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

    // Clear existing options
    themeSelect.innerHTML = '';

    // Add "All Themes" option first
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = `All Themes (${stats.totalPuzzles.toLocaleString()} puzzles)`;
    themeSelect.appendChild(allOption);

    // Create categorized options
    Object.entries(themeCategories).forEach(([category, themeIds]) => {
      // Filter themes that exist in the database
      const availableInCategory = themeIds.filter(id => availableThemes.includes(id));

      if (availableInCategory.length > 0) {
        // Create optgroup
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;

        // Sort themes in this category by puzzle count
        const sortedCategoryThemes = availableInCategory.sort((a, b) => {
          const countA = themeCounts.get(a) || 0;
          const countB = themeCounts.get(b) || 0;
          return countB - countA;
        });

        // Add options to the group
        sortedCategoryThemes.forEach(theme => {
          const option = document.createElement('option');
          option.value = theme;
          const count = themeCounts.get(theme) || 0;
          option.textContent = `${this.formatThemeName(theme)} (${count.toLocaleString()})`;
          optgroup.appendChild(option);
        });

        themeSelect.appendChild(optgroup);
      }
    });

    // Add "Other Themes" category for uncategorized themes
    const categorizedThemes = new Set(
      Object.values(themeCategories).flat()
    );
    const otherThemes = availableThemes.filter(t => !categorizedThemes.has(t));

    if (otherThemes.length > 0) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = 'Other Themes';

      // Sort by popularity
      const sortedOtherThemes = otherThemes.sort((a, b) => {
        const countA = themeCounts.get(a) || 0;
        const countB = themeCounts.get(b) || 0;
        return countB - countA;
      });

      sortedOtherThemes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        const count = themeCounts.get(theme) || 0;
        option.textContent = `${this.formatThemeName(theme)} (${count.toLocaleString()})`;
        optgroup.appendChild(option);
      });

      themeSelect.appendChild(optgroup);
    }

  }

  /**
   * Format theme name for display (convert "backrankmate" to "Back Rank Mate")
   */
  formatThemeName(themeId) {
    // Special cases for known patterns
    const specialCases = {
      // Mate patterns
      'matein1': 'Mate in 1',
      'matein2': 'Mate in 2',
      'matein3': 'Mate in 3',
      'matein4': 'Mate in 4',
      'matein5': 'Mate in 5',
      'backrankmate': 'Back Rank Mate',
      'backRankMate': 'Back Rank Mate',
      'smotheredmate': 'Smothered Mate',
      'smotheredMate': 'Smothered Mate',
      'anastasiasmate': "Anastasia's Mate",
      'anastasiasMate': "Anastasia's Mate",
      'arabianmate': 'Arabian Mate',
      'arabanMate': 'Arabian Mate',
      'doubleBishopMate': 'Double Bishop Mate',
      'doublebishopmate': 'Double Bishop Mate',
      'dovetailmate': 'Dovetail Mate',
      'hookmate': 'Hook Mate',
      'operamate': 'Opera Mate',
      'pillsburysmate': "Pillsbury's Mate",
      'bodenmate': "Boden's Mate",
      'boden': "Boden's Mate",

      // Tactical motifs
      'fork': 'Fork',
      'knightfork': 'Knight Fork',
      'royalfork': 'Royal Fork',
      'pin': 'Pin',
      'pinning': 'Pin',
      'skewer': 'Skewer',
      'discoveredattack': 'Discovered Attack',
      'discoveredAttack': 'Discovered Attack',
      'discoveredcheck': 'Discovered Check',
      'doublecheck': 'Double Check',
      'doubleCheck': 'Double Check',
      'deflection': 'Deflection',
      'attraction': 'Attraction',
      'trappedpiece': 'Trapped Piece',
      'trapped': 'Trapped Piece',
      'sacrifice': 'Sacrifice',
      'queensacrifice': 'Queen Sacrifice',
      'rooksacrifice': 'Rook Sacrifice',
      'defensivemove': 'Defensive Move',
      'defensiveMove': 'Defensive Move',
      'clearance': 'Clearance',
      'interference': 'Interference',
      'zugzwang': 'Zugzwang',
      'perpetualcheck': 'Perpetual Check',
      'perpetualCheck': 'Perpetual Check',
      'hangingpiece': 'Hanging Piece',
      'hangingPiece': 'Hanging Piece',
      'capturingdefender': 'Capturing Defender',
      'capturingDefender': 'Capturing Defender',
      'exposedking': 'Exposed King',
      'exposedKing': 'Exposed King',
      'kingsideattack': 'Kingside Attack',
      'kingsideAttack': 'Kingside Attack',
      'queensideattack': 'Queenside Attack',
      'queensideAttack': 'Queenside Attack',
      'promotion': 'Promotion',
      'underpromotion': 'Underpromotion',
      'enpassant': 'En Passant',
      'enPassant': 'En Passant',
      'xrayattack': 'X-Ray Attack',
      'xRayAttack': 'X-Ray Attack',
      'quietmove': 'Quiet Move',
      'quietMove': 'Quiet Move',
      'intermezzo': 'Intermezzo',
      'zwischenzug': 'Zwischenzug',

      // Endgames
      'queenendgame': 'Queen Endgame',
      'rookendgame': 'Rook Endgame',
      'bishopendgame': 'Bishop Endgame',
      'knightendgame': 'Knight Endgame',
      'queenrookendgame': 'Queen & Rook Endgame',
      'pawnendgame': 'Pawn Endgame',
      'advancedpawn': 'Advanced Pawn',
      'advancedPawn': 'Advanced Pawn',

      // Game phases
      'middlegame': 'Middlegame',
      'endgame': 'Endgame',
      'opening': 'Opening',
      'short': 'Short Puzzle',
      'long': 'Long Puzzle',
      'verylong': 'Very Long Puzzle',

      // Special
      'master': 'Master-level',
      'brilliant': 'Brilliant Move',
      'crushing': 'Crushing Move',
      'crushingMove': 'Crushing Move'
    };

    const lower = themeId.toLowerCase();
    if (specialCases[lower]) {
      return specialCases[lower];
    }

    // Default: capitalize first letter and add spaces before capitals
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

    const theme = themeSelect.value || null;  // Empty string means "All Themes"
    const count = parseInt(countInput.value);
    const ratingRange = ratingRangeSelect.value;

    if (count < 1 || count > 20) {
      this.showError('Please enter a number between 1 and 20');
      return;
    }

    // Parse rating range
    let minRating = 1000;
    let maxRating = 3000;
    if (ratingRange) {
      const [min, max] = ratingRange.split('-').map(Number);
      minRating = min;
      maxRating = max || 3000;
    }

    try {
      const themeName = theme ? this.getThemeName(theme) : 'All Themes';
      const ratingText = ratingRange ? ` (${ratingRange} rating)` : '';
      this.showLoading(`Generating ${count} puzzles for ${themeName}${ratingText}...`);

      // Use setTimeout to allow the loading indicator to render before blocking query
      await new Promise(resolve => setTimeout(resolve, 50));

      // Generate puzzles with rating filter
      await this.generatePuzzles(theme, count, { minRating, maxRating });

      this.hideLoading();
      this.renderPuzzles();

      // Enable export button
      document.getElementById('export-btn').disabled = false;

    } catch (error) {
      console.error('Generate error:', error);
      this.hideLoading();
      this.showError('Failed to generate puzzles. Please try again.');
    }
  }

  /**
   * Generate puzzles for a specific theme
   */
  async generatePuzzles(theme, count, options = {}) {
    this.puzzles = [];

    let puzzleData;

    const {
      minRating = 1000,
      maxRating = 3000,
      minPopularity = 80
    } = options;

    // Try to use database first
    if (this.useDatabasePuzzles && this.databaseGenerator.initialized) {
      try {
        puzzleData = await this.databaseGenerator.generatePuzzles(theme, count, {
          minRating,
          maxRating,
          minPopularity
        });
      } catch (error) {
        console.warn('Database generation failed, falling back to samples:', error);
        puzzleData = getRandomPuzzles(theme, count);
      }
    } else {
      // Fallback to sample puzzles
      puzzleData = getRandomPuzzles(theme, count);
    }

    // Process each puzzle
    for (let i = 0; i < puzzleData.length; i++) {
      const puzzleInfo = puzzleData[i];
      const fen = puzzleInfo.fen;

      // Validate position
      try {
        const chess = new Chess(fen);

        // Analyze with engine (if available)
        let evaluation = null;
        if (this.engine) {
          try {
            evaluation = await this.engine.analyzeMate(fen, 10);
          } catch (engineError) {
            console.warn('Engine analysis failed:', engineError);
            // Use pre-computed values from puzzle database
            evaluation = {
              isMate: true,
              mateIn: puzzleInfo.mateIn,
              bestMove: puzzleInfo.solution
            };
          }
        } else {
          // Use pre-computed values from puzzle database
          evaluation = {
            isMate: true,
            mateIn: puzzleInfo.mateIn,
            bestMove: puzzleInfo.solution
          };
        }

        const sideInPosition = chess.turn();

        this.puzzles.push({
          id: puzzleInfo.id || `puzzle_${Date.now()}_${i}`,
          fen: fen,  // Original FEN
          fenAfterOpponent: puzzleInfo.fenAfterOpponent || fen,
          theme: theme,
          themeName: this.getThemeName(theme),
          opponentMove: puzzleInfo.opponentMoveSAN,
          solution: puzzleInfo.solutionSAN || puzzleInfo.solution,  // First solution move
          solutionLine: puzzleInfo.solutionLine || [],  // Full solution line
          evaluation: evaluation,
          sideToMove: sideInPosition === 'w' ? 'White' : 'Black',  // Side shown in FEN
          sideToFind: sideInPosition === 'w' ? 'Black' : 'White',  // Side that finds the mate
          mateIn: puzzleInfo.mateIn,
          rating: puzzleInfo.rating,
          popularity: puzzleInfo.popularity
        });

      } catch (error) {
        console.error('Invalid FEN:', fen, error);
      }
    }
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

    // Initialize chessboards after DOM is ready
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
    const solutionMoves = puzzle.solutionLine.slice(1).filter((_, i) => i % 2 === 0);  // Only your moves
    const fullSolutionText = solutionMoves.length > 0 ? solutionMoves.join(' → ') : (puzzle.solution || 'N/A');

    // Determine difficulty based on rating
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
        <button class="fullscreen-btn" data-puzzle-id="${puzzle.id}" title="View full screen">⛶</button>
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

    // Add copy FEN functionality
    const copyBtn = card.querySelector('.copy-fen');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(puzzle.fen);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy FEN';
      }, 2000);
    });

    // Add Lichess analysis functionality
    const lichessBtn = card.querySelector('.lichess-analyze');
    lichessBtn.addEventListener('click', () => {
      const fenEncoded = encodeURIComponent(puzzle.fen);
      window.open(`https://lichess.org/analysis/${fenEncoded}`, '_blank');
    });

    // Add animate opponent move functionality
    const animateBtn = card.querySelector('.animate-opponent-btn');
    if (animateBtn) {
      animateBtn.addEventListener('click', () => this.animateOpponentMove(puzzle.id));
    }

    // Add show solution functionality
    const solutionBtn = card.querySelector('.show-solution-btn');
    if (solutionBtn) {
      solutionBtn.addEventListener('click', () => this.showSolution(puzzle.id));
    }

    // Add fullscreen functionality
    const fullscreenBtn = card.querySelector('.fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.showFullscreen(puzzle.id));
    }

    return card;
  }

  /**
   * Initialize chess boards
   */
  initializeBoards() {
    // Clear previous board instances
    this.boardInstances = [];

    this.puzzles.forEach((puzzle) => {
      const boardElement = document.getElementById(`board-${puzzle.id}`);
      if (boardElement) {
        try {
          // Initialize chess.js instance for this puzzle
          const chess = new Chess(puzzle.fen);

          // Track puzzle solving state
          const puzzleState = {
            currentMoveIndex: 0,  // Index in solution line
            chess: chess,
            isComplete: false,
            opponentMoveShown: false
          };

          // Define move handler ONCE and reuse it (important for event persistence)
          const moveHandler = (orig, dest) => {
            this.handleMove(puzzle.id, puzzleState, orig, dest, ground);
          };

          // Create Chessground instance
          const ground = Chessground(boardElement, {
            fen: puzzle.fen,
            orientation: chess.turn() === 'w' ? 'white' : 'black',
            coordinates: true,  // Enable board coordinates (A-H, 1-8)
            movable: {
              free: false,
              color: chess.turn() === 'w' ? 'white' : 'black',
              dests: this.getDestinationMap(chess),
              events: {
                after: moveHandler
              }
            },
            draggable: {
              enabled: true,
              showGhost: true,
              distance: 0
            },
            animation: {
              enabled: true,
              duration: 200
            },
            highlight: {
              lastMove: true,
              check: true
            },
            selectable: {
              enabled: true  // Built-in click-to-move!
            }
          });

          // Store board instance with puzzle ID and state
          this.boardInstances.push({
            puzzleId: puzzle.id,
            board: ground,
            state: puzzleState
          });
        } catch (error) {
          console.error('Error creating board:', error);
        }
      }
    });
  }

  /**
   * Generate legal move destinations map for Chessground
   * Required by Chessground instead of onDragStart validation
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
   * Add click-to-move functionality to a board
   */
  /**
   * Handle a move made by the user
   */
  handleMove(puzzleId, puzzleState, source, target, ground) {
    const puzzle = this.puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return;

    // Check if move matches the expected move in solution line BEFORE making it
    const expectedMoveIndex = puzzleState.currentMoveIndex;
    const solutionLine = puzzle.solutionLine;
    const expectedMove = solutionLine[expectedMoveIndex];

    // Try to make the move
    let move = null;
    try {
      move = puzzleState.chess.move({
        from: source,
        to: target,
        promotion: 'q' // Always promote to queen for simplicity
      });
    } catch (error) {
      // Illegal move - Chessground handles snapback automatically
      this.showFeedback(puzzleId, 'illegal', 'Illegal move!');
      return;
    }

    // Simple SAN comparison (chess.js handles the conversion)
    if (move.san === expectedMove) {
      // Correct move!
      puzzleState.currentMoveIndex++;

      // Update board with new position and legal moves
      const newColor = puzzleState.chess.turn() === 'w' ? 'white' : 'black';
      ground.set({
        fen: puzzleState.chess.fen(),
        movable: {
          color: newColor,
          dests: this.getDestinationMap(puzzleState.chess)
        }
      });

      // Check if puzzle is complete
      if (puzzleState.currentMoveIndex >= solutionLine.length) {
        puzzleState.isComplete = true;
        ground.set({ movable: { color: undefined } });  // Disable moves
        this.showFeedback(puzzleId, 'complete', 'Puzzle solved! Excellent!');
        this.markPuzzleComplete(puzzleId);
        return;
      }

      // Show success feedback
      this.showFeedback(puzzleId, 'correct', `✓ Correct! ${move.san}`);

      // Auto-play opponent's response after a delay
      if (puzzleState.currentMoveIndex < solutionLine.length) {
        setTimeout(() => {
          this.playOpponentMove(puzzleId, puzzleState, ground);
        }, 800);
      }
    } else {
      // Incorrect move - undo and reset board
      puzzleState.chess.undo();
      ground.set({ fen: puzzleState.chess.fen() });
      this.showFeedback(puzzleId, 'incorrect', `✗ Wrong move! Expected: ${expectedMove}`);
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

    try {
      const move = puzzleState.chess.move(opponentMoveSAN);
      if (move) {
        // Animate opponent's move with highlight
        const newColor = puzzleState.chess.turn() === 'w' ? 'white' : 'black';
        const newDests = this.getDestinationMap(puzzleState.chess);

        // Update move index first
        puzzleState.currentMoveIndex++;

        // Use requestAnimationFrame to ensure update happens after current animation frame
        requestAnimationFrame(() => {
          ground.set({
            fen: puzzleState.chess.fen(),
            lastMove: [move.from, move.to],
            check: puzzleState.chess.inCheck(),
            turnColor: newColor,
            movable: {
              color: newColor,
              dests: newDests,
              showDests: true
            }
          });
        });

        // Show opponent's move
        this.showFeedback(puzzleId, 'opponent', `Opponent played: ${move.san}`);

        // Check if puzzle is complete
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
   * Handle a move made in fullscreen view
   */
  handleFullscreenMove(puzzle, puzzleState, source, target, ground, feedbackArea) {
    // Check if move matches the expected move in solution line BEFORE making it
    const expectedMoveIndex = puzzleState.currentMoveIndex;
    const solutionLine = puzzle.solutionLine;
    const expectedMove = solutionLine[expectedMoveIndex];

    // Try to make the move
    let move = null;
    try {
      move = puzzleState.chess.move({
        from: source,
        to: target,
        promotion: 'q'
      });
    } catch (error) {
      // Illegal move - Chessground handles snapback automatically
      this.showFullscreenFeedback(feedbackArea, 'illegal', 'Illegal move!');
      return;
    }

    // Simple SAN comparison
    if (move.san === expectedMove) {
      // Correct move!
      puzzleState.currentMoveIndex++;

      // Update board with new position and legal moves
      const newColor = puzzleState.chess.turn() === 'w' ? 'white' : 'black';
      ground.set({
        fen: puzzleState.chess.fen(),
        movable: {
          color: newColor,
          dests: this.getDestinationMap(puzzleState.chess)
        }
      });

      // Check if puzzle is complete
      if (puzzleState.currentMoveIndex >= solutionLine.length) {
        puzzleState.isComplete = true;
        ground.set({ movable: { color: undefined } });  // Disable moves
        this.showFullscreenFeedback(feedbackArea, 'complete', 'Puzzle solved! Excellent!');
        this.markFullscreenPuzzleComplete(puzzle.id);
        return;
      }

      // Show success feedback
      this.showFullscreenFeedback(feedbackArea, 'correct', `Correct! ${move.san}`);

      // Auto-play opponent's response after a delay
      if (puzzleState.currentMoveIndex < solutionLine.length) {
        setTimeout(() => {
          this.playFullscreenOpponentMove(puzzle, puzzleState, ground, feedbackArea);
        }, 800);
      }
    } else {
      // Incorrect move - undo and reset board
      puzzleState.chess.undo();
      ground.set({ fen: puzzleState.chess.fen() });
      this.showFullscreenFeedback(feedbackArea, 'incorrect', `✗ Wrong move! Expected: ${expectedMove}`);
    }
  }

  /**
   * Play opponent's move in fullscreen
   */
  playFullscreenOpponentMove(puzzle, puzzleState, ground, feedbackArea) {
    const solutionLine = puzzle.solutionLine;
    if (puzzleState.currentMoveIndex >= solutionLine.length) return;

    const opponentMoveSAN = solutionLine[puzzleState.currentMoveIndex];

    try {
      const move = puzzleState.chess.move(opponentMoveSAN);
      if (move) {
        // Animate opponent's move with highlight
        const newColor = puzzleState.chess.turn() === 'w' ? 'white' : 'black';
        const newDests = this.getDestinationMap(puzzleState.chess);

        // Update move index first
        puzzleState.currentMoveIndex++;

        // Use requestAnimationFrame to ensure update happens after current animation frame
        requestAnimationFrame(() => {
          ground.set({
            fen: puzzleState.chess.fen(),
            lastMove: [move.from, move.to],
            check: puzzleState.chess.inCheck(),
            turnColor: newColor,
            movable: {
              color: newColor,
              dests: newDests,
              showDests: true
            }
          });
        });

        // Show opponent's move
        this.showFullscreenFeedback(feedbackArea, 'opponent', `Opponent played: ${move.san}`);

        // Check if puzzle is complete
        if (puzzleState.currentMoveIndex >= solutionLine.length) {
          puzzleState.isComplete = true;
          setTimeout(() => {
            this.showFullscreenFeedback(feedbackArea, 'complete', 'Puzzle solved! Excellent!');
            this.markFullscreenPuzzleComplete(puzzle.id);
          }, 1000);
        }
      }
    } catch (error) {
      // Silently handle error
    }
  }

  /**
   * Show feedback in fullscreen
   */
  showFullscreenFeedback(feedbackArea, type, message) {
    feedbackArea.className = `move-feedback feedback-${type}`;
    feedbackArea.textContent = message;

    // Keep feedback visible permanently
  }

  /**
   * Mark fullscreen puzzle as complete
   */
  markFullscreenPuzzleComplete(puzzleId) {
    const overlay = document.querySelector('.fullscreen-overlay');
    if (!overlay) return;

    // Show the solution text
    const solutionMove = overlay.querySelector('.fullscreen-solution-move');
    if (solutionMove) {
      solutionMove.style.filter = 'none';
    }

    // Hide solution button
    const solutionBtn = overlay.querySelector('.fullscreen-show-solution-btn');
    if (solutionBtn) {
      solutionBtn.style.display = 'none';
    }

    // Add completion styling to content
    const content = overlay.querySelector('.fullscreen-content');
    if (content) {
      content.style.border = '3px solid #28a745';
    }
  }

  /**
   * Show feedback message for a move
   */
  showFeedback(puzzleId, type, message) {
    const card = document.querySelector(`[data-puzzle-id="${puzzleId}"]`)?.closest('.puzzle-card');
    if (!card) return;

    // Find or create feedback area
    let feedbackArea = card.querySelector('.move-feedback');
    if (!feedbackArea) {
      feedbackArea = document.createElement('div');
      feedbackArea.className = 'move-feedback';
      const boardContainer = card.querySelector('.board-container');
      if (boardContainer) {
        boardContainer.appendChild(feedbackArea);
      }
    }

    // Set feedback class based on type
    feedbackArea.className = `move-feedback feedback-${type}`;
    feedbackArea.textContent = message;

    // Keep feedback visible permanently
  }

  /**
   * Mark puzzle as complete
   */
  markPuzzleComplete(puzzleId) {
    const card = document.querySelector(`[data-puzzle-id="${puzzleId}"]`)?.closest('.puzzle-card');
    if (!card) return;

    // Add completion styling
    card.classList.add('puzzle-complete');

    // Hide solution button (no longer needed)
    const solutionBtn = card.querySelector('.show-solution-btn');
    if (solutionBtn) {
      solutionBtn.style.display = 'none';
    }

    // Show the solution text
    const solutionArea = card.querySelector('.puzzle-solution');
    if (solutionArea) {
      solutionArea.style.display = 'block';
      const solutionMove = solutionArea.querySelector('.solution-move');
      if (solutionMove) {
        solutionMove.style.filter = 'none';
      }
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
      // Update chess.js state with opponent's move
      const opponentMoveSAN = puzzle.solutionLine[0]; // First move is opponent's
      const move = boardInstance.state.chess.move(opponentMoveSAN);
      boardInstance.state.currentMoveIndex = 1; // Move to next position in solution
      boardInstance.state.opponentMoveShown = true;

      // Update Chessground board to position after opponent's move
      // Use requestAnimationFrame for proper synchronization
      const newColor = boardInstance.state.chess.turn() === 'w' ? 'white' : 'black';
      const newDests = this.getDestinationMap(boardInstance.state.chess);

      requestAnimationFrame(() => {
        boardInstance.board.set({
          fen: boardInstance.state.chess.fen(),
          lastMove: move ? [move.from, move.to] : undefined,
          check: boardInstance.state.chess.inCheck(),
          turnColor: newColor,
          movable: {
            color: newColor,
            dests: newDests,
            showDests: true
          }
        });
      });

      // Update button to show it's been played
      const btn = document.querySelector(`[data-puzzle-id="${puzzleId}"].animate-opponent-btn`);
      if (btn) {
        btn.disabled = true;
        btn.textContent = `✓ Opponent played: ${puzzle.opponentMove}`;
        btn.style.background = '#6c757d';
      }

      // Show the solution area
      const card = btn?.closest('.puzzle-card');
      if (card) {
        const solutionArea = card.querySelector('.puzzle-solution');
        if (solutionArea) {
          solutionArea.style.display = 'block';
        }

        // Update instructions
        const instructions = card.querySelector('.puzzle-instructions');
        if (instructions) {
          instructions.innerHTML = '<strong>💡 Instructions:</strong> Now drag your pieces to find the winning move!';
        }
      }

      // Show feedback
      this.showFeedback(puzzleId, 'opponent', `Opponent played: ${puzzle.opponentMove}`);
    } catch (error) {
      // Silently handle error
    }
  }

  /**
   * Show the solution
   */
  showSolution(puzzleId) {
    const puzzle = this.puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return;

    const btn = document.querySelector(`[data-puzzle-id="${puzzleId}"].show-solution-btn`);
    if (!btn) return;

    const solutionMove = btn.closest('.puzzle-solution').querySelector('.solution-move');
    if (solutionMove) {
      solutionMove.style.filter = 'none';  // Remove blur
      solutionMove.style.userSelect = 'text';  // Allow selection
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

    // Create fullscreen overlay
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

    // Store board instance and current orientation
    let boardInstance = null;
    let boardOrientation = 'white';
    let currentPosition = puzzle.fen;

    // Initialize chess.js instance for fullscreen puzzle solving
    const chess = new Chess(puzzle.fen);
    const fullscreenPuzzleState = {
      currentMoveIndex: 0,
      chess: chess,
      isComplete: false,
      opponentMoveShown: false,
      selectedSquare: null  // For click-to-move
    };

    // Create feedback area for fullscreen
    const feedbackArea = document.createElement('div');
    feedbackArea.className = 'move-feedback';
    feedbackArea.id = `fullscreen-feedback-${puzzle.id}`;

    // Define fullscreen move handler
    const fullscreenMoveHandler = (orig, dest) => {
      this.handleFullscreenMove(puzzle, fullscreenPuzzleState, orig, dest, boardInstance, feedbackArea);
    };

    // Initialize board in fullscreen
    setTimeout(() => {
      const boardElement = document.getElementById(`fullscreen-board-${puzzle.id}`);
      if (boardElement) {
        // Create Chessground instance
        boardInstance = Chessground(boardElement, {
          fen: puzzle.fen,
          orientation: boardOrientation,
          coordinates: true,  // Enable board coordinates (A-H, 1-8)
          movable: {
            free: false,
            color: fullscreenPuzzleState.chess.turn() === 'w' ? 'white' : 'black',
            dests: this.getDestinationMap(fullscreenPuzzleState.chess),
            events: {
              after: fullscreenMoveHandler
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
          selectable: {
            enabled: true  // Built-in click-to-move!
          }
        });

        // Insert feedback area after board
        const boardContainer = overlay.querySelector('.fullscreen-board-container');
        if (boardContainer) {
          boardContainer.appendChild(feedbackArea);
        }

        // Flip board functionality - attach AFTER board is created
        const flipBtn = overlay.querySelector('.flip-board-btn');
        if (flipBtn) {
          flipBtn.addEventListener('click', () => {
            boardOrientation = boardOrientation === 'white' ? 'black' : 'white';
            boardInstance.set({ orientation: boardOrientation });
          });
        }
      }
    }, 100);

    // Close button functionality
    const closeBtn = overlay.querySelector('.fullscreen-close');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    // Click overlay to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });

    // Play opponent's move functionality
    const animateBtn = overlay.querySelector('.fullscreen-animate-btn');
    if (animateBtn) {
      animateBtn.addEventListener('click', () => {
        if (boardInstance && puzzle.fenAfterOpponent) {
          // Update chess.js state with opponent's move
          const opponentMoveSAN = puzzle.solutionLine[0]; // First move is opponent's
          const move = fullscreenPuzzleState.chess.move(opponentMoveSAN);
          fullscreenPuzzleState.currentMoveIndex = 1; // Move to next position
          fullscreenPuzzleState.opponentMoveShown = true;

          // Update board with highlight
          boardInstance.set({
            fen: puzzle.fenAfterOpponent,
            lastMove: move ? [move.from, move.to] : undefined,
            movable: {
              color: fullscreenPuzzleState.chess.turn() === 'w' ? 'white' : 'black',
              dests: this.getDestinationMap(fullscreenPuzzleState.chess)
            }
          });
          currentPosition = puzzle.fenAfterOpponent;

          // Update button
          animateBtn.disabled = true;
          animateBtn.textContent = `✓ Opponent played: ${puzzle.opponentMove}`;
          animateBtn.style.background = '#6c757d';

          // Show feedback
          this.showFullscreenFeedback(feedbackArea, 'opponent', `Opponent played: ${puzzle.opponentMove}`);
        }
      });
    }

    // Show solution functionality
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

    // Copy FEN functionality
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

    // Lichess analysis button
    const lichessBtn = overlay.querySelector('.fullscreen-lichess-analyze');
    if (lichessBtn) {
      lichessBtn.addEventListener('click', () => {
        const fenEncoded = encodeURIComponent(puzzle.fen);
        window.open(`https://lichess.org/analysis/${fenEncoded}`, '_blank');
      });
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

    // Create download
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
   * Get human-readable theme name
   */
  getThemeName(themeId) {
    return this.formatThemeName(themeId);
  }

  /**
   * Show loading indicator
   */
  showLoading(message = 'Loading...') {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.querySelector('p').textContent = message;
      loading.style.display = 'block';
    }
  }

  /**
   * Hide loading indicator
   */
  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showToast(message, 'error');
  }

  /**
   * Show success message
   */
  showMessage(message, type = 'info') {
    if (type === 'success' || type === 'info') {
      this.showToast(message, type);
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Create toast element
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

    // Remove after 4 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new ChessQuizComposer();
  await app.initialize();

  // Make app globally accessible for debugging
  window.chessApp = app;
});
