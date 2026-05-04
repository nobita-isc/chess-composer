/**
 * content-item-puzzle.js
 * Read-only summary card for puzzle content items.
 * "Open Composer" launches puzzle-composer.js full-screen.
 * On composer close, triggers onRefresh() so list re-fetches.
 * Pattern: createContentItem({ item, onDelete, onRefresh, apiClient, lessonTitle }) → { element, update(item), destroy() }
 */

import { showAppConfirm } from '../shared/app-dialogs.js'
import { openPuzzleComposer } from './puzzle-composer.js'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function puzzleSummary(item) {
  let prefix = ''
  if (item.puzzle_challenges) {
    try {
      const ch = typeof item.puzzle_challenges === 'string' ? JSON.parse(item.puzzle_challenges) : item.puzzle_challenges
      if (Array.isArray(ch) && ch.length > 1) prefix = `${ch.length} challenges — `
    } catch { /* */ }
  }
  if (item.puzzle_instruction) return prefix + item.puzzle_instruction.substring(0, 60) + (item.puzzle_instruction.length > 60 ? '...' : '')
  if (item.puzzle_fen) return prefix + `FEN: ${item.puzzle_fen.substring(0, 40)}...`
  return prefix + 'No position set'
}

/**
 * @param {object} opts
 * @param {object} opts.item
 * @param {Function} opts.onDelete   - async (id) => void
 * @param {Function} opts.onRefresh  - () => void — re-fetch list after composer closes with save
 * @param {object}  opts.apiClient
 * @param {string}  [opts.lessonTitle]
 */
export function createContentItem({ item: initialItem, onDelete, onRefresh, apiClient, lessonTitle = '' }) {
  let item = { ...initialItem }

  const el = document.createElement('div')
  el.className = 'ci-card ci-puzzle'

  function render() {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px 12px 16px">
        <span class="ci-type-icon">♟</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.title) || '<em style="color:#94a3b8;font-style:normal">Untitled puzzle</em>'}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:1px">${escapeHtml(puzzleSummary(item))}</div>
        </div>
        <span class="ci-type-tag">PUZZLE</span>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="ci-open-composer" style="padding:5px 12px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;font-size:12px;color:#475569;cursor:pointer;font-weight:500">Open Composer</button>
          <button class="ci-delete" style="padding:5px 10px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;font-size:12px;color:#94a3b8;cursor:pointer">Delete</button>
        </div>
      </div>
    `
    bindEvents()
  }

  function bindEvents() {
    el.querySelector('.ci-open-composer')?.addEventListener('click', () => {
      openPuzzleComposer({
        apiClient,
        lessonId: item.lesson_id,
        lessonTitle,
        existingContent: item,
        onSave: () => onRefresh?.(),
        onClose: () => {}
      })
    })

    el.querySelector('.ci-delete')?.addEventListener('click', async () => {
      const ok = await showAppConfirm({
        title: 'Delete puzzle?',
        message: 'Remove this puzzle from the lesson?',
        confirmLabel: 'Delete',
        confirmColor: '#dc2626',
        icon: 'delete'
      })
      if (ok) onDelete(item.id)
    })
  }

  render()

  return {
    element: el,
    update(newItem) { item = { ...newItem }; render() },
    destroy() {}
  }
}
