/**
 * puzzle-composer.js
 * Full-screen puzzle composer for lesson content.
 * Chess.com-style: board preview (left), form fields (right),
 * per-move hints with student/computer roles.
 * Supports multi-puzzle batch creation and single-puzzle editing.
 */

import { Chess } from 'chess.js'
import { Chessground } from 'chessground'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Parse SAN moves string into move sequence with roles.
 * Odd moves (1st, 3rd, 5th) = student, even moves (2nd, 4th) = computer.
 */
function parseMoveSequence(movesStr, chess) {
  if (!movesStr?.trim()) return []
  const tokens = movesStr.trim().split(/\s+/)
  const tempChess = new Chess(chess.fen())
  const moves = []
  for (let i = 0; i < tokens.length; i++) {
    try {
      const result = tempChess.move(tokens[i])
      if (result) {
        moves.push({ move: result.san, role: i % 2 === 0 ? 'student' : 'computer', hint: '', explanation: '' })
      }
    } catch { break }
  }
  return moves
}

/** Create a blank puzzle data object */
function createBlankPuzzle() {
  return { title: '', puzzle_fen: '', puzzle_moves: '', puzzle_instruction: '', puzzle_hints: [], puzzle_video_url: '', xp_reward: 20 }
}

/** Extract puzzle data from an existing content item */
function contentToPuzzleData(content) {
  let hints = []
  if (content.puzzle_hints) {
    try {
      const parsed = typeof content.puzzle_hints === 'string' ? JSON.parse(content.puzzle_hints) : content.puzzle_hints
      hints = Array.isArray(parsed) ? parsed : []
    } catch { hints = [] }
  }
  if (hints.length === 0 && content.puzzle_moves && content.puzzle_fen) {
    try { hints = parseMoveSequence(content.puzzle_moves, new Chess(content.puzzle_fen)) } catch { /* */ }
  }
  return {
    title: content.title || '', puzzle_fen: content.puzzle_fen || '', puzzle_moves: content.puzzle_moves || '',
    puzzle_instruction: content.puzzle_instruction || '', puzzle_hints: hints,
    puzzle_video_url: content.puzzle_video_url || '', xp_reward: content.xp_reward || 20, id: content.id
  }
}

/**
 * Open the full-screen puzzle composer for a lesson.
 * @param {object} params
 * @param {ApiClient} params.apiClient
 * @param {string} params.lessonId
 * @param {string} params.lessonTitle
 * @param {Function} params.onSave - Called after all puzzles saved
 * @param {Function} params.onClose
 * @param {object|null} params.existingContent - Edit existing content item (single-puzzle mode)
 */
export function openPuzzleComposer({ apiClient, lessonId, lessonTitle, onSave, onClose, existingContent = null }) {
  let boardInstance = null
  let chess = new Chess()
  const isEdit = !!existingContent

  // Multi-puzzle state: array of puzzle data objects
  let puzzles = isEdit ? [contentToPuzzleData(existingContent)] : [createBlankPuzzle()]
  let currentPuzzleIndex = 0

  const overlay = document.createElement('div')
  overlay.className = 'pv-overlay'
  overlay.style.cssText = 'z-index:50000;background:#f8fafc;align-items:stretch;justify-content:stretch'
  document.body.appendChild(overlay)
  document.body.style.overflow = 'hidden'

  const close = () => {
    if (boardInstance) boardInstance.destroy()
    document.body.style.overflow = ''
    overlay.remove()
    onClose?.()
  }

  // ==================== Full Render ====================

  function render() {
    const puzzle = puzzles[currentPuzzleIndex]
    overlay.innerHTML = buildComposerHTML(lessonTitle, puzzle, currentPuzzleIndex, puzzles.length, isEdit)

    // Wire events
    overlay.querySelector('#pc-back').addEventListener('click', close)
    overlay.querySelector('#pc-cancel').addEventListener('click', close)
    wireFenInput()
    wireMovesInput()
    wireMoveSequenceEvents()
    wireSaveEvents()
    wireMultiPuzzleEvents()

    // Populate form from current puzzle data
    populateForm(puzzle)
    initBoard()
    renderMoveSequence()
  }

  // ==================== Board ====================

  function initBoard() {
    const boardEl = overlay.querySelector('#pc-board')
    const puzzle = puzzles[currentPuzzleIndex]
    try { chess = new Chess(puzzle.puzzle_fen || undefined) } catch { chess = new Chess() }
    const turn = chess.turn()

    if (boardInstance) boardInstance.destroy()
    boardInstance = Chessground(boardEl, {
      fen: chess.fen(),
      orientation: turn === 'b' ? 'black' : 'white',
      viewOnly: true,
      coordinates: true,
      animation: { enabled: true, duration: 200 },
      highlight: { lastMove: true }
    })
    overlay.querySelector('#pc-turn-badge').textContent = turn === 'w' ? 'White to Move' : 'Black to Move'
  }

  function refreshBoard() {
    const fen = overlay.querySelector('#pc-fen').value.trim()
    if (!fen) return
    try {
      chess = new Chess(fen)
      boardInstance.set({ fen: chess.fen(), orientation: chess.turn() === 'b' ? 'black' : 'white' })
      overlay.querySelector('#pc-turn-badge').textContent = chess.turn() === 'w' ? 'White to Move' : 'Black to Move'
      overlay.querySelector('#pc-fen-error').textContent = ''
    } catch {
      overlay.querySelector('#pc-fen-error').textContent = 'Invalid FEN position'
    }
  }

  // ==================== Event Wiring ====================

  function wireFenInput() {
    let debounceTimer = null
    overlay.querySelector('#pc-fen').addEventListener('input', () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => refreshBoard(), 300)
    })
  }

  function wireMovesInput() {
    overlay.querySelector('#pc-parse-moves').addEventListener('click', () => {
      const movesStr = overlay.querySelector('#pc-moves').value.trim()
      const fenStr = overlay.querySelector('#pc-fen').value.trim()
      if (!movesStr || !fenStr) return
      try {
        const tempChess = new Chess(fenStr)
        puzzles = puzzles.map((p, i) => i === currentPuzzleIndex ? { ...p, puzzle_hints: parseMoveSequence(movesStr, tempChess) } : p)
        renderMoveSequence()
      } catch { /* ignore */ }
    })
  }

  function wireMoveSequenceEvents() {
    overlay.querySelector('#pc-add-move').addEventListener('click', () => {
      const hints = getCurrentHints()
      const nextRole = hints.length % 2 === 0 ? 'student' : 'computer'
      puzzles = puzzles.map((p, i) => i === currentPuzzleIndex ? { ...p, puzzle_hints: [...hints, { move: '', role: nextRole, hint: '', explanation: '' }] } : p)
      renderMoveSequence()
    })
  }

  function wireSaveEvents() {
    overlay.querySelector('#pc-save').addEventListener('click', async () => {
      // Save current form state first
      saveCurrentFormState()

      // Validate all puzzles
      for (let i = 0; i < puzzles.length; i++) {
        const p = puzzles[i]
        if (!p.puzzle_fen) {
          currentPuzzleIndex = i
          render()
          overlay.querySelector('#pc-fen-error').textContent = 'FEN position is required'
          return
        }
        if (!p.title) {
          currentPuzzleIndex = i
          render()
          overlay.querySelector('#pc-save-error').textContent = 'Title is required'
          return
        }
        try { new Chess(p.puzzle_fen) } catch {
          currentPuzzleIndex = i
          render()
          overlay.querySelector('#pc-fen-error').textContent = 'Invalid FEN position'
          return
        }
      }

      const saveBtn = overlay.querySelector('#pc-save')
      saveBtn.textContent = 'Saving...'
      saveBtn.disabled = true

      try {
        for (const p of puzzles) {
          const data = {
            title: p.title,
            puzzle_fen: p.puzzle_fen,
            puzzle_moves: (p.puzzle_hints || []).map(m => m.move).filter(Boolean).join(' ') || p.puzzle_moves,
            puzzle_instruction: p.puzzle_instruction || null,
            puzzle_hints: p.puzzle_hints?.length > 0 ? JSON.stringify(p.puzzle_hints) : null,
            puzzle_video_url: p.puzzle_video_url || null,
            xp_reward: p.xp_reward || 20
          }
          if (isEdit && p.id) {
            await apiClient.updateContent(p.id, data)
          } else {
            await apiClient.createContent(lessonId, { content_type: 'puzzle', ...data })
          }
        }
        onSave?.()
        close()
      } catch (err) {
        saveBtn.textContent = isEdit ? 'Update Puzzle' : 'Save All Puzzles'
        saveBtn.disabled = false
        overlay.querySelector('#pc-save-error').textContent = err.message
      }
    })
  }

  function wireMultiPuzzleEvents() {
    // Add Puzzle button
    const addBtn = overlay.querySelector('#pc-add-puzzle')
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        saveCurrentFormState()
        puzzles = [...puzzles, createBlankPuzzle()]
        currentPuzzleIndex = puzzles.length - 1
        render()
      })
    }

    // Delete current puzzle
    const deleteBtn = overlay.querySelector('#pc-delete-puzzle')
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (puzzles.length <= 1) return
        puzzles = puzzles.filter((_, i) => i !== currentPuzzleIndex)
        currentPuzzleIndex = Math.min(currentPuzzleIndex, puzzles.length - 1)
        render()
      })
    }

    // Prev/Next puzzle navigation
    overlay.querySelector('#pc-prev-puzzle')?.addEventListener('click', () => {
      if (currentPuzzleIndex <= 0) return
      saveCurrentFormState()
      currentPuzzleIndex--
      render()
    })
    overlay.querySelector('#pc-next-puzzle')?.addEventListener('click', () => {
      if (currentPuzzleIndex >= puzzles.length - 1) return
      saveCurrentFormState()
      currentPuzzleIndex++
      render()
    })
  }

  // ==================== State Management ====================

  function getCurrentHints() {
    return puzzles[currentPuzzleIndex].puzzle_hints || []
  }

  function saveCurrentFormState() {
    const el = overlay
    puzzles = puzzles.map((p, i) => {
      if (i !== currentPuzzleIndex) return p
      return {
        ...p,
        title: el.querySelector('#pc-title')?.value?.trim() || '',
        puzzle_fen: el.querySelector('#pc-fen')?.value?.trim() || '',
        puzzle_moves: el.querySelector('#pc-moves')?.value?.trim() || '',
        puzzle_instruction: el.querySelector('#pc-instruction')?.value?.trim() || '',
        puzzle_video_url: el.querySelector('#pc-video-url')?.value?.trim() || '',
        xp_reward: parseInt(el.querySelector('#pc-xp')?.value) || 20
      }
    })
  }

  function populateForm(puzzle) {
    const el = overlay
    el.querySelector('#pc-title').value = puzzle.title || ''
    el.querySelector('#pc-fen').value = puzzle.puzzle_fen || ''
    el.querySelector('#pc-moves').value = puzzle.puzzle_moves || ''
    el.querySelector('#pc-instruction').value = puzzle.puzzle_instruction || ''
    el.querySelector('#pc-video-url').value = puzzle.puzzle_video_url || ''
    el.querySelector('#pc-xp').value = puzzle.xp_reward || 20
  }

  // ==================== Move Sequence Rendering ====================

  function renderMoveSequence() {
    const container = overlay.querySelector('#pc-move-list')
    const hints = getCurrentHints()

    if (hints.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px">Enter solution moves above and click "Parse Moves" to generate the sequence</div>'
      return
    }

    container.innerHTML = hints.map((m, i) => {
      const isStudent = m.role === 'student'
      const bg = isStudent ? '#f0fdf4' : '#fff7ed'
      const border = isStudent ? '#86efac' : '#fdba74'
      const roleColor = isStudent ? '#059669' : '#ea580c'
      const roleLabel = isStudent ? 'Student' : 'Computer'
      const roleIcon = isStudent ? '♟' : '🤖'

      return `
        <div style="display:flex;gap:8px;align-items:flex-start;padding:10px 12px;background:${bg};border:1px solid ${border};border-radius:8px">
          <div style="min-width:28px;text-align:center">
            <span style="font-size:11px;font-weight:700;color:${roleColor}">${roleIcon}</span>
            <div style="font-size:9px;font-weight:600;color:${roleColor};text-transform:uppercase">${roleLabel}</div>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;gap:8px;align-items:center">
              <input type="text" value="${escapeHtml(m.move)}" placeholder="e.g. Nf6"
                style="width:70px;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:monospace"
                data-field="move" data-index="${i}">
              <span style="font-size:11px;color:#94a3b8">Move ${i + 1}</span>
            </div>
            ${isStudent ? `
              <input type="text" value="${escapeHtml(m.hint)}" placeholder="Hint: e.g. Block the attack on f7"
                style="width:100%;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px"
                data-field="hint" data-index="${i}">
            ` : ''}
            <input type="text" value="${escapeHtml(m.explanation)}" placeholder="${isStudent ? 'After correct: e.g. Great! Nf6 blocks the threat' : 'Explanation: e.g. White pushes for center control'}"
              style="width:100%;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px"
              data-field="explanation" data-index="${i}">
          </div>
          <button data-remove-move="${i}" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:16px;padding:4px" title="Remove move">&times;</button>
        </div>
      `
    }).join('')

    // Wire move field changes (immutable)
    container.querySelectorAll('input[data-field]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.index)
        const field = input.dataset.field
        const updated = getCurrentHints().map((m, i) => i === idx ? { ...m, [field]: input.value } : m)
        puzzles = puzzles.map((p, i) => i === currentPuzzleIndex ? { ...p, puzzle_hints: updated } : p)
      })
    })

    // Wire remove buttons
    container.querySelectorAll('button[data-remove-move]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-remove-move'))
        let updated = getCurrentHints().filter((_, i) => i !== idx)
        updated = updated.map((m, i) => ({ ...m, role: i % 2 === 0 ? 'student' : 'computer' }))
        puzzles = puzzles.map((p, i) => i === currentPuzzleIndex ? { ...p, puzzle_hints: updated } : p)
        renderMoveSequence()
      })
    })
  }

  // Initial render
  render()
}

// ==================== HTML Builder ====================

function buildComposerHTML(lessonTitle, puzzle, puzzleIndex, puzzleCount, isEdit) {
  const inputStyle = 'width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;font-family:inherit'
  const labelStyle = 'display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:4px'

  return `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden">
      <!-- Header -->
      <div style="flex-shrink:0;padding:12px 24px;border-bottom:1px solid #e2e8f0;background:#fff;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:12px">
          <button id="pc-back" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#6366f1;font-size:13px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div style="width:1px;height:24px;background:#e2e8f0"></div>
          <div>
            <div style="font-size:16px;font-weight:700;color:#1e293b">Puzzle Composer</div>
            <div style="font-size:11px;color:#94a3b8">${escapeHtml(lessonTitle)}</div>
          </div>
        </div>
        <span style="padding:4px 12px;background:#fef3c7;border-radius:12px;font-size:11px;font-weight:600;color:#92400e">${isEdit ? 'Editing' : 'Draft'}</span>
      </div>

      <!-- Main Content -->
      <div style="flex:1;display:flex;overflow:hidden">
        <!-- Left: Board Preview -->
        <div style="width:45%;min-width:360px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f1f5f9;padding:24px;gap:12px">
          <div id="pc-board" style="width:min(100%, 480px);aspect-ratio:1;border-radius:4px;overflow:hidden"></div>
          <div id="pc-turn-badge" style="padding:4px 16px;background:#1e293b;color:#fff;border-radius:12px;font-size:12px;font-weight:600">White to Move</div>
        </div>

        <!-- Right: Form Panel -->
        <div style="flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:16px">
          <div>
            <label style="${labelStyle}">Puzzle Title</label>
            <input type="text" id="pc-title" placeholder="e.g. Italian Game Pin Tactic" style="${inputStyle}">
          </div>
          <div>
            <label style="${labelStyle}">FEN Position</label>
            <input type="text" id="pc-fen" placeholder="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" style="${inputStyle};font-family:monospace;font-size:12px">
            <div id="pc-fen-error" style="font-size:11px;color:#ef4444;margin-top:4px"></div>
          </div>
          <div>
            <label style="${labelStyle}">Instruction to Students</label>
            <textarea id="pc-instruction" rows="2" placeholder="White's threat to f7 is ineffective. How should Black defend?" style="${inputStyle};resize:vertical"></textarea>
          </div>
          <div style="display:flex;gap:12px;align-items:flex-end">
            <div style="flex:1">
              <label style="${labelStyle}">Solution Moves (SAN)</label>
              <input type="text" id="pc-moves" placeholder="Nf6 d4 Bb4 Nxe5 d5" style="${inputStyle};font-family:monospace;font-size:12px">
            </div>
            <div style="display:flex;gap:8px">
              <div style="width:80px">
                <label style="${labelStyle}">XP</label>
                <input type="number" id="pc-xp" value="20" min="5" max="100" style="${inputStyle}">
              </div>
              <button id="pc-parse-moves" style="padding:8px 14px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;height:36px;align-self:flex-end">Parse Moves</button>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <label style="${labelStyle};margin-bottom:0">Move Sequence (Student & Computer)</label>
              <button id="pc-add-move" style="padding:4px 10px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;font-size:11px;font-weight:600;color:#059669;cursor:pointer">+ Add Move</button>
            </div>
            <div id="pc-move-list" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto"></div>
          </div>
          <div>
            <label style="${labelStyle}">Video Explanation (Optional)</label>
            <input type="text" id="pc-video-url" placeholder="https://youtube.com/watch?v=..." style="${inputStyle}">
          </div>
          <div id="pc-save-error" style="font-size:12px;color:#ef4444"></div>
        </div>
      </div>

      <!-- Bottom Toolbar -->
      <div style="flex-shrink:0;padding:12px 24px;border-top:1px solid #e2e8f0;background:#fff;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:16px">
          <!-- Puzzle navigation -->
          <div style="display:flex;align-items:center;gap:8px">
            <button id="pc-prev-puzzle" ${puzzleIndex <= 0 ? 'disabled' : ''} style="width:28px;height:28px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;${puzzleIndex <= 0 ? 'opacity:0.3;cursor:default' : ''}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style="font-size:13px;font-weight:600;color:#1e293b">Challenge ${puzzleIndex + 1} / ${puzzleCount}</span>
            <button id="pc-next-puzzle" ${puzzleIndex >= puzzleCount - 1 ? 'disabled' : ''} style="width:28px;height:28px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;${puzzleIndex >= puzzleCount - 1 ? 'opacity:0.3;cursor:default' : ''}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          ${!isEdit ? `
            <button id="pc-add-puzzle" style="display:flex;align-items:center;gap:6px;padding:8px 14px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;font-size:12px;font-weight:600;color:#4f46e5;cursor:pointer">+ Add Puzzle</button>
          ` : ''}
          ${puzzleCount > 1 && !isEdit ? `
            <button id="pc-delete-puzzle" style="display:flex;align-items:center;gap:4px;padding:8px 12px;background:#fff;border:1px solid #fecaca;border-radius:8px;font-size:12px;color:#dc2626;cursor:pointer" title="Remove this puzzle">&times; Remove</button>
          ` : ''}
        </div>
        <div style="display:flex;gap:12px">
          <button id="pc-cancel" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font-size:13px;color:#64748b;cursor:pointer">Cancel</button>
          <button id="pc-save" style="padding:10px 24px;border:none;border-radius:8px;background:#059669;font-size:13px;font-weight:600;color:#fff;cursor:pointer">${isEdit ? 'Update Puzzle' : puzzleCount > 1 ? 'Save All Puzzles' : 'Save Puzzle'}</button>
        </div>
      </div>
    </div>
  `
}
