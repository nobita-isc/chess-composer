/**
 * GenerateView.js
 * Chess puzzle generation, simplified card rendering, and Puzzle Viewer modal.
 */

import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import { apiClient, ApiError } from '../api/ApiClient.js'
import { showReportDialog } from '../reports/ReportDialog.js'
import {
  formatThemeName as formatThemeNameUtil,
  processPuzzles as processPuzzlesUtil,
  populateThemeSelect,
  buildGenerateParams
} from '../puzzles/puzzleGeneration.js'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function getDifficultyInfo(rating) {
  if (rating >= 2000) return { label: 'Advanced', cls: 'badge-advanced' }
  if (rating >= 1500) return { label: 'Intermediate', cls: 'badge-intermediate' }
  return { label: 'Beginner', cls: 'badge-beginner' }
}

export class ChessQuizComposer {
  constructor() {
    this.puzzles = []
    this.boardInstances = []
    this.solvedPuzzles = new Set()
    this.apiClient = apiClient
    this.initializeUI()
  }

  async initialize() {
    try {
      this.showLoading('Connecting to server...')
      const stats = await this.apiClient.getStats()
      await this.populateThemeSelector()
      this.hideLoading()
      this.showToast(`Ready! ${stats.totalPuzzles.toLocaleString()} puzzles available.`, 'success')
    } catch (error) {
      this.hideLoading()
      if (error instanceof ApiError && error.status === 0) {
        this.showToast('Cannot connect to server. Please ensure the server is running.', 'error')
      } else {
        this.showToast('Failed to initialize. Please refresh the page.', 'error')
      }
    }
  }

  initializeUI() {
    const generateBtn = document.getElementById('generate-btn')
    if (generateBtn) generateBtn.addEventListener('click', () => this.handleGenerate())
    const exportBtn = document.getElementById('export-btn')
    if (exportBtn) exportBtn.addEventListener('click', () => this.handleExport())
  }

  async populateThemeSelector() {
    const themeSelect = document.getElementById('theme-select')
    if (themeSelect) await populateThemeSelect(themeSelect, this.apiClient)
  }

  formatThemeName(themeId) { return formatThemeNameUtil(themeId) }

  async handleGenerate() {
    const themeSelect = document.getElementById('theme-select')
    const countInput = document.getElementById('puzzle-count')
    const ratingRangeSelect = document.getElementById('rating-range')
    const theme = themeSelect.value || null
    const count = parseInt(countInput.value)
    const ratingRange = ratingRangeSelect.value

    if (count < 1 || count > 20) {
      this.showToast('Please enter a number between 1 and 20', 'error')
      return
    }

    try {
      const themeName = theme ? this.formatThemeName(theme) : 'All Themes'
      const ratingText = ratingRange ? ` (${ratingRange})` : ''
      this.showLoading(`Generating ${count} puzzles for ${themeName}${ratingText}...`)

      const params = buildGenerateParams(theme, ratingRange, count)
      const puzzleData = await this.apiClient.generatePuzzles(params)
      this.puzzles = processPuzzlesUtil(puzzleData, theme)
      this.solvedPuzzles = new Set()
      this.hideLoading()
      this.renderPuzzles()
      document.getElementById('export-btn').disabled = false
    } catch (error) {
      this.hideLoading()
      this.showToast(error instanceof ApiError ? error.message : 'Failed to generate puzzles.', 'error')
    }
  }

  // ==================== Simplified Puzzle Cards ====================

  renderPuzzles() {
    const resultsContainer = document.getElementById('results')
    resultsContainer.innerHTML = ''
    this.puzzles.forEach((puzzle, index) => {
      resultsContainer.appendChild(this.createPuzzleCard(puzzle, index))
    })
    setTimeout(() => this.initializeBoards(), 100)
  }

  createPuzzleCard(puzzle, index) {
    const card = document.createElement('div')
    card.className = 'puzzle-card'
    card.dataset.puzzleIndex = index
    const rating = puzzle.rating || 1200
    const diff = getDifficultyInfo(rating)
    const isSolved = this.solvedPuzzles.has(puzzle.id)

    if (isSolved) card.classList.add('puzzle-card-solved')

    card.innerHTML = `
      <div class="card-board-area">
        <div id="board-${puzzle.id}" class="card-board"></div>
        ${isSolved ? `<div class="card-solved-overlay">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Solved</span>
        </div>` : ''}
      </div>
      <div class="card-footer">
        <div class="card-footer-left">
          <span class="card-puzzle-num">#${index + 1}</span>
          <span class="badge badge-theme">${escapeHtml(puzzle.themeName)}</span>
          <span class="badge ${diff.cls}">${diff.label}</span>
          ${isSolved ? '<span class="badge badge-solved">Solved</span>' : ''}
        </div>
        <div class="card-footer-right">
          <span class="card-meta-text">${puzzle.sideToFind} to move &middot; ${rating}</span>
          <button class="card-icon-btn" data-action="lichess" title="Analyze on Lichess">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
          <button class="card-icon-btn card-icon-btn-danger" data-action="report" title="Report Issue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </button>
          <button class="card-view-btn" data-action="view">${isSolved ? 'Review' : 'View Puzzle'}</button>
        </div>
      </div>
    `

    // Click anywhere on card to open viewer
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="lichess"]') || e.target.closest('[data-action="report"]')) return
      this.openPuzzleViewer(index)
    })

    card.querySelector('[data-action="lichess"]').addEventListener('click', (e) => {
      e.stopPropagation()
      window.open(`https://lichess.org/analysis/fromPosition/${encodeURIComponent(puzzle.fen)}`, '_blank')
    })
    card.querySelector('[data-action="report"]').addEventListener('click', (e) => {
      e.stopPropagation()
      this.handleReport(puzzle.id, puzzle.themeName)
    })

    return card
  }

  _markCardSolved(puzzleIndex) {
    const puzzle = this.puzzles[puzzleIndex]
    if (!puzzle) return
    this.solvedPuzzles.add(puzzle.id)

    const card = document.querySelector(`.puzzle-card[data-puzzle-index="${puzzleIndex}"]`)
    if (!card || card.classList.contains('puzzle-card-solved')) return

    card.classList.add('puzzle-card-solved')

    // Add solved overlay to board area
    const boardArea = card.querySelector('.card-board-area')
    if (boardArea && !boardArea.querySelector('.card-solved-overlay')) {
      const overlay = document.createElement('div')
      overlay.className = 'card-solved-overlay'
      overlay.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Solved</span>'
      boardArea.appendChild(overlay)
    }

    // Add solved badge
    const footerLeft = card.querySelector('.card-footer-left')
    if (footerLeft && !footerLeft.querySelector('.badge-solved')) {
      const solvedBadge = document.createElement('span')
      solvedBadge.className = 'badge badge-solved'
      solvedBadge.textContent = 'Solved'
      footerLeft.appendChild(solvedBadge)
    }

    // Update button text
    const viewBtn = card.querySelector('[data-action="view"]')
    if (viewBtn) viewBtn.textContent = 'Review'
  }

  initializeBoards() {
    this.boardInstances = []
    this.puzzles.forEach((puzzle) => {
      const el = document.getElementById(`board-${puzzle.id}`)
      if (!el) return
      try {
        const chess = new Chess(puzzle.fen)
        const fenTurn = chess.turn()
        const solverColor = puzzle.opponentMove
          ? (fenTurn === 'w' ? 'black' : 'white')
          : (fenTurn === 'w' ? 'white' : 'black')

        const ground = Chessground(el, {
          fen: puzzle.fen,
          orientation: solverColor,
          coordinates: false,
          viewOnly: true,
          animation: { enabled: false },
          highlight: { lastMove: false, check: false }
        })
        this.boardInstances.push({ puzzleId: puzzle.id, board: ground })
      } catch { /* skip */ }
    })
  }

  getDestinationMap(chess) {
    const dests = new Map()
    chess.moves({ verbose: true }).forEach(move => {
      if (!dests.has(move.from)) dests.set(move.from, [])
      dests.get(move.from).push(move.to)
    })
    return dests
  }

  // ==================== Puzzle Viewer Modal ====================

  openPuzzleViewer(puzzleIndex, forceRetry = false) {
    const puzzle = this.puzzles[puzzleIndex]
    if (!puzzle) return

    const isSolved = this.solvedPuzzles.has(puzzle.id) && !forceRetry

    const chess = new Chess(puzzle.fen)
    const fenTurn = chess.turn()
    const solverColor = puzzle.opponentMove
      ? (fenTurn === 'w' ? 'black' : 'white')
      : (fenTurn === 'w' ? 'white' : 'black')

    const diff = getDifficultyInfo(puzzle.rating || 1200)
    const movesCount = Math.ceil(puzzle.solutionLine.length / 2)

    const state = {
      chess,
      currentMoveIndex: 0,
      isComplete: isSolved,
      moveLog: [],
      boardInstance: null,
      orientation: solverColor
    }

    const overlay = document.createElement('div')
    overlay.className = 'pv-overlay'

    // Lock background scroll
    document.body.style.overflow = 'hidden'

    overlay.innerHTML = `
      <div class="pv-dialog">
        <div class="pv-header">
          <div class="pv-header-left">
            <span class="pv-title">Puzzle #${puzzleIndex + 1}</span>
            <span class="badge badge-theme">${escapeHtml(puzzle.themeName)}</span>
            <span class="badge ${diff.cls}">${diff.label}</span>
          </div>
          <div class="pv-header-right">
            <button class="pv-nav-btn" data-action="prev" ${puzzleIndex === 0 ? 'disabled' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="pv-nav-text">${puzzleIndex + 1} / ${this.puzzles.length}</span>
            <button class="pv-nav-btn pv-nav-btn-primary" data-action="next" ${puzzleIndex === this.puzzles.length - 1 ? 'disabled' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="pv-close-btn" data-action="close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="pv-body">
          <div class="pv-board-area">
            <div class="pv-board-wrap">
              <div id="pv-board" class="pv-board"></div>
            </div>
            <button class="pv-flip-btn" data-action="flip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
              <span>Flip Board</span>
            </button>
          </div>
          <div class="pv-panel">
            <div class="pv-status-banner" id="pv-status" style="display:none;"></div>
            <div class="pv-info-card">
              <div class="pv-info-row"><span class="pv-info-label">Position</span><span class="pv-info-value">${escapeHtml(puzzle.sideToFind)} to move</span></div>
              <div class="pv-info-row"><span class="pv-info-label">Rating</span><span class="pv-info-value">${puzzle.rating || 'N/A'}</span></div>
              <div class="pv-info-row"><span class="pv-info-label">Solve in</span><span class="pv-info-value">${movesCount} move${movesCount > 1 ? 's' : ''}</span></div>
            </div>
            <div class="pv-moves-card">
              <div class="pv-moves-label">Moves</div>
              <div class="pv-moves-list" id="pv-moves"></div>
            </div>
            <div class="pv-fen-card">
              <div class="pv-fen-label">FEN</div>
              <div class="pv-fen-row">
                <span class="pv-fen-text">${escapeHtml(puzzle.fen)}</span>
                <button class="pv-fen-copy" data-action="copy-fen" title="Copy FEN">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                </button>
              </div>
            </div>
            <div class="pv-actions" id="pv-actions">
              ${isSolved ? `
                <button class="pv-action-btn pv-action-retry" data-action="retry">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                  <span>Retry Puzzle</span>
                </button>
              ` : `
                <button class="pv-action-btn pv-action-hint" data-action="hint">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 019 14"/></svg>
                  <span>Show Hint</span>
                </button>
                <button class="pv-action-btn pv-action-outline" data-action="solution">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <span>Show Solution</span>
                </button>
              `}
              <button class="pv-action-btn pv-action-outline" data-action="lichess">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>Analyze on Lichess</span>
              </button>
              <button class="pv-action-btn pv-action-report" data-action="report">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                <span>Report Issue</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(overlay)

    // Show solved status if already solved
    if (isSolved) {
      this._pvShowStatus(overlay, 'success', 'Puzzle Solved!', 'You already solved this puzzle. Click Retry to solve again.')
    }

    // Initialize board
    setTimeout(() => {
      const boardEl = document.getElementById('pv-board')
      if (!boardEl) return

      const moveHandler = (orig, dest) => {
        this._pvHandleMove(puzzle, state, orig, dest, overlay, puzzleIndex)
      }

      state.boardInstance = Chessground(boardEl, {
        fen: puzzle.fen,
        orientation: state.orientation,
        coordinates: true,
        movable: {
          free: false,
          color: isSolved ? undefined : (chess.turn() === 'w' ? 'white' : 'black'),
          dests: isSolved ? new Map() : this.getDestinationMap(chess),
          events: { after: moveHandler }
        },
        draggable: { enabled: !isSolved, showGhost: true },
        animation: { enabled: true, duration: 200 },
        highlight: { lastMove: true, check: true },
        selectable: { enabled: !isSolved }
      })

      state._moveHandler = moveHandler

      // Auto-play opponent's first move (only if not already solved)
      if (puzzle.opponentMove && !isSolved) {
        setTimeout(() => {
          this._pvAutoPlayOpponent(puzzle, state, overlay)
        }, 600)
      }
    }, 50)

    this._pvBindEvents(overlay, state, puzzle, puzzleIndex)
  }

  _pvBindEvents(overlay, state, puzzle, puzzleIndex) {
    overlay.querySelector('[data-action="close"]').addEventListener('click', () => {
      this._pvClose(overlay, state)
    })
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._pvClose(overlay, state)
    })
    overlay.querySelector('[data-action="prev"]').addEventListener('click', () => {
      this._pvClose(overlay, state)
      if (puzzleIndex > 0) this.openPuzzleViewer(puzzleIndex - 1)
    })
    overlay.querySelector('[data-action="next"]').addEventListener('click', () => {
      this._pvClose(overlay, state)
      if (puzzleIndex < this.puzzles.length - 1) this.openPuzzleViewer(puzzleIndex + 1)
    })
    overlay.querySelector('[data-action="flip"]').addEventListener('click', () => {
      state.orientation = state.orientation === 'white' ? 'black' : 'white'
      state.boardInstance.set({ orientation: state.orientation })
    })
    overlay.querySelector('[data-action="copy-fen"]').addEventListener('click', (e) => {
      navigator.clipboard.writeText(puzzle.fen)
      const btn = e.currentTarget
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
      setTimeout(() => {
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'
      }, 2000)
    })
    overlay.querySelector('[data-action="lichess"]').addEventListener('click', () => {
      window.open(`https://lichess.org/analysis/fromPosition/${encodeURIComponent(puzzle.fen)}`, '_blank')
    })
    overlay.querySelector('[data-action="report"]').addEventListener('click', () => {
      this.handleReport(puzzle.id, puzzle.themeName)
    })

    const hintBtn = overlay.querySelector('[data-action="hint"]')
    if (hintBtn) {
      hintBtn.addEventListener('click', () => this._pvShowHint(puzzle, state, overlay))
    }

    const solBtn = overlay.querySelector('[data-action="solution"]')
    if (solBtn) {
      solBtn.addEventListener('click', () => this._pvShowSolution(puzzle, state, overlay))
    }

    const retryBtn = overlay.querySelector('[data-action="retry"]')
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this._pvClose(overlay, state)
        this.openPuzzleViewer(puzzleIndex, true)
      })
    }
  }

  _pvClose(overlay, state) {
    document.body.style.overflow = ''
    if (state.boardInstance?.destroy) state.boardInstance.destroy()
    document.body.removeChild(overlay)
  }

  _pvAutoPlayOpponent(puzzle, state, overlay) {
    const moveSAN = puzzle.solutionLine[0]
    try {
      const move = state.chess.move(moveSAN)
      if (!move) return
      state.currentMoveIndex = 1
      state.moveLog.push({ moveNum: 1, white: move.san, black: null, whiteType: 'opponent', blackType: null })
      this._pvUpdateBoard(state)
      this._pvRenderMoves(state, overlay)
    } catch { /* skip */ }
  }

  _pvHandleMove(puzzle, state, source, target, overlay, puzzleIndex) {
    const solutionLine = puzzle.solutionLine
    const expectedMove = solutionLine[state.currentMoveIndex]

    let move = null
    try {
      move = state.chess.move({ from: source, to: target, promotion: 'q' })
    } catch {
      return
    }

    if (move.san === expectedMove) {
      state.currentMoveIndex++
      this._pvLogMove(state, move.san, 'correct')
      this._pvRenderMoves(state, overlay)
      this._pvUpdateBoard(state)

      if (state.currentMoveIndex >= solutionLine.length) {
        state.isComplete = true
        state.boardInstance.set({ movable: { color: undefined } })
        this._pvShowStatus(overlay, 'success', 'Puzzle Solved!', 'Great work! You found the correct sequence.')
        this._pvHideActions(overlay, ['hint', 'solution'])
        this._pvShowRetryButton(overlay, state, puzzleIndex)
        this._markCardSolved(puzzleIndex)
        return
      }

      // Auto-play opponent response
      setTimeout(() => {
        const oppMove = solutionLine[state.currentMoveIndex]
        try {
          const opp = state.chess.move(oppMove)
          if (opp) {
            state.currentMoveIndex++
            this._pvLogMove(state, opp.san, 'opponent')
            this._pvRenderMoves(state, overlay)
            this._pvUpdateBoard(state)

            if (state.currentMoveIndex >= solutionLine.length) {
              state.isComplete = true
              state.boardInstance.set({ movable: { color: undefined } })
              this._pvShowStatus(overlay, 'success', 'Puzzle Solved!', 'Great work! You found the correct sequence.')
              this._pvHideActions(overlay, ['hint', 'solution'])
              this._pvShowRetryButton(overlay, state, puzzleIndex)
              this._markCardSolved(puzzleIndex)
            }
          }
        } catch { /* skip */ }
      }, 500)
    } else {
      state.chess.undo()
      this._pvUpdateBoard(state)
      this._pvShowStatus(overlay, 'error', 'Wrong move!', `${move.san} is not the best move here. Try again.`)
      setTimeout(() => {
        const statusEl = overlay.querySelector('#pv-status')
        if (statusEl?.classList.contains('pv-status-error')) {
          statusEl.style.display = 'none'
        }
      }, 3000)
    }
  }

  _pvShowRetryButton(overlay, state, puzzleIndex) {
    const actionsEl = overlay.querySelector('#pv-actions')
    if (!actionsEl || actionsEl.querySelector('[data-action="retry"]')) return

    const retryBtn = document.createElement('button')
    retryBtn.className = 'pv-action-btn pv-action-retry'
    retryBtn.dataset.action = 'retry'
    retryBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
      <span>Retry Puzzle</span>
    `
    retryBtn.addEventListener('click', () => {
      this._pvClose(overlay, state)
      this.openPuzzleViewer(puzzleIndex, true)
    })
    actionsEl.insertBefore(retryBtn, actionsEl.firstChild)
  }

  _pvUpdateBoard(state) {
    const newColor = state.chess.turn() === 'w' ? 'white' : 'black'
    state.boardInstance.set({
      fen: state.chess.fen(),
      turnColor: newColor,
      check: state.chess.inCheck(),
      movable: {
        free: false,
        color: state.isComplete ? undefined : newColor,
        dests: state.isComplete ? new Map() : this.getDestinationMap(state.chess),
        showDests: true,
        events: { after: state._moveHandler }
      }
    })
  }

  _pvLogMove(state, san, type) {
    const lastEntry = state.moveLog[state.moveLog.length - 1]
    if (lastEntry && lastEntry.black === null) {
      state.moveLog[state.moveLog.length - 1] = { ...lastEntry, black: san, blackType: type }
    } else {
      const moveNum = state.moveLog.length + 1
      state.moveLog.push({ moveNum, white: san, whiteType: type, black: null, blackType: null })
    }
  }

  _pvRenderMoves(state, overlay) {
    const container = overlay.querySelector('#pv-moves')
    if (!container) return

    const waitingForMove = !state.isComplete
    container.innerHTML = state.moveLog.map((entry, i) => {
      const isLast = i === state.moveLog.length - 1
      const wCls = entry.whiteType === 'opponent' ? 'pv-move-opp' : entry.whiteType === 'correct' ? 'pv-move-correct' : ''
      const bCls = entry.blackType === 'opponent' ? 'pv-move-opp' : entry.blackType === 'correct' ? 'pv-move-correct' : ''

      return `<div class="pv-move-row ${isLast ? 'pv-move-row-active' : ''}">
        <span class="pv-move-num">${entry.moveNum}.</span>
        <span class="pv-move ${wCls}">${escapeHtml(entry.white)}</span>
        ${entry.black
          ? `<span class="pv-move ${bCls}">${escapeHtml(entry.black)}</span>`
          : (isLast && waitingForMove ? '<span class="pv-move pv-move-waiting">Your move...</span>' : '')}
      </div>`
    }).join('')
  }

  _pvShowStatus(overlay, type, title, message) {
    const el = overlay.querySelector('#pv-status')
    if (!el) return
    el.className = `pv-status-banner pv-status-${type}`
    el.innerHTML = `<div class="pv-status-title">${escapeHtml(title)}</div><div class="pv-status-msg">${escapeHtml(message)}</div>`
    el.style.display = 'flex'
  }

  _pvHideActions(overlay, actions) {
    actions.forEach(action => {
      const btn = overlay.querySelector(`[data-action="${action}"]`)
      if (btn) btn.style.display = 'none'
    })
  }

  _pvShowHint(puzzle, state, overlay) {
    if (state.isComplete) return
    const nextMove = puzzle.solutionLine[state.currentMoveIndex]
    if (!nextMove) return
    const firstChar = nextMove.charAt(0)
    const isCheck = nextMove.endsWith('+') || nextMove.endsWith('#')
    const hint = isCheck
      ? `Think about a check with ${firstChar}`
      : (firstChar === firstChar.toLowerCase() ? 'Consider a pawn move' : `Consider moving your ${firstChar}`)
    this._pvShowStatus(overlay, 'hint', 'Hint', hint)
    const btn = overlay.querySelector('[data-action="hint"]')
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5' }
  }

  _pvShowSolution(puzzle, state, overlay) {
    const playerMoves = puzzle.solutionLine.filter((_, i) => i % 2 === (puzzle.opponentMove ? 1 : 0))
    const text = playerMoves.join(' \u2192 ')
    this._pvShowStatus(overlay, 'solution', 'Solution', text)
    const btn = overlay.querySelector('[data-action="solution"]')
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5' }
  }

  // ==================== Utilities ====================

  handleExport() {
    if (this.puzzles.length === 0) {
      this.showToast('No puzzles to export', 'error')
      return
    }
    const fenList = this.puzzles.map((p, i) => `${i + 1}. ${p.themeName}: ${p.fen}`).join('\n')
    const blob = new Blob([fenList], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chess-puzzles-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    this.showToast('FEN list exported successfully!', 'success')
  }

  handleReport(puzzleId, puzzleTheme) {
    showReportDialog(puzzleId, puzzleTheme, async (id, reason, notes) => {
      try {
        const result = await this.apiClient.reportPuzzle(id, reason, notes)
        if (result.success) {
          this.showToast('Report submitted successfully', 'success')
        } else {
          throw new Error(result.error || 'Failed to submit report')
        }
      } catch (error) {
        this.showToast(error.message, 'error')
        throw error
      }
    })
  }

  showLoading(message = 'Loading...') {
    const loading = document.getElementById('loading')
    if (loading) { loading.querySelector('p').textContent = message; loading.style.display = 'block' }
  }

  hideLoading() {
    const loading = document.getElementById('loading')
    if (loading) loading.style.display = 'none'
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.textContent = message
    const bg = type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#2563eb'
    toast.style.cssText = `position:fixed;top:20px;right:20px;background:${bg};color:white;padding:12px 24px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:100000;font-weight:500;font-size:14px;max-width:400px;animation:slideIn 0.3s ease-out;`
    document.body.appendChild(toast)
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out'
      setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast) }, 300)
    }, 4000)
  }
}
