/**
 * content-item-pdf.js
 * Inline editor for PDF content items.
 * Fields: title, description. "Replace file" opens upload dialog.
 * Pattern: createContentItem({ item, onPatch, onDelete, apiClient }) → { element, update(item), destroy() }
 */

import { debounce } from './shared/debounce.js'
import { showAppConfirm } from '../shared/app-dialogs.js'
import { showUploadDialog } from './lesson-content-upload-dialog.js'

const SAVE_DELAY_MS = 600

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * @param {object} opts
 * @param {object} opts.item
 * @param {Function} opts.onPatch   - async (id, fields) => void
 * @param {Function} opts.onDelete  - async (id) => void
 * @param {object}  opts.apiClient
 */
export function createContentItem({ item: initialItem, onPatch, onDelete, apiClient }) {
  let item = { ...initialItem }
  let expanded = false
  let saveState = 'idle'
  let serverValues = { title: item.title || '', description: item.description || '' }

  const el = document.createElement('div')
  el.style.cssText = 'border:1px solid #fde68a;border-radius:10px;background:#fff;overflow:hidden;margin-bottom:8px'

  function renderHeader() {
    const fname = item.file_path ? item.file_path.split('/').pop() : 'No file'
    return `
      <div class="ci-header" style="display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;user-select:none">
        <span style="font-size:18px">📄</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.title) || '<em style="color:#94a3b8">Untitled</em>'}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:1px">${escapeHtml(fname)}</div>
        </div>
        <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;background:#fef3c7;color:#92400e;flex-shrink:0">PDF</span>
        <svg class="ci-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="flex-shrink:0;transition:transform .2s;${expanded ? 'transform:rotate(180deg)' : ''}"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    `
  }

  function renderBody() {
    if (!expanded) return ''
    return `
      <div class="ci-body" style="padding:0 14px 14px;display:flex;flex-direction:column;gap:10px;border-top:1px solid #e2e8f0">
        <div style="padding-top:12px">
          <label style="display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Title</label>
          <input class="ci-title" type="text" value="${escapeHtml(item.title)}" placeholder="PDF title"
            style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Description (optional)</label>
          <textarea class="ci-desc" rows="3" placeholder="Describe this PDF for students..."
            style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;resize:vertical;outline:none">${escapeHtml(item.description)}</textarea>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;gap:8px;align-items:center">
            <button class="ci-replace" style="padding:5px 12px;border:1px solid #c7d2fe;border-radius:6px;background:#fff;font-size:12px;color:#4f46e5;cursor:pointer">Replace file</button>
            <div class="ci-save-badge" style="font-size:11px;color:#94a3b8"></div>
          </div>
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
   * Execute an immediate patch (on blur). On error: set badge to error, do NOT update serverValues.
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
      console.error('[content-item-pdf] blur save failed:', err)
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

    titleEl?.addEventListener('input', () => {
      item.title = titleEl.value
      debouncedPatch({ title: item.title })
    })
    titleEl?.addEventListener('blur', () => {
      debouncedPatch.cancel()
      executePatch(item.id, { title: item.title })
    })

    descEl?.addEventListener('input', () => { item.description = descEl.value; debouncedPatch({ description: item.description }) })
    descEl?.addEventListener('blur', () => {
      debouncedPatch.cancel()
      executePatch(item.id, { description: item.description })
    })

    el.querySelector('.ci-replace')?.addEventListener('click', async () => {
      await showUploadDialog({
        apiClient,
        contentType: 'pdf',
        onSuccess: async (data) => {
          await onPatch(item.id, { file_path: data.file_path, file_size: data.file_size })
          item.file_path = data.file_path
          item.file_size = data.file_size
          render()
        }
      })
    })

    el.querySelector('.ci-delete')?.addEventListener('click', async () => {
      const ok = await showAppConfirm({ title: 'Delete PDF?', message: 'Remove this PDF from the lesson?', confirmLabel: 'Delete', confirmColor: '#dc2626', icon: 'delete' })
      if (ok) onDelete(item.id)
    })
  }

  render()

  return {
    element: el,
    update(newItem) { item = { ...newItem }; serverValues = { title: item.title || '', description: item.description || '' }; render() },
    destroy() { debouncedPatch.cancel() }
  }
}
