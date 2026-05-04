/**
 * content-item-quiz.js
 * Inline editor for quiz content items.
 * Fields: title, description, quiz_data JSON (validated on blur).
 * Pattern: createContentItem({ item, onPatch, onDelete }) → { element, update(item), destroy() }
 */

import { debounce } from './shared/debounce.js'
import { showAppConfirm } from '../shared/app-dialogs.js'

const SAVE_DELAY_MS = 600

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function quizSummary(quizData) {
  if (!quizData) return 'No questions'
  try {
    const arr = typeof quizData === 'string' ? JSON.parse(quizData) : quizData
    return Array.isArray(arr) ? `${arr.length} question${arr.length !== 1 ? 's' : ''}` : 'Invalid format'
  } catch { return 'Invalid JSON' }
}

/**
 * @param {object} opts
 * @param {object} opts.item
 * @param {Function} opts.onPatch   - async (id, fields) => void
 * @param {Function} opts.onDelete  - async (id) => void
 */
export function createContentItem({ item: initialItem, onPatch, onDelete }) {
  let item = { ...initialItem }
  let expanded = false
  let saveState = 'idle'
  let jsonError = null
  let serverValues = { title: item.title || '', description: item.description || '', quiz_data: item.quiz_data || '[]' }

  const el = document.createElement('div')
  el.className = 'ci-card ci-quiz'

  function renderHeader() {
    return `
      <div class="ci-header" style="display:flex;align-items:center;gap:10px;padding:12px 14px 12px 16px;cursor:pointer;user-select:none">
        <span class="ci-type-icon">?</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.title) || '<em style="color:#94a3b8;font-style:normal">Untitled</em>'}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:1px">${quizSummary(item.quiz_data)}</div>
        </div>
        <span class="ci-type-tag">QUIZ</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="flex-shrink:0;transition:transform .2s;${expanded ? 'transform:rotate(180deg)' : ''}"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    `
  }

  function getQuizText() {
    if (!item.quiz_data) return '[]'
    try {
      const parsed = typeof item.quiz_data === 'string' ? JSON.parse(item.quiz_data) : item.quiz_data
      return JSON.stringify(parsed, null, 2)
    } catch { return typeof item.quiz_data === 'string' ? item.quiz_data : '[]' }
  }

  function renderBody() {
    if (!expanded) return ''
    return `
      <div class="ci-body" style="padding:0 14px 14px;display:flex;flex-direction:column;gap:10px;border-top:1px solid #e2e8f0">
        <div style="padding-top:12px">
          <label style="display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Title</label>
          <input class="ci-title" type="text" value="${escapeHtml(item.title)}" placeholder="Quiz title"
            style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Description (optional)</label>
          <textarea class="ci-desc" rows="2" placeholder="Describe this quiz..."
            style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;resize:vertical;outline:none">${escapeHtml(item.description)}</textarea>
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Quiz Data (JSON array)</label>
          <textarea class="ci-quiz-json" rows="6" spellcheck="false"
            style="width:100%;padding:8px 10px;border:1px solid ${jsonError ? '#fca5a5' : '#d1d5db'};border-radius:6px;font-size:12px;font-family:monospace;box-sizing:border-box;resize:vertical;outline:none">${escapeHtml(getQuizText())}</textarea>
          ${jsonError ? `<div style="font-size:11px;color:#dc2626;margin-top:3px">${escapeHtml(jsonError)}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="ci-save-badge" style="font-size:11px;color:#94a3b8"></div>
          <button class="ci-delete" style="padding:5px 12px;border:1px solid #fecaca;border-radius:6px;background:#fff;font-size:12px;color:#dc2626;cursor:pointer">Delete</button>
        </div>
      </div>
    `
  }

  function render() {
    el.innerHTML = renderHeader() + renderBody()
    bindEvents()
  }

  const debouncedPatch = debounce(async (fields) => {
    try {
      saveState = 'saving'; updateBadge()
      await onPatch(item.id, fields)
      Object.assign(serverValues, fields)
      Object.assign(item, fields)
      saveState = 'saved'; updateBadge()
      setTimeout(() => { saveState = 'idle'; updateBadge() }, 2000)
    } catch {
      saveState = 'error'; updateBadge()
    }
  }, SAVE_DELAY_MS)

  /**
   * Execute an immediate patch (on blur). On error: badge = error, do NOT update serverValues.
   */
  async function executePatch(id, fields) {
    saveState = 'saving'; updateBadge()
    try {
      await onPatch(id, fields)
      Object.assign(serverValues, fields)
      Object.assign(item, fields)
      saveState = 'saved'; updateBadge()
      setTimeout(() => { saveState = 'idle'; updateBadge() }, 2000)
    } catch (err) {
      console.error('[content-item-quiz] blur save failed:', err)
      saveState = 'error'; updateBadge()
      // Do NOT update serverValues — preserves rollback target
    }
  }

  function updateBadge() {
    const badge = el.querySelector('.ci-save-badge')
    if (!badge) return
    const map = { idle: '', saving: 'Saving...', saved: 'Saved', error: 'Save failed' }
    badge.textContent = map[saveState] || ''
    badge.style.color = saveState === 'error' ? '#dc2626' : saveState === 'saved' ? '#059669' : '#94a3b8'
  }

  function bindEvents() {
    el.querySelector('.ci-header')?.addEventListener('click', () => { expanded = !expanded; render() })
    if (!expanded) return

    const titleEl = el.querySelector('.ci-title')
    const descEl = el.querySelector('.ci-desc')
    const jsonEl = el.querySelector('.ci-quiz-json')

    titleEl?.addEventListener('input', () => { item.title = titleEl.value; debouncedPatch({ title: item.title }) })
    titleEl?.addEventListener('blur', () => {
      debouncedPatch.cancel()
      executePatch(item.id, { title: item.title })
    })

    descEl?.addEventListener('input', () => { item.description = descEl.value; debouncedPatch({ description: item.description }) })
    descEl?.addEventListener('blur', () => {
      debouncedPatch.cancel()
      executePatch(item.id, { description: item.description })
    })

    jsonEl?.addEventListener('blur', () => {
      const raw = jsonEl.value.trim()
      try {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) throw new Error('Must be a JSON array')
        jsonError = null
        jsonEl.style.borderColor = '#d1d5db'
        const serialized = JSON.stringify(parsed)
        item.quiz_data = serialized
        const errEl = jsonEl.parentElement.querySelector('div[style*="dc2626"]')
        if (errEl) errEl.remove()
        debouncedPatch.cancel()
        executePatch(item.id, { quiz_data: serialized })
      } catch (e) {
        jsonError = e.message
        jsonEl.style.borderColor = '#fca5a5'
        let errEl = jsonEl.parentElement.querySelector('.ci-json-err')
        if (!errEl) { errEl = document.createElement('div'); errEl.className = 'ci-json-err'; errEl.style.cssText = 'font-size:11px;color:#dc2626;margin-top:3px'; jsonEl.parentElement.appendChild(errEl) }
        errEl.textContent = jsonError
      }
    })

    el.querySelector('.ci-delete')?.addEventListener('click', async () => {
      const ok = await showAppConfirm({ title: 'Delete quiz?', message: 'Remove this quiz from the lesson?', confirmLabel: 'Delete', confirmColor: '#dc2626', icon: 'delete' })
      if (ok) onDelete(item.id)
    })
  }

  render()

  return {
    element: el,
    update(newItem) { item = { ...newItem }; serverValues = { title: item.title || '', description: item.description || '', quiz_data: item.quiz_data || '[]' }; jsonError = null; render() },
    destroy() { debouncedPatch.cancel() }
  }
}
