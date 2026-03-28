/**
 * lesson-puzzle-player.js
 * Chess.com-style interactive puzzle player for lesson content.
 * Dark theme, full-screen, per-move hints, computer auto-play with explanations.
 */

import { Chess } from 'chess.js'
import { Chessground } from 'chessground'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Get legal moves as Map for Chessground */
function getLegalMoves(chess) {
  const dests = new Map()
  for (const move of chess.moves({ verbose: true })) {
    if (!dests.has(move.from)) dests.set(move.from, [])
    dests.get(move.from).push(move.to)
  }
  return dests
}

/**
 * Open an interactive puzzle challenge within the lesson player.
 * @param {object} params
 * @param {object} params.item - lesson_content item with puzzle_fen, puzzle_moves, puzzle_hints, etc.
 * @param {string} params.courseTitle - Course title for header
 * @param {number} params.challengeIndex - 0-based index among puzzle items
 * @param {number} params.totalChallenges - Total puzzle count in this lesson
 * @param {Function} params.onComplete - Called when puzzle is solved
 * @param {Function} params.onClose - Called when back is pressed
 * @param {Function} params.onNext - Called to advance to next puzzle
 * @param {Function} params.onPrev - Called to go to previous puzzle
 */
export function openLessonPuzzlePlayer({
  item, courseTitle, challengeIndex, totalChallenges,
  onComplete, onClose, onNext, onPrev
}) {
  let chess = new Chess()
  let boardInstance = null
  let moveIndex = 0
  let solved = false
  let hintRevealed = false

  // Parse puzzle data
  try { chess = new Chess(item.puzzle_fen) } catch { chess = new Chess() }
  const playerColor = chess.turn()
  const orientation = playerColor === 'b' ? 'black' : 'white'

  // Parse hints/move sequence
  let moveSequence = []
  if (item.puzzle_hints) {
    try {
      const parsed = typeof item.puzzle_hints === 'string' ? JSON.parse(item.puzzle_hints) : item.puzzle_hints
      moveSequence = Array.isArray(parsed) ? parsed : []
    } catch { moveSequence = [] }
  }

  // If no hints structure, parse moves string into basic sequence
  if (moveSequence.length === 0 && item.puzzle_moves) {
    const tokens = item.puzzle_moves.trim().split(/\s+/)
    const tempChess = new Chess(item.puzzle_fen)
    for (let i = 0; i < tokens.length; i++) {
      try {
        const result = tempChess.move(tokens[i])
        if (result) {
          moveSequence.push({ move: result.san, role: i % 2 === 0 ? 'student' : 'computer', hint: '', explanation: '' })
        }
      } catch { break }
    }
  }

  const overlay = document.createElement('div')
  overlay.className = 'pv-overlay'
  overlay.style.cssText = 'z-index:55000;background:#1a1a2e;align-items:stretch;justify-content:stretch'
  overlay.innerHTML = buildPlayerHTML()
  document.body.appendChild(overlay)
  document.body.style.overflow = 'hidden'

  const close = () => {
    if (boardInstance) boardInstance.destroy()
    document.body.style.overflow = ''
    overlay.remove()
    onClose?.()
  }

  // Init board
  const boardEl = overlay.querySelector('#lpp-board')
  boardInstance = Chessground(boardEl, {
    fen: chess.fen(),
    orientation,
    turnColor: playerColor === 'w' ? 'white' : 'black',
    movable: {
      free: false,
      color: playerColor === 'w' ? 'white' : 'black',
      dests: getLegalMoves(chess),
      events: { after: handleStudentMove }
    },
    draggable: { enabled: true, showGhost: true },
    animation: { enabled: true, duration: 200 },
    highlight: { lastMove: true, check: true },
    premovable: { enabled: false }
  })

  // Wire events
  overlay.querySelector('#lpp-back').addEventListener('click', close)
  overlay.querySelector('#lpp-hint-btn')?.addEventListener('click', revealHint)
  overlay.querySelector('#lpp-video-btn')?.addEventListener('click', openVideo)
  overlay.querySelector('#lpp-prev')?.addEventListener('click', () => { close(); onPrev?.() })
  overlay.querySelector('#lpp-next')?.addEventListener('click', () => { close(); onNext?.() })
  overlay.querySelector('#lpp-reset')?.addEventListener('click', resetPuzzle)

  // ==================== Move Handling ====================

  function handleStudentMove(from, to) {
    const currentMoveData = moveSequence[moveIndex]
    if (!currentMoveData || solved) return

    // Try the move
    const result = chess.move({ from, to, promotion: 'q' })
    if (!result) {
      // Invalid move - reset board
      boardInstance.set({ fen: chess.fen(), turnColor: chess.turn() === 'w' ? 'white' : 'black' })
      return
    }

    // Check if correct
    if (result.san === currentMoveData.move) {
      // Correct move
      moveIndex++
      hintRevealed = false
      showFeedback('correct', currentMoveData.explanation || 'Correct!')
      updateBoard()

      // Play computer response after delay
      setTimeout(() => playComputerMoves(), 800)
    } else {
      // Wrong move - undo and restore full movable config
      chess.undo()
      boardInstance.set({
        fen: chess.fen(),
        turnColor: chess.turn() === 'w' ? 'white' : 'black',
        movable: {
          free: false,
          color: playerColor === 'w' ? 'white' : 'black',
          dests: getLegalMoves(chess),
          events: { after: handleStudentMove }
        }
      })
      showFeedback('wrong', 'Not quite. Try again!')
    }
  }

  function playComputerMoves() {
    if (moveIndex >= moveSequence.length) {
      completePuzzle()
      return
    }

    const nextMove = moveSequence[moveIndex]
    if (nextMove.role !== 'computer') {
      // Student's turn - enable board
      enableStudentMove()
      updateMoveInfo()
      return
    }

    // Computer move
    try {
      const result = chess.move(nextMove.move)
      if (result) {
        moveIndex++
        showFeedback('computer', nextMove.explanation || `Computer plays ${result.san}`)
        updateBoard()

        // Check if more computer moves follow or puzzle is done
        setTimeout(() => {
          if (moveIndex >= moveSequence.length) {
            completePuzzle()
          } else if (moveSequence[moveIndex].role === 'computer') {
            playComputerMoves()
          } else {
            enableStudentMove()
            updateMoveInfo()
          }
        }, 600)
      }
    } catch {
      completePuzzle()
    }
  }

  function enableStudentMove() {
    boardInstance.set({
      fen: chess.fen(),
      turnColor: chess.turn() === 'w' ? 'white' : 'black',
      movable: {
        free: false,
        color: playerColor === 'w' ? 'white' : 'black',
        dests: getLegalMoves(chess),
        events: { after: handleStudentMove }
      }
    })
  }

  function updateBoard() {
    boardInstance.set({
      fen: chess.fen(),
      lastMove: undefined,
      movable: { dests: new Map() }
    })
  }

  function completePuzzle() {
    solved = true
    boardInstance.set({ movable: { dests: new Map() } })
    showFeedback('complete', 'Challenge Complete!')
    updateProgressBar()
    onComplete?.()
  }

  function resetPuzzle() {
    chess = new Chess(item.puzzle_fen)
    moveIndex = 0
    solved = false
    hintRevealed = false
    boardInstance.set({
      fen: chess.fen(),
      orientation,
      turnColor: playerColor === 'w' ? 'white' : 'black',
      movable: {
        free: false,
        color: playerColor === 'w' ? 'white' : 'black',
        dests: getLegalMoves(chess),
        events: { after: handleStudentMove }
      }
    })
    clearFeedback()
    updateMoveInfo()
  }

  // ==================== UI Updates ====================

  function showFeedback(type, message) {
    const feedbackEl = overlay.querySelector('#lpp-feedback')
    if (!feedbackEl || !message) return

    const colors = {
      correct: { bg: '#065f46', border: '#10b981', text: '#a7f3d0', icon: '✓' },
      wrong: { bg: '#7f1d1d', border: '#ef4444', text: '#fecaca', icon: '✗' },
      computer: { bg: '#1e3a5f', border: '#60a5fa', text: '#bfdbfe', icon: '🤖' },
      complete: { bg: '#065f46', border: '#10b981', text: '#a7f3d0', icon: '🎉' }
    }
    const c = colors[type] || colors.correct

    const entry = document.createElement('div')
    entry.style.cssText = `padding:10px 14px;background:${c.bg};border:1px solid ${c.border};border-radius:8px;color:${c.text};font-size:13px;line-height:1.4`
    entry.innerHTML = `<span style="margin-right:6px">${c.icon}</span>${escapeHtml(message)}`
    feedbackEl.appendChild(entry)

    // Auto-scroll to latest message
    feedbackEl.scrollTop = feedbackEl.scrollHeight
  }

  function clearFeedback() {
    const feedbackEl = overlay.querySelector('#lpp-feedback')
    if (feedbackEl) feedbackEl.innerHTML = ''
  }

  function revealHint() {
    if (solved || hintRevealed || moveIndex >= moveSequence.length) return
    const currentMove = moveSequence[moveIndex]
    if (!currentMove?.hint) return
    hintRevealed = true

    // Append hint as a timeline entry instead of a separate element
    const feedbackEl = overlay.querySelector('#lpp-feedback')
    if (!feedbackEl) return
    const entry = document.createElement('div')
    entry.style.cssText = 'padding:10px 14px;background:#1e3a5f;border:1px solid #60a5fa;border-radius:8px;color:#bfdbfe;font-size:13px;line-height:1.4'
    entry.innerHTML = `<span style="margin-right:6px">💡</span>${escapeHtml(currentMove.hint)}`
    feedbackEl.appendChild(entry)
    feedbackEl.scrollTop = feedbackEl.scrollHeight
  }

  function openVideo() {
    const url = item.puzzle_video_url
    if (url && /^https?:\/\//i.test(url)) window.open(url, '_blank')
  }

  function updateMoveInfo() {
    // Reset hint state for next move (hints are in timeline, no separate element)
    if (hintRevealed) {
      hintRevealed = false
    }
  }

  function updateProgressBar() {
    const bar = overlay.querySelector('#lpp-progress-fill')
    if (bar) {
      bar.style.width = '100%'
    }
  }

  // ==================== HTML ====================

  function buildPlayerHTML() {
    const turnLabel = playerColor === 'w' ? 'White to Move' : 'Black to Move'
    const instruction = item.puzzle_instruction || item.title || 'Solve the puzzle'
    const hasVideo = !!item.puzzle_video_url
    const progressPct = totalChallenges > 0 ? Math.round(((challengeIndex) / totalChallenges) * 100) : 0

    return `
      <div style="width:100%;height:100%;display:flex;overflow:hidden">
        <!-- Left: Board -->
        <div style="flex:1;display:flex;align-items:center;justify-content:center;background:#16213e;padding:16px;min-width:0">
          <div style="width:min(100%, min(calc(100vh - 32px), 640px));aspect-ratio:1">
            <div id="lpp-board" style="width:100%;height:100%;border-radius:4px;overflow:hidden"></div>
          </div>
        </div>

        <!-- Right: Sidebar -->
        <div style="width:340px;flex-shrink:0;background:#1a1a2e;display:flex;flex-direction:column;border-left:1px solid #2d2d4a">
          <!-- Header -->
          <div style="padding:16px 20px;border-bottom:1px solid #2d2d4a">
            <button id="lpp-back" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#818cf8;font-size:12px;margin-bottom:8px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>
            <div style="font-size:15px;font-weight:700;color:#e2e8f0">${escapeHtml(courseTitle)}</div>
          </div>

          <!-- Instruction Card -->
          <div style="padding:20px;flex:1;overflow-y:auto">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
              <div style="width:32px;height:32px;border-radius:16px;background:#374151;display:flex;align-items:center;justify-content:center;font-size:14px">♟</div>
              <span style="padding:4px 10px;background:${playerColor === 'b' ? '#374151' : '#f1f5f9'};color:${playerColor === 'b' ? '#e2e8f0' : '#1e293b'};border-radius:10px;font-size:11px;font-weight:600">${turnLabel}</span>
            </div>

            <div style="padding:16px;background:#2d2d4a;border-radius:10px;margin-bottom:16px">
              <div style="font-size:14px;color:#e2e8f0;line-height:1.5">${escapeHtml(instruction)}</div>
            </div>

            <!-- Move Timeline -->
            <div id="lpp-feedback" style="display:flex;flex-direction:column;gap:8px"></div>
          </div>

          <!-- Challenge Progress -->
          <div style="padding:12px 20px;border-top:1px solid #2d2d4a">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-size:12px;font-weight:600;color:#94a3b8">Challenge ${challengeIndex + 1} / ${totalChallenges}</span>
              <span style="font-size:11px;color:#64748b">${progressPct}%</span>
            </div>
            <div style="height:4px;background:#2d2d4a;border-radius:2px;overflow:hidden">
              <div id="lpp-progress-fill" style="width:${progressPct}%;height:100%;background:#818cf8;border-radius:2px;transition:width 0.3s"></div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="padding:12px 20px;border-top:1px solid #2d2d4a;display:flex;gap:8px">
            ${hasVideo ? `
              <button id="lpp-video-btn" style="flex:1;padding:10px;background:#2d2d4a;border:1px solid #3d3d5c;border-radius:8px;color:#e2e8f0;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
                ▶ Video
              </button>
            ` : ''}
            <button id="lpp-hint-btn" style="flex:1;padding:10px;background:#2d2d4a;border:1px solid #3d3d5c;border-radius:8px;color:#e2e8f0;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
              💡 Hint
            </button>
          </div>

          <!-- Navigation -->
          <div style="padding:12px 20px;border-top:1px solid #2d2d4a;display:flex;gap:8px">
            <button id="lpp-prev" ${challengeIndex <= 0 ? 'disabled' : ''} style="flex:1;padding:8px;background:#2d2d4a;border:1px solid #3d3d5c;border-radius:8px;color:#94a3b8;font-size:12px;cursor:pointer;${challengeIndex <= 0 ? 'opacity:0.4;cursor:default' : ''}">← Prev</button>
            <button id="lpp-reset" style="padding:8px 12px;background:#2d2d4a;border:1px solid #3d3d5c;border-radius:8px;color:#94a3b8;font-size:12px;cursor:pointer">Reset</button>
            <button id="lpp-next" ${challengeIndex >= totalChallenges - 1 ? 'disabled' : ''} style="flex:1;padding:8px;background:#2d2d4a;border:1px solid #3d3d5c;border-radius:8px;color:#94a3b8;font-size:12px;cursor:pointer;${challengeIndex >= totalChallenges - 1 ? 'opacity:0.4;cursor:default' : ''}">Next →</button>
          </div>
        </div>
      </div>
    `
  }
}
