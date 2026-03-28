/**
 * puzzle-composer.js
 * Full-screen puzzle composer for lesson content.
 * Chess.com-style: board preview (left), form fields (right),
 * per-move hints with student/computer roles.
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
 * @param {string} movesStr - Space-separated SAN moves
 * @param {Chess} chess - Chess.js instance at starting position
 * @returns {Array} Move hint objects
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
        moves.push({
          move: result.san,
          role: i % 2 === 0 ? 'student' : 'computer',
          hint: '',
          explanation: ''
        })
      }
    } catch {
      break
    }
  }
  return moves
}

/**
 * Open the full-screen puzzle composer for a lesson.
 * @param {object} params
 * @param {ApiClient} params.apiClient
 * @param {string} params.lessonId
 * @param {string} params.lessonTitle
 * @param {Function} params.onSave - Called with saved puzzle data
 * @param {Function} params.onClose
 * @param {object|null} params.existingContent - Edit existing content item
 */
export function openPuzzleComposer({ apiClient, lessonId, lessonTitle, onSave, onClose, existingContent = null }) {
  let boardInstance = null
  let chess = new Chess()
  let moveSequence = []
  const isEdit = !!existingContent

  // Load existing data if editing
  if (existingContent) {
    if (existingContent.puzzle_fen) {
      try { chess = new Chess(existingContent.puzzle_fen) } catch { chess = new Chess() }
    }
    if (existingContent.puzzle_hints) {
      try {
        const parsed = typeof existingContent.puzzle_hints === 'string'
          ? JSON.parse(existingContent.puzzle_hints) : existingContent.puzzle_hints
        moveSequence = Array.isArray(parsed) ? parsed : []
      } catch { moveSequence = [] }
    }
    // If no hints but has moves, parse them
    if (moveSequence.length === 0 && existingContent.puzzle_moves) {
      moveSequence = parseMoveSequence(existingContent.puzzle_moves, chess)
    }
  }

  const overlay = document.createElement('div')
  overlay.className = 'pv-overlay'
  overlay.style.cssText = 'z-index:50000;background:#f8fafc;align-items:stretch;justify-content:stretch'

  overlay.innerHTML = buildComposerHTML(lessonTitle, existingContent, moveSequence)
  document.body.appendChild(overlay)
  document.body.style.overflow = 'hidden'

  const close = () => {
    if (boardInstance) boardInstance.destroy()
    document.body.style.overflow = ''
    overlay.remove()
    onClose?.()
  }

  // Wire up events
  wireHeaderEvents(overlay, close)
  wireFenInput(overlay)
  wireMovesInput(overlay)
  wireMoveSequenceEvents(overlay)
  wireSaveEvents(overlay)

  // Initialize board
  initBoard(overlay)

  // If editing, populate fields
  if (existingContent) {
    populateFromExisting(overlay, existingContent)
  }

  // ==================== Board ====================

  function initBoard(el) {
    const boardEl = el.querySelector('#pc-board')
    const fen = chess.fen()
    const turn = chess.turn()

    if (boardInstance) boardInstance.destroy()
    boardInstance = Chessground(boardEl, {
      fen,
      orientation: turn === 'b' ? 'black' : 'white',
      viewOnly: true,
      coordinates: true,
      animation: { enabled: true, duration: 200 },
      highlight: { lastMove: true }
    })
  }

  function refreshBoard() {
    const fenInput = overlay.querySelector('#pc-fen')
    const fen = fenInput.value.trim()
    if (!fen) return

    try {
      chess = new Chess(fen)
      const turn = chess.turn()
      boardInstance.set({
        fen: chess.fen(),
        orientation: turn === 'b' ? 'black' : 'white'
      })
      overlay.querySelector('#pc-turn-badge').textContent = turn === 'w' ? 'White to Move' : 'Black to Move'
      overlay.querySelector('#pc-fen-error').textContent = ''
    } catch {
      overlay.querySelector('#pc-fen-error').textContent = 'Invalid FEN position'
    }
  }

  // ==================== Event Wiring ====================

  function wireHeaderEvents(el, closeFn) {
    el.querySelector('#pc-back').addEventListener('click', closeFn)
  }

  function wireFenInput(el) {
    const fenInput = el.querySelector('#pc-fen')
    let debounceTimer = null
    fenInput.addEventListener('input', () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => refreshBoard(), 300)
    })
  }

  function wireMovesInput(el) {
    const movesInput = el.querySelector('#pc-moves')
    const parseBtn = el.querySelector('#pc-parse-moves')

    parseBtn.addEventListener('click', () => {
      const movesStr = movesInput.value.trim()
      if (!movesStr) return
      const fenInput = el.querySelector('#pc-fen')
      if (!fenInput.value.trim()) return

      try {
        const tempChess = new Chess(fenInput.value.trim())
        moveSequence = parseMoveSequence(movesStr, tempChess)
        renderMoveSequence(el)
      } catch {
        // ignore parse errors
      }
    })
  }

  function wireMoveSequenceEvents(el) {
    el.querySelector('#pc-add-move').addEventListener('click', () => {
      const nextRole = moveSequence.length % 2 === 0 ? 'student' : 'computer'
      moveSequence = [...moveSequence, { move: '', role: nextRole, hint: '', explanation: '' }]
      renderMoveSequence(el)
    })
  }

  function wireSaveEvents(el) {
    el.querySelector('#pc-save').addEventListener('click', async () => {
      const data = collectFormData(el)
      if (!data) return

      try {
        const saveBtn = el.querySelector('#pc-save')
        saveBtn.textContent = 'Saving...'
        saveBtn.disabled = true

        if (isEdit && existingContent.id) {
          await apiClient.updateContent(existingContent.id, data)
        } else {
          await apiClient.createContent(lessonId, {
            content_type: 'puzzle',
            ...data
          })
        }

        onSave?.(data)
        close()
      } catch (err) {
        const saveBtn = el.querySelector('#pc-save')
        saveBtn.textContent = isEdit ? 'Update Puzzle' : 'Save Puzzle'
        saveBtn.disabled = false
        overlay.querySelector('#pc-save-error').textContent = err.message
      }
    })

    el.querySelector('#pc-cancel').addEventListener('click', close)
  }

  // ==================== Rendering ====================

  function renderMoveSequence(el) {
    const container = el.querySelector('#pc-move-list')
    if (moveSequence.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-size:13px">Enter solution moves above and click "Parse Moves" to generate the sequence</div>'
      return
    }

    container.innerHTML = moveSequence.map((m, i) => {
      const isStudent = m.role === 'student'
      const bg = isStudent ? '#f0fdf4' : '#fff7ed'
      const border = isStudent ? '#86efac' : '#fdba74'
      const roleColor = isStudent ? '#059669' : '#ea580c'
      const roleLabel = isStudent ? 'Student' : 'Computer'
      const roleIcon = isStudent ? '♟' : '🤖'

      return `
        <div style="display:flex;gap:8px;align-items:flex-start;padding:10px 12px;background:${bg};border:1px solid ${border};border-radius:8px" data-move-index="${i}">
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

    // Wire move field change events (immutable updates)
    container.querySelectorAll('input[data-field]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.index)
        const field = input.dataset.field
        moveSequence = moveSequence.map((m, i) =>
          i === idx ? { ...m, [field]: input.value } : m
        )
      })
    })

    // Wire remove buttons
    container.querySelectorAll('button[data-remove-move]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.removeMoveAttr || btn.getAttribute('data-remove-move'))
        moveSequence = moveSequence.filter((_, i) => i !== idx)
        // Recalculate roles after removal
        moveSequence = moveSequence.map((m, i) => ({
          ...m,
          role: i % 2 === 0 ? 'student' : 'computer'
        }))
        renderMoveSequence(el)
      })
    })
  }

  function populateFromExisting(el, content) {
    if (content.puzzle_fen) el.querySelector('#pc-fen').value = content.puzzle_fen
    if (content.puzzle_moves) el.querySelector('#pc-moves').value = content.puzzle_moves
    if (content.puzzle_instruction) el.querySelector('#pc-instruction').value = content.puzzle_instruction
    if (content.puzzle_video_url) el.querySelector('#pc-video-url').value = content.puzzle_video_url
    if (content.title) el.querySelector('#pc-title').value = content.title
    if (content.xp_reward) el.querySelector('#pc-xp').value = content.xp_reward

    refreshBoard()
    renderMoveSequence(el)
  }

  function collectFormData(el) {
    const fen = el.querySelector('#pc-fen').value.trim()
    const title = el.querySelector('#pc-title').value.trim()

    if (!fen) {
      el.querySelector('#pc-fen-error').textContent = 'FEN position is required'
      return null
    }
    if (!title) {
      el.querySelector('#pc-save-error').textContent = 'Title is required'
      return null
    }

    // Validate FEN
    try { new Chess(fen) } catch {
      el.querySelector('#pc-fen-error').textContent = 'Invalid FEN position'
      return null
    }

    // Build moves string from sequence
    const movesStr = moveSequence.map(m => m.move).filter(Boolean).join(' ')

    return {
      title,
      puzzle_fen: fen,
      puzzle_moves: movesStr || el.querySelector('#pc-moves').value.trim(),
      puzzle_instruction: el.querySelector('#pc-instruction').value.trim() || null,
      puzzle_hints: moveSequence.length > 0 ? JSON.stringify(moveSequence) : null,
      puzzle_video_url: el.querySelector('#pc-video-url').value.trim() || null,
      xp_reward: parseInt(el.querySelector('#pc-xp').value) || 20
    }
  }

  // Initial render of move sequence
  renderMoveSequence(overlay)
}

// ==================== HTML Builder ====================

function buildComposerHTML(lessonTitle, existingContent, moveSequence) {
  const isEdit = !!existingContent
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
          <div id="pc-turn-badge" style="padding:4px 16px;background:#1e293b;color:#fff;border-radius:12px;font-size:12px;font-weight:600">
            White to Move
          </div>
        </div>

        <!-- Right: Form Panel -->
        <div style="flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:16px">
          <!-- Title -->
          <div>
            <label style="${labelStyle}">Puzzle Title</label>
            <input type="text" id="pc-title" placeholder="e.g. Italian Game Pin Tactic" style="${inputStyle}" value="${escapeHtml(existingContent?.title || '')}">
          </div>

          <!-- FEN Position -->
          <div>
            <label style="${labelStyle}">FEN Position</label>
            <input type="text" id="pc-fen" placeholder="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" style="${inputStyle};font-family:monospace;font-size:12px">
            <div id="pc-fen-error" style="font-size:11px;color:#ef4444;margin-top:4px"></div>
          </div>

          <!-- Instruction to students -->
          <div>
            <label style="${labelStyle}">Instruction to Students</label>
            <textarea id="pc-instruction" rows="2" placeholder="White's threat to f7 is ineffective in this position. How should Black defend and achieve a good game?" style="${inputStyle};resize:vertical"></textarea>
          </div>

          <!-- Solution Moves -->
          <div style="display:flex;gap:12px;align-items:flex-end">
            <div style="flex:1">
              <label style="${labelStyle}">Solution Moves (SAN)</label>
              <input type="text" id="pc-moves" placeholder="Nf6 d4 Bb4 Nxe5 d5" style="${inputStyle};font-family:monospace;font-size:12px">
            </div>
            <div style="display:flex;gap:8px">
              <div style="width:80px">
                <label style="${labelStyle}">XP</label>
                <input type="number" id="pc-xp" value="${existingContent?.xp_reward || 20}" min="5" max="100" style="${inputStyle}">
              </div>
              <button id="pc-parse-moves" style="padding:8px 14px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;height:36px;align-self:flex-end">Parse Moves</button>
            </div>
          </div>

          <!-- Move Sequence -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <label style="${labelStyle};margin-bottom:0">Move Sequence (Student & Computer)</label>
              <button id="pc-add-move" style="padding:4px 10px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;font-size:11px;font-weight:600;color:#059669;cursor:pointer">+ Add Move</button>
            </div>
            <div id="pc-move-list" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto"></div>
          </div>

          <!-- Video URL -->
          <div>
            <label style="${labelStyle}">Video Explanation (Optional)</label>
            <input type="text" id="pc-video-url" placeholder="https://youtube.com/watch?v=..." style="${inputStyle}">
          </div>

          <div id="pc-save-error" style="font-size:12px;color:#ef4444"></div>
        </div>
      </div>

      <!-- Bottom Toolbar -->
      <div style="flex-shrink:0;padding:12px 24px;border-top:1px solid #e2e8f0;background:#fff;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px;color:#64748b">
          ${moveSequence.length > 0 ? `${moveSequence.length} moves configured` : 'No moves configured yet'}
        </div>
        <div style="display:flex;gap:12px">
          <button id="pc-cancel" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font-size:13px;color:#64748b;cursor:pointer">Cancel</button>
          <button id="pc-save" style="padding:10px 24px;border:none;border-radius:8px;background:#059669;font-size:13px;font-weight:600;color:#fff;cursor:pointer">${isEdit ? 'Update Puzzle' : 'Save Puzzle'}</button>
        </div>
      </div>
    </div>
  `
}
