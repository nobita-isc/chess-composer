/**
 * CreatePuzzleDialog.js
 * Main dialog for creating custom puzzles with multiple input methods
 */

import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import { validateFEN, validateMoves, parseMoves, checkMateStatus, getTurnFromFEN } from './validation/PuzzleValidator.js';

// Input method tabs
const INPUT_METHODS = {
  MANUAL: 'manual',
  LICHESS: 'lichess_import',
  INTERACTIVE: 'interactive',
  PGN: 'pgn'
};

const THEME_OPTIONS = [
  'mate', 'matein1', 'matein2', 'matein3', 'matein4',
  'fork', 'pin', 'skewer', 'discoveredattack', 'discoveredcheck',
  'doublecheck', 'sacrifice', 'deflection', 'attraction',
  'clearance', 'interference', 'quietmove', 'defensivemove',
  'zugzwang', 'trappedpiece', 'exposedking', 'hangingpiece',
  'backrankmate', 'smotheredmate', 'promotion', 'endgame'
];

/**
 * Show the create puzzle dialog
 * @param {ApiClient} apiClient - API client instance
 */
export function showCreatePuzzleDialog(apiClient) {
  let currentMethod = INPUT_METHODS.MANUAL;
  let interactiveBoard = null;
  let interactiveChess = null;

  // Using object wrapper for recorded moves to allow immutable updates
  const movesState = { moves: [] };

  const overlay = document.createElement('div');
  overlay.className = 'admin-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="admin-content create-puzzle-dialog">
      <button class="admin-close" aria-label="Close">&times;</button>

      <header class="admin-header">
        <h2>Create Custom Puzzle</h2>
      </header>

      <!-- Tab Navigation -->
      <div class="create-puzzle-tabs">
        <button class="tab-btn active" data-method="${INPUT_METHODS.MANUAL}">Manual Entry</button>
        <button class="tab-btn" data-method="${INPUT_METHODS.LICHESS}">Import from Lichess</button>
        <button class="tab-btn" data-method="${INPUT_METHODS.INTERACTIVE}">Interactive Board</button>
        <button class="tab-btn" data-method="${INPUT_METHODS.PGN}">PGN Import</button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Manual Entry Form -->
        <div class="tab-panel active" id="panel-manual">
          <div class="form-row">
            <div class="form-group">
              <label for="manual-id">Puzzle ID (optional)</label>
              <input type="text" id="manual-id" placeholder="e.g., my_puzzle_001" />
              <small>Leave blank to auto-generate</small>
            </div>
            <div class="form-group">
              <label for="manual-rating">Rating</label>
              <input type="number" id="manual-rating" value="1500" min="500" max="3500" />
            </div>
          </div>

          <div class="form-group">
            <label for="manual-fen">Starting Position (FEN) *</label>
            <textarea id="manual-fen" rows="2" placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"></textarea>
            <div id="manual-fen-validation" class="validation-msg"></div>
          </div>

          <div class="form-group">
            <label for="manual-moves">Solution Moves (SAN) *</label>
            <textarea id="manual-moves" rows="3" placeholder="e4 e5 Nf3 Nc6 Bb5"></textarea>
            <small>Space-separated moves in Standard Algebraic Notation</small>
            <div id="manual-moves-validation" class="validation-msg"></div>
          </div>

          <div class="form-group">
            <label for="manual-themes">Themes</label>
            <select id="manual-themes" multiple size="4">
              ${THEME_OPTIONS.map(t => `<option value="${t}">${formatThemeName(t)}</option>`).join('')}
            </select>
            <small>Hold Ctrl/Cmd to select multiple</small>
          </div>
        </div>

        <!-- Lichess Import Form -->
        <div class="tab-panel" id="panel-lichess_import">
          <div class="form-group">
            <label for="lichess-id">Lichess Puzzle ID or URL</label>
            <div class="input-with-button">
              <input type="text" id="lichess-id" placeholder="e.g., abc123 or https://lichess.org/training/abc123" />
              <button id="lichess-fetch-btn" class="btn-secondary">Fetch</button>
            </div>
            <div id="lichess-status" class="validation-msg"></div>
          </div>

          <div id="lichess-preview" class="puzzle-preview" style="display: none;">
            <h4>Fetched Puzzle</h4>
            <div class="preview-grid">
              <div class="preview-board" id="lichess-preview-board"></div>
              <div class="preview-info">
                <p><strong>Rating:</strong> <span id="lichess-rating">-</span></p>
                <p><strong>Themes:</strong> <span id="lichess-themes">-</span></p>
                <p><strong>Solution:</strong> <span id="lichess-solution">-</span></p>
              </div>
            </div>

            <div class="form-group" style="margin-top: 15px;">
              <label for="lichess-custom-id">Custom ID (optional)</label>
              <input type="text" id="lichess-custom-id" placeholder="Leave blank to use original ID" />
            </div>

            <div class="form-group">
              <label for="lichess-fen-override">FEN (if not auto-detected)</label>
              <textarea id="lichess-fen-override" rows="2" placeholder="Paste FEN if needed"></textarea>
            </div>
          </div>
        </div>

        <!-- Interactive Board Form -->
        <div class="tab-panel" id="panel-interactive">
          <div class="interactive-controls">
            <button id="interactive-reset" class="btn-secondary">Reset Board</button>
            <button id="interactive-clear" class="btn-secondary">Clear Moves</button>
            <button id="interactive-undo" class="btn-secondary">Undo Last</button>
          </div>

          <div class="form-group">
            <label for="interactive-start-fen">Starting FEN (optional)</label>
            <div class="input-with-button">
              <input type="text" id="interactive-start-fen" placeholder="Paste FEN to set up position" />
              <button id="interactive-load-fen" class="btn-secondary">Load</button>
            </div>
          </div>

          <div class="interactive-board-container">
            <div id="interactive-board" style="width: 400px; height: 400px;"></div>
            <div class="interactive-info">
              <p><strong>Turn:</strong> <span id="interactive-turn">White</span></p>
              <p><strong>Moves recorded:</strong></p>
              <div id="interactive-moves-list" class="moves-list"></div>
            </div>
          </div>

          <div class="form-row" style="margin-top: 15px;">
            <div class="form-group">
              <label for="interactive-id">Puzzle ID (optional)</label>
              <input type="text" id="interactive-id" placeholder="Auto-generated if blank" />
            </div>
            <div class="form-group">
              <label for="interactive-rating">Rating</label>
              <input type="number" id="interactive-rating" value="1500" min="500" max="3500" />
            </div>
          </div>

          <div class="form-group">
            <label for="interactive-themes">Themes</label>
            <select id="interactive-themes" multiple size="3">
              ${THEME_OPTIONS.map(t => `<option value="${t}">${formatThemeName(t)}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- PGN Import Form -->
        <div class="tab-panel" id="panel-pgn">
          <div class="form-group">
            <label for="pgn-input">Paste PGN</label>
            <textarea id="pgn-input" rows="8" placeholder="[Event &quot;...&quot;]
[Site &quot;...&quot;]
...

1. e4 e5 2. Nf3 Nc6 ..."></textarea>
            <button id="pgn-parse-btn" class="btn-secondary" style="margin-top: 10px;">Parse PGN</button>
            <div id="pgn-status" class="validation-msg"></div>
          </div>

          <div id="pgn-selector" style="display: none;">
            <h4>Select Puzzle Position</h4>
            <div class="form-row">
              <div class="form-group">
                <label for="pgn-start-move">Start at move #</label>
                <input type="number" id="pgn-start-move" min="1" value="1" />
              </div>
              <div class="form-group">
                <label for="pgn-solution-length">Solution length (moves)</label>
                <input type="number" id="pgn-solution-length" min="1" max="20" value="4" />
              </div>
            </div>
            <button id="pgn-extract-btn" class="btn-secondary">Extract Position</button>

            <div id="pgn-preview" class="puzzle-preview" style="display: none; margin-top: 15px;">
              <div class="preview-grid">
                <div class="preview-board" id="pgn-preview-board"></div>
                <div class="preview-info">
                  <p><strong>FEN:</strong> <code id="pgn-extracted-fen">-</code></p>
                  <p><strong>Solution:</strong> <span id="pgn-extracted-moves">-</span></p>
                </div>
              </div>

              <div class="form-row" style="margin-top: 10px;">
                <div class="form-group">
                  <label for="pgn-id">Puzzle ID (optional)</label>
                  <input type="text" id="pgn-id" />
                </div>
                <div class="form-group">
                  <label for="pgn-rating">Rating</label>
                  <input type="number" id="pgn-rating" value="1500" min="500" max="3500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="dialog-actions">
        <button class="cancel-btn">Cancel</button>
        <button class="save-btn" id="create-puzzle-submit" disabled>Create Puzzle</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // State for each method
  const state = {
    manual: { fen: '', moves: [], id: '', rating: 1500, themes: [] },
    lichess_import: { data: null, customId: '', fenOverride: '' },
    interactive: { startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [], id: '', rating: 1500, themes: [] },
    pgn: { game: null, fen: '', moves: [], id: '', rating: 1500 }
  };

  // Helper: show toast
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
    setTimeout(() => toast.remove(), 4000);
  };

  // Helper: update submit button state
  const updateSubmitButton = () => {
    const submitBtn = overlay.querySelector('#create-puzzle-submit');
    let canSubmit = false;

    switch (currentMethod) {
      case INPUT_METHODS.MANUAL:
        const fenValid = validateFEN(state.manual.fen).valid;
        const movesValid = state.manual.moves.length > 0 && validateMoves(state.manual.fen, state.manual.moves).valid;
        canSubmit = fenValid && movesValid;
        break;
      case INPUT_METHODS.LICHESS:
        canSubmit = state.lichess_import.data !== null && (state.lichess_import.data.fen || state.lichess_import.fenOverride);
        break;
      case INPUT_METHODS.INTERACTIVE:
        canSubmit = state.interactive.moves.length > 0;
        break;
      case INPUT_METHODS.PGN:
        canSubmit = state.pgn.fen && state.pgn.moves.length > 0;
        break;
    }

    submitBtn.disabled = !canSubmit;
  };

  // Tab switching
  const switchTab = (method) => {
    currentMethod = method;

    overlay.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.method === method);
    });

    overlay.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${method}`);
    });

    // Initialize interactive board when switching to that tab
    if (method === INPUT_METHODS.INTERACTIVE && !interactiveBoard) {
      initInteractiveBoard();
    }

    updateSubmitButton();
  };

  // Manual Entry Handlers
  const initManualEntry = () => {
    const fenInput = overlay.querySelector('#manual-fen');
    const movesInput = overlay.querySelector('#manual-moves');
    const fenValidation = overlay.querySelector('#manual-fen-validation');
    const movesValidation = overlay.querySelector('#manual-moves-validation');
    const idInput = overlay.querySelector('#manual-id');
    const ratingInput = overlay.querySelector('#manual-rating');
    const themesSelect = overlay.querySelector('#manual-themes');

    fenInput.addEventListener('input', () => {
      state.manual.fen = fenInput.value.trim();
      const result = validateFEN(state.manual.fen);

      if (!state.manual.fen) {
        fenValidation.innerHTML = '';
        fenValidation.className = 'validation-msg';
      } else if (result.valid) {
        fenValidation.innerHTML = '<span class="valid">Valid FEN</span>';
        fenValidation.className = 'validation-msg valid';
      } else {
        fenValidation.innerHTML = `<span class="invalid">${result.error}</span>`;
        fenValidation.className = 'validation-msg invalid';
      }

      // Re-validate moves with new FEN
      if (state.manual.moves.length > 0) {
        const movesResult = validateMoves(state.manual.fen, state.manual.moves);
        if (movesResult.valid) {
          movesValidation.innerHTML = `<span class="valid">${state.manual.moves.length} valid move(s)</span>`;
          movesValidation.className = 'validation-msg valid';
        } else {
          movesValidation.innerHTML = `<span class="invalid">${movesResult.error}</span>`;
          movesValidation.className = 'validation-msg invalid';
        }
      }

      updateSubmitButton();
    });

    movesInput.addEventListener('input', () => {
      state.manual.moves = parseMoves(movesInput.value);

      if (state.manual.moves.length === 0) {
        movesValidation.innerHTML = '';
        movesValidation.className = 'validation-msg';
      } else if (!state.manual.fen) {
        movesValidation.innerHTML = '<span class="invalid">Enter FEN first</span>';
        movesValidation.className = 'validation-msg invalid';
      } else {
        const result = validateMoves(state.manual.fen, state.manual.moves);
        if (result.valid) {
          const mateStatus = checkMateStatus(state.manual.fen, state.manual.moves);
          let msg = `${state.manual.moves.length} valid move(s)`;
          if (mateStatus.isCheckmate) msg += ' (Checkmate!)';
          else if (mateStatus.isCheck) msg += ' (Check)';
          movesValidation.innerHTML = `<span class="valid">${msg}</span>`;
          movesValidation.className = 'validation-msg valid';
        } else {
          movesValidation.innerHTML = `<span class="invalid">${result.error}</span>`;
          movesValidation.className = 'validation-msg invalid';
        }
      }

      updateSubmitButton();
    });

    idInput.addEventListener('input', () => {
      state.manual.id = idInput.value.trim();
    });

    ratingInput.addEventListener('change', () => {
      state.manual.rating = parseInt(ratingInput.value) || 1500;
    });

    themesSelect.addEventListener('change', () => {
      state.manual.themes = Array.from(themesSelect.selectedOptions).map(o => o.value);
    });
  };

  // Lichess Import Handlers
  const initLichessImport = () => {
    const idInput = overlay.querySelector('#lichess-id');
    const fetchBtn = overlay.querySelector('#lichess-fetch-btn');
    const statusDiv = overlay.querySelector('#lichess-status');
    const previewDiv = overlay.querySelector('#lichess-preview');

    fetchBtn.addEventListener('click', async () => {
      let puzzleId = idInput.value.trim();

      // Extract ID from URL if needed
      const urlMatch = puzzleId.match(/lichess\.org\/training\/([a-zA-Z0-9]+)/);
      if (urlMatch) puzzleId = urlMatch[1];

      if (!puzzleId) {
        statusDiv.innerHTML = '<span class="invalid">Please enter a puzzle ID or URL</span>';
        return;
      }

      statusDiv.innerHTML = '<span class="loading">Fetching...</span>';
      fetchBtn.disabled = true;

      try {
        const data = await apiClient.fetchLichessPuzzle(puzzleId);
        state.lichess_import.data = data;

        // Update preview
        overlay.querySelector('#lichess-rating').textContent = data.rating || '-';
        overlay.querySelector('#lichess-themes').textContent = (data.themes || []).join(', ') || '-';
        overlay.querySelector('#lichess-solution').textContent = (data.solution || []).join(' ') || '-';

        previewDiv.style.display = 'block';
        statusDiv.innerHTML = '<span class="valid">Puzzle fetched successfully</span>';

        if (data.note) {
          statusDiv.innerHTML += `<br><small>${data.note}</small>`;
        }
      } catch (error) {
        statusDiv.innerHTML = `<span class="invalid">Error: ${error.message}</span>`;
        state.lichess_import.data = null;
      }

      fetchBtn.disabled = false;
      updateSubmitButton();
    });

    overlay.querySelector('#lichess-custom-id').addEventListener('input', (e) => {
      state.lichess_import.customId = e.target.value.trim();
    });

    overlay.querySelector('#lichess-fen-override').addEventListener('input', (e) => {
      state.lichess_import.fenOverride = e.target.value.trim();
      updateSubmitButton();
    });
  };

  // Interactive Board Setup
  const initInteractiveBoard = () => {
    const boardEl = overlay.querySelector('#interactive-board');
    interactiveChess = new Chess();
    state.interactive.startFen = interactiveChess.fen();
    movesState.moves = [];

    const updateBoard = () => {
      const turn = interactiveChess.turn() === 'w' ? 'white' : 'black';
      overlay.querySelector('#interactive-turn').textContent = turn.charAt(0).toUpperCase() + turn.slice(1);

      const movesList = overlay.querySelector('#interactive-moves-list');
      movesList.innerHTML = movesState.moves.length > 0
        ? movesState.moves.map((m, i) => `<span class="move-item">${i + 1}. ${m}</span>`).join(' ')
        : '<em>Make moves on the board</em>';

      state.interactive.moves = movesState.moves;
      updateSubmitButton();
    };

    const getDestinations = () => {
      const dests = new Map();
      const moves = interactiveChess.moves({ verbose: true });
      moves.forEach(m => {
        if (!dests.has(m.from)) dests.set(m.from, []);
        dests.get(m.from).push(m.to);
      });
      return dests;
    };

    interactiveBoard = Chessground(boardEl, {
      fen: interactiveChess.fen(),
      orientation: 'white',
      movable: {
        free: false,
        color: 'white',
        dests: getDestinations(),
        events: {
          after: (orig, dest) => {
            const move = interactiveChess.move({ from: orig, to: dest, promotion: 'q' });
            if (move) {
              movesState.moves = [...movesState.moves, move.san];
              interactiveBoard.set({
                fen: interactiveChess.fen(),
                movable: {
                  color: interactiveChess.turn() === 'w' ? 'white' : 'black',
                  dests: getDestinations()
                }
              });
              updateBoard();
            }
          }
        }
      },
      draggable: { enabled: true }
    });

    // Controls
    overlay.querySelector('#interactive-reset').addEventListener('click', () => {
      interactiveChess = new Chess(state.interactive.startFen);
      movesState.moves = [];
      interactiveBoard.set({
        fen: interactiveChess.fen(),
        movable: {
          color: interactiveChess.turn() === 'w' ? 'white' : 'black',
          dests: getDestinations()
        }
      });
      updateBoard();
    });

    overlay.querySelector('#interactive-clear').addEventListener('click', () => {
      interactiveChess = new Chess(state.interactive.startFen);
      movesState.moves = [];
      interactiveBoard.set({
        fen: interactiveChess.fen(),
        movable: {
          color: interactiveChess.turn() === 'w' ? 'white' : 'black',
          dests: getDestinations()
        }
      });
      updateBoard();
    });

    overlay.querySelector('#interactive-undo').addEventListener('click', () => {
      if (movesState.moves.length > 0) {
        interactiveChess.undo();
        movesState.moves = movesState.moves.slice(0, -1);
        interactiveBoard.set({
          fen: interactiveChess.fen(),
          movable: {
            color: interactiveChess.turn() === 'w' ? 'white' : 'black',
            dests: getDestinations()
          }
        });
        updateBoard();
      }
    });

    overlay.querySelector('#interactive-load-fen').addEventListener('click', () => {
      const fenInput = overlay.querySelector('#interactive-start-fen');
      const fen = fenInput.value.trim();

      if (!fen) return;

      const result = validateFEN(fen);
      if (!result.valid) {
        showToast('Invalid FEN', 'error');
        return;
      }

      state.interactive.startFen = fen;
      interactiveChess = new Chess(fen);
      movesState.moves = [];
      interactiveBoard.set({
        fen: interactiveChess.fen(),
        orientation: interactiveChess.turn() === 'w' ? 'white' : 'black',
        movable: {
          color: interactiveChess.turn() === 'w' ? 'white' : 'black',
          dests: getDestinations()
        }
      });
      updateBoard();
      showToast('Position loaded');
    });

    overlay.querySelector('#interactive-id').addEventListener('input', (e) => {
      state.interactive.id = e.target.value.trim();
    });

    overlay.querySelector('#interactive-rating').addEventListener('change', (e) => {
      state.interactive.rating = parseInt(e.target.value) || 1500;
    });

    overlay.querySelector('#interactive-themes').addEventListener('change', (e) => {
      state.interactive.themes = Array.from(e.target.selectedOptions).map(o => o.value);
    });

    updateBoard();
  };

  // PGN Import Handlers
  const initPGNImport = () => {
    const pgnInput = overlay.querySelector('#pgn-input');
    const parseBtn = overlay.querySelector('#pgn-parse-btn');
    const statusDiv = overlay.querySelector('#pgn-status');
    const selectorDiv = overlay.querySelector('#pgn-selector');
    const previewDiv = overlay.querySelector('#pgn-preview');

    let parsedGame = null;
    let gameHistory = [];

    parseBtn.addEventListener('click', () => {
      const pgn = pgnInput.value.trim();
      if (!pgn) {
        statusDiv.innerHTML = '<span class="invalid">Please paste a PGN</span>';
        return;
      }

      try {
        const chess = new Chess();
        const loaded = chess.loadPgn(pgn);

        if (!loaded) {
          statusDiv.innerHTML = '<span class="invalid">Invalid PGN format</span>';
          return;
        }

        gameHistory = chess.history();
        parsedGame = chess;
        state.pgn.game = chess;

        statusDiv.innerHTML = `<span class="valid">Parsed ${gameHistory.length} moves</span>`;
        selectorDiv.style.display = 'block';

        overlay.querySelector('#pgn-start-move').max = gameHistory.length;
      } catch (error) {
        statusDiv.innerHTML = `<span class="invalid">Parse error: ${error.message}</span>`;
      }
    });

    overlay.querySelector('#pgn-extract-btn').addEventListener('click', () => {
      if (!gameHistory.length) return;

      const startMove = parseInt(overlay.querySelector('#pgn-start-move').value) || 1;
      const solutionLength = parseInt(overlay.querySelector('#pgn-solution-length').value) || 4;

      // Replay to starting position
      const chess = new Chess();
      for (let i = 0; i < startMove - 1 && i < gameHistory.length; i++) {
        chess.move(gameHistory[i]);
      }

      const startFen = chess.fen();
      const solutionMoves = [];

      for (let i = 0; i < solutionLength && (startMove - 1 + i) < gameHistory.length; i++) {
        solutionMoves.push(gameHistory[startMove - 1 + i]);
      }

      state.pgn.fen = startFen;
      state.pgn.moves = solutionMoves;

      overlay.querySelector('#pgn-extracted-fen').textContent = startFen;
      overlay.querySelector('#pgn-extracted-moves').textContent = solutionMoves.join(' ');
      previewDiv.style.display = 'block';

      updateSubmitButton();
    });

    overlay.querySelector('#pgn-id').addEventListener('input', (e) => {
      state.pgn.id = e.target.value.trim();
    });

    overlay.querySelector('#pgn-rating').addEventListener('change', (e) => {
      state.pgn.rating = parseInt(e.target.value) || 1500;
    });
  };

  // Submit handler
  const handleSubmit = async () => {
    const submitBtn = overlay.querySelector('#create-puzzle-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    let puzzleData = {};

    try {
      switch (currentMethod) {
        case INPUT_METHODS.MANUAL:
          puzzleData = {
            id: state.manual.id || undefined,
            fen: state.manual.fen,
            moves: state.manual.moves,
            source: 'manual',
            themes: state.manual.themes,
            rating: state.manual.rating
          };
          break;

        case INPUT_METHODS.LICHESS:
          const liData = state.lichess_import.data;
          puzzleData = {
            id: state.lichess_import.customId || `lichess_${liData.id}`,
            fen: state.lichess_import.fenOverride || liData.fen,
            moves: liData.solution || [],
            source: 'lichess_import',
            themes: liData.themes || [],
            rating: liData.rating,
            game_url: liData.game_url
          };
          break;

        case INPUT_METHODS.INTERACTIVE:
          puzzleData = {
            id: state.interactive.id || undefined,
            fen: state.interactive.startFen,
            moves: state.interactive.moves,
            source: 'interactive',
            themes: state.interactive.themes,
            rating: state.interactive.rating
          };
          break;

        case INPUT_METHODS.PGN:
          puzzleData = {
            id: state.pgn.id || undefined,
            fen: state.pgn.fen,
            moves: state.pgn.moves,
            source: 'pgn',
            rating: state.pgn.rating
          };
          break;
      }

      const result = await apiClient.createPuzzle(puzzleData);
      showToast(`Puzzle created! ID: ${result.id}`);
      closeDialog();
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Puzzle';
    }
  };

  // Close handler
  const closeDialog = () => {
    if (interactiveBoard && typeof interactiveBoard.destroy === 'function') {
      interactiveBoard.destroy();
    }
    overlay.remove();
  };

  // Event bindings
  overlay.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.method));
  });

  overlay.querySelector('.admin-close').addEventListener('click', closeDialog);
  overlay.querySelector('.cancel-btn').addEventListener('click', closeDialog);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDialog();
  });
  overlay.querySelector('#create-puzzle-submit').addEventListener('click', handleSubmit);

  // Initialize all forms
  initManualEntry();
  initLichessImport();
  initPGNImport();

  // Focus first input
  overlay.querySelector('#manual-fen').focus();
}

/**
 * Format theme name for display
 */
function formatThemeName(theme) {
  const special = {
    'matein1': 'Mate in 1',
    'matein2': 'Mate in 2',
    'matein3': 'Mate in 3',
    'matein4': 'Mate in 4',
    'discoveredattack': 'Discovered Attack',
    'discoveredcheck': 'Discovered Check',
    'doublecheck': 'Double Check',
    'quietmove': 'Quiet Move',
    'defensivemove': 'Defensive Move',
    'trappedpiece': 'Trapped Piece',
    'exposedking': 'Exposed King',
    'hangingpiece': 'Hanging Piece',
    'backrankmate': 'Back Rank Mate',
    'smotheredmate': 'Smothered Mate'
  };

  if (special[theme]) return special[theme];
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

export default showCreatePuzzleDialog;
