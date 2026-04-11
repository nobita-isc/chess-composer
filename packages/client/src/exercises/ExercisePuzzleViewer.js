/**
 * ExercisePuzzleViewer.js
 * Reusable puzzle viewer modal for exercise puzzles.
 * Delegates board interaction to shared InteractivePuzzleBoard.
 * Owns: modal UI, grading, navigation, hints/solution display.
 */

import { InteractivePuzzleBoard } from '../shared/interactive-puzzle-board.js'
import { escapeHtml, uciMovesToSan } from '../shared/chess-puzzle-utils.js'

function getDifficultyInfo(rating) {
  if (rating >= 2000) return { label: 'Advanced', cls: 'badge-advanced' }
  if (rating >= 1500) return { label: 'Intermediate', cls: 'badge-intermediate' }
  return { label: 'Beginner', cls: 'badge-beginner' }
}

/** Convert raw exercise puzzle to display format */
function convertExercisePuzzle(puzzle, index) {
  const uciMoves = (puzzle.moves || '').split(' ').filter(Boolean)
  const sanMoves = uciMovesToSan(puzzle.fen, uciMoves)

  // Determine whose turn from FEN (active color field)
  const fenTurn = puzzle.fen.split(' ')[1] === 'w' ? 'w' : 'b'
  const hasOpponentMove = sanMoves.length > 1
  const sideToFind = hasOpponentMove
    ? (fenTurn === 'w' ? 'Black' : 'White')
    : (fenTurn === 'w' ? 'White' : 'Black')

  const themes = typeof puzzle.themes === 'string'
    ? puzzle.themes.split(',').map(t => t.trim()).filter(Boolean)
    : (puzzle.themes || [])

  const movesCount = hasOpponentMove
    ? Math.ceil((sanMoves.length - 1) / 2)
    : Math.ceil(sanMoves.length / 2)

  return {
    id: puzzle.id || `ex_${index}`,
    fen: puzzle.fen,
    uciMoves,
    sanMoves,
    rating: puzzle.rating || 0,
    themeName: themes[0] ? themes[0].charAt(0).toUpperCase() + themes[0].slice(1) : 'Puzzle',
    sideToFind,
    movesCount,
    hasOpponentMove
  }
}

/**
 * Open a puzzle viewer modal for exercise puzzles.
 * @param {Object} exercise - Exercise data with { puzzles, name, week_label }
 * @param {Object} [options] - Optional config { startIndex, gradingMode, assignment, apiClient, onGraded }
 */
export function openExercisePuzzleViewer(exercise, options = {}) {
  const rawPuzzles = exercise.puzzles || []
  if (rawPuzzles.length === 0) return

  const puzzles = rawPuzzles.map((p, i) => convertExercisePuzzle(p, i))
  const title = exercise.name || exercise.week_label || 'Exercise'
  const startIndex = options.startIndex || 0

  const gradingCtx = options.gradingMode ? {
    enabled: true,
    results: new Array(puzzles.length).fill(null),
    assignment: options.assignment,
    apiClient: options.apiClient,
    onGraded: options.onGraded
  } : null

  // Load existing puzzle_results if available
  if (gradingCtx && options.assignment?.puzzle_results) {
    const existing = options.assignment.puzzle_results.split(',')
    existing.forEach((v, i) => {
      if (i < puzzles.length) {
        gradingCtx.results[i] = v === '1' ? true : v === '0' ? false : null
      }
    })
  }

  _openViewer(puzzles, title, startIndex, gradingCtx)
}

function _openViewer(puzzles, title, puzzleIndex, gradingCtx = null) {
  const puzzle = puzzles[puzzleIndex]
  if (!puzzle) return

  const diff = getDifficultyInfo(puzzle.rating)
  const moveLog = []
  let puzzleBoard = null

  document.body.style.overflow = 'hidden'

  const overlay = document.createElement('div')
  overlay.className = 'pv-overlay'
  overlay.innerHTML = `
    <div class="pv-dialog">
      <div class="pv-header">
        <div class="pv-header-left">
          <span class="pv-title">${escapeHtml(title)} - #${puzzleIndex + 1}</span>
          <span class="badge badge-theme">${escapeHtml(puzzle.themeName)}</span>
          <span class="badge ${diff.cls}">${diff.label}</span>
        </div>
        <div class="pv-header-right">
          <button class="pv-nav-btn" data-action="prev" ${puzzleIndex === 0 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="pv-nav-text">${puzzleIndex + 1} / ${puzzles.length}</span>
          <button class="pv-nav-btn pv-nav-btn-primary" data-action="next" ${puzzleIndex === puzzles.length - 1 ? 'disabled' : ''}>
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
            <div id="epv-board" class="pv-board"></div>
          </div>
          <button class="pv-flip-btn" data-action="flip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            <span>Flip Board</span>
          </button>
        </div>
        <div class="pv-panel">
          <div class="pv-status-banner" id="epv-status" style="display:none;"></div>
          <div class="pv-info-card">
            <div class="pv-info-row"><span class="pv-info-label">Position</span><span class="pv-info-value">${escapeHtml(puzzle.sideToFind)} to move</span></div>
            <div class="pv-info-row"><span class="pv-info-label">Rating</span><span class="pv-info-value">${puzzle.rating || 'N/A'}</span></div>
            <div class="pv-info-row"><span class="pv-info-label">Solve in</span><span class="pv-info-value">${puzzle.movesCount} move${puzzle.movesCount > 1 ? 's' : ''}</span></div>
          </div>
          <div class="pv-moves-card">
            <div class="pv-moves-label">Moves</div>
            <div class="pv-moves-list" id="epv-moves"></div>
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
          ${gradingCtx ? `
          <div class="pv-grade-section" id="epv-grade">
            <div class="pv-grade-label">Grade this puzzle</div>
            <div class="pv-grade-buttons">
              <button class="pv-grade-btn pv-grade-correct ${gradingCtx.results[puzzleIndex] === true ? 'active' : ''}" data-action="grade-correct">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Correct</span>
              </button>
              <button class="pv-grade-btn pv-grade-wrong ${gradingCtx.results[puzzleIndex] === false ? 'active' : ''}" data-action="grade-wrong">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span>Wrong</span>
              </button>
            </div>
            <div class="pv-grade-status" id="epv-grade-status">
              ${_gradeSummaryHtml(gradingCtx)}
            </div>
          </div>
          ` : ''}
          <div class="pv-actions">
            <button class="pv-action-btn pv-action-hint" data-action="hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 019 14"/></svg>
              <span>Show Hint</span>
            </button>
            <button class="pv-action-btn pv-action-outline" data-action="solution">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <span>Show Solution</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  let gradeKeyHandler = null

  const close = () => {
    document.body.style.overflow = ''
    if (gradeKeyHandler) document.removeEventListener('keydown', gradeKeyHandler)
    if (puzzleBoard) puzzleBoard.destroy()
    document.body.removeChild(overlay)
    if (gradingCtx?.onGraded) gradingCtx.onGraded()
  }

  const navigateTo = (idx) => {
    document.body.style.overflow = ''
    if (gradeKeyHandler) document.removeEventListener('keydown', gradeKeyHandler)
    if (puzzleBoard) puzzleBoard.destroy()
    document.body.removeChild(overlay)
    _openViewer(puzzles, title, idx, gradingCtx)
  }

  // Init board via shared module
  setTimeout(() => {
    const boardEl = document.getElementById('epv-board')
    if (!boardEl) return

    puzzleBoard = new InteractivePuzzleBoard({
      fen: puzzle.fen,
      solutionMoves: puzzle.uciMoves,
      boardEl,
      onCorrectMove: (san, idx) => {
        _logMove(moveLog, san, 'correct')
        _renderMoves(moveLog, puzzleBoard?.getState()?.isComplete === true, overlay)
      },
      onWrongMove: (san) => {
        _showStatus(overlay, 'error', 'Wrong move!', `${san} is not the best move here. Try again.`)
        setTimeout(() => {
          const statusEl = overlay.querySelector('#epv-status')
          if (statusEl?.classList.contains('pv-status-error')) statusEl.style.display = 'none'
        }, 3000)
      },
      onOpponentMove: (san, idx) => {
        _logMove(moveLog, san, 'opponent')
        _renderMoves(moveLog, false, overlay)
      },
      onPuzzleComplete: () => {
        _renderMoves(moveLog, true, overlay)
        _showStatus(overlay, 'success', 'Puzzle Solved!', 'Great work! You found the correct sequence.')
        _hideActions(overlay, ['hint', 'solution'])
      }
    })
    puzzleBoard.init()
  }, 50)

  // --- Event handlers ---
  overlay.querySelector('[data-action="close"]').addEventListener('click', close)
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('[data-action="prev"]').addEventListener('click', () => { if (puzzleIndex > 0) navigateTo(puzzleIndex - 1) })
  overlay.querySelector('[data-action="next"]').addEventListener('click', () => { if (puzzleIndex < puzzles.length - 1) navigateTo(puzzleIndex + 1) })
  overlay.querySelector('[data-action="flip"]').addEventListener('click', () => { if (puzzleBoard) puzzleBoard.flip() })
  overlay.querySelector('[data-action="copy-fen"]').addEventListener('click', (e) => {
    navigator.clipboard.writeText(puzzle.fen)
    const btn = e.currentTarget
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
    setTimeout(() => {
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>'
    }, 2000)
  })
  overlay.querySelector('[data-action="hint"]').addEventListener('click', () => {
    if (!puzzleBoard || puzzleBoard.getState().isComplete) return
    const expectedUci = puzzleBoard.getExpectedMove()
    if (!expectedUci) return
    // Find SAN for the expected move from the pre-computed list
    const state = puzzleBoard.getState()
    const san = puzzle.sanMoves[state.currentMoveIndex]
    const firstChar = san?.charAt(0)
    const hint = firstChar && firstChar === firstChar.toLowerCase() ? 'Consider a pawn move' : `Consider moving your ${firstChar}`
    _showStatus(overlay, 'hint', 'Hint', hint)
    const btn = overlay.querySelector('[data-action="hint"]')
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5' }
  })
  overlay.querySelector('[data-action="solution"]').addEventListener('click', () => {
    const playerMoves = puzzle.sanMoves.filter((_, i) => i % 2 === (puzzle.hasOpponentMove ? 1 : 0))
    _showStatus(overlay, 'solution', 'Solution', playerMoves.join(' \u2192 '))
    const btn = overlay.querySelector('[data-action="solution"]')
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5' }
  })

  // --- Grading handlers ---
  if (gradingCtx) {
    let isSaving = false
    const gradeAndSave = async (result) => {
      if (isSaving) return
      isSaving = true
      gradingCtx.results[puzzleIndex] = result

      const correctBtn = overlay.querySelector('[data-action="grade-correct"]')
      const wrongBtn = overlay.querySelector('[data-action="grade-wrong"]')
      correctBtn.classList.toggle('active', result === true)
      wrongBtn.classList.toggle('active', result === false)

      const statusEl = overlay.querySelector('#epv-grade-status')
      if (statusEl) statusEl.innerHTML = _gradeSummaryHtml(gradingCtx)

      try {
        const score = gradingCtx.results.filter(r => r === true).length
        const puzzleResults = gradingCtx.results.map(r => r === true ? '1' : r === false ? '0' : '').join(',')
        await gradingCtx.apiClient.gradeExercise(gradingCtx.assignment.id, score, null, puzzleResults)
      } catch (err) {
        _showStatus(overlay, 'error', 'Save failed', err.message)
      } finally {
        isSaving = false
      }

      const nextUngraded = gradingCtx.results.findIndex((r, i) => r === null && i > puzzleIndex)
      if (nextUngraded !== -1) {
        setTimeout(() => navigateTo(nextUngraded), 400)
      } else {
        const allGraded = gradingCtx.results.every(r => r !== null)
        if (allGraded) {
          _showStatus(overlay, 'success', 'All puzzles graded!',
            `Score: ${gradingCtx.results.filter(r => r === true).length}/${puzzles.length}`)
        }
      }
    }

    overlay.querySelector('[data-action="grade-correct"]').addEventListener('click', () => gradeAndSave(true))
    overlay.querySelector('[data-action="grade-wrong"]').addEventListener('click', () => gradeAndSave(false))

    gradeKeyHandler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'c' || e.key === 'C') gradeAndSave(true)
      else if (e.key === 'x' || e.key === 'X') gradeAndSave(false)
    }
    document.addEventListener('keydown', gradeKeyHandler)
  }
}

// --- Helper functions ---

function _logMove(moveLog, san, type) {
  const lastEntry = moveLog[moveLog.length - 1]
  if (lastEntry && lastEntry.black === null) {
    moveLog[moveLog.length - 1] = { ...lastEntry, black: san, blackType: type }
  } else {
    const moveNum = moveLog.length + 1
    moveLog.push({ moveNum, white: san, whiteType: type, black: null, blackType: null })
  }
}

function _renderMoves(moveLog, isComplete, overlay) {
  const container = overlay.querySelector('#epv-moves')
  if (!container) return

  container.innerHTML = moveLog.map((entry, i) => {
    const isLast = i === moveLog.length - 1
    const wCls = entry.whiteType === 'opponent' ? 'pv-move-opp' : entry.whiteType === 'correct' ? 'pv-move-correct' : ''
    const bCls = entry.blackType === 'opponent' ? 'pv-move-opp' : entry.blackType === 'correct' ? 'pv-move-correct' : ''

    return `<div class="pv-move-row ${isLast ? 'pv-move-row-active' : ''}">
      <span class="pv-move-num">${entry.moveNum}.</span>
      <span class="pv-move ${wCls}">${escapeHtml(entry.white)}</span>
      ${entry.black
        ? `<span class="pv-move ${bCls}">${escapeHtml(entry.black)}</span>`
        : (isLast && !isComplete ? '<span class="pv-move pv-move-waiting">Your move...</span>' : '')}
    </div>`
  }).join('')
}

function _showStatus(overlay, type, title, message) {
  const el = overlay.querySelector('#epv-status')
  if (!el) return
  el.className = `pv-status-banner pv-status-${type}`
  el.innerHTML = `<div class="pv-status-title">${escapeHtml(title)}</div><div class="pv-status-msg">${escapeHtml(message)}</div>`
  el.style.display = 'flex'
}

function _gradeSummaryHtml(gradingCtx) {
  const correct = gradingCtx.results.filter(r => r === true).length
  const wrong = gradingCtx.results.filter(r => r === false).length
  const remaining = gradingCtx.results.filter(r => r === null).length
  return `<span class="pv-grade-correct-count">${correct} correct</span> · <span class="pv-grade-wrong-count">${wrong} wrong</span> · ${remaining} remaining`
}

function _hideActions(overlay, actions) {
  actions.forEach(action => {
    const btn = overlay.querySelector(`[data-action="${action}"]`)
    if (btn) btn.style.display = 'none'
  })
}
