/**
 * lesson-content-list.js
 * Inline content list for the lesson editor pane.
 * Fetches items, renders per-type item widgets, handles add/delete.
 * Item-level patch never re-renders siblings (optimistic, isolated).
 *
 * API: createLessonContentList({ container, apiClient, lessonId, lessonTitle })
 *      → { refresh(), destroy() }
 */

import { createContentItem as createVideoItem } from './content-item-video.js'
import { createContentItem as createPdfItem } from './content-item-pdf.js'
import { createContentItem as createQuizItem } from './content-item-quiz.js'
import { createContentItem as createPuzzleItem } from './content-item-puzzle.js'
import { showUploadDialog } from './lesson-content-upload-dialog.js'
import { openPuzzleComposer } from './puzzle-composer.js'
import { showAppPrompt } from '../shared/app-dialogs.js'

const TYPE_CONFIG = {
  video:  { label: 'video',  icon: '▶' },
  pdf:    { label: 'PDF',    icon: '📄' },
  quiz:   { label: 'quiz',   icon: '?' },
  puzzle: { label: 'puzzle', icon: '♟' }
}

/** Map content_type → item widget factory */
function createItemWidget({ item, apiClient, lessonTitle, onPatch, onDelete, onRefresh }) {
  const shared = { item, onPatch, onDelete }
  switch (item.content_type) {
    case 'video':  return createVideoItem(shared)
    case 'pdf':    return createPdfItem({ ...shared, apiClient })
    case 'quiz':   return createQuizItem(shared)
    case 'puzzle': return createPuzzleItem({ item, apiClient, lessonTitle, onDelete, onRefresh })
    default:       return createVideoItem(shared)
  }
}

const SCROLL_NS = 'cm-scroll-'
const SCROLL_KEYS_KEY = 'cm-scroll-keys'
const SCROLL_MAX = 20

/** Save scrollTop for lessonId to sessionStorage (LRU capped). */
function saveScroll(lessonId, scrollTop) {
  try {
    const key = SCROLL_NS + lessonId
    sessionStorage.setItem(key, String(scrollTop))
    let keys = []
    try { keys = JSON.parse(sessionStorage.getItem(SCROLL_KEYS_KEY) || '[]') } catch (_) {}
    keys = keys.filter(k => k !== key); keys.push(key)
    if (keys.length > SCROLL_MAX) sessionStorage.removeItem(keys.shift())
    sessionStorage.setItem(SCROLL_KEYS_KEY, JSON.stringify(keys))
  } catch (_) {}
}
function restoreScroll(lessonId) {
  try { const raw = sessionStorage.getItem(SCROLL_NS + lessonId); return raw !== null ? parseInt(raw, 10) || 0 : 0 } catch (_) { return 0 }
}

export function createLessonContentList({ container, apiClient, lessonId, lessonTitle = '' }) {
  // Track live widget instances keyed by content id — avoids sibling re-render on patch
  const widgets = new Map()
  let currentItems = []
  let headerEl = null
  let listEl = null
  let loading = false

  function renderShell() {
    container.innerHTML = `
      <div class="lcl-root" style="display:flex;flex-direction:column;gap:0">
        <div class="lcl-meta" style="margin-bottom:12px"></div>
        <div class="lcl-header" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0 12px;flex-wrap:wrap">
          <span style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.06em">Content</span>
          <div class="lcl-add-btns cm-add-content-bar"></div>
        </div>
        <div class="lcl-list" style="display:flex;flex-direction:column"></div>
      </div>
    `
    headerEl = container.querySelector('.lcl-add-btns')
    listEl = container.querySelector('.lcl-list')
    renderAddButtons()
  }

  function renderAddButtons() {
    if (!headerEl) return
    headerEl.innerHTML = ''
    Object.entries(TYPE_CONFIG).forEach(([type, c]) => {
      const btn = document.createElement('button')
      btn.className = `cm-add-content-btn cm-acb-${type}`
      btn.innerHTML = `<span class="cm-acb-icon">${c.icon}</span><span>Add ${c.label}</span>`
      btn.addEventListener('click', () => handleAdd(type))
      headerEl.appendChild(btn)
    })
  }

  function renderMetaStrip(items) {
    const metaEl = container.querySelector('.lcl-meta')
    if (!metaEl) return
    if (!items || items.length === 0) { metaEl.innerHTML = ''; return }
    const counts = items.reduce((a, it) => { a[it.content_type] = (a[it.content_type] || 0) + 1; return a }, {})
    const parts = [`<span><strong>${items.length}</strong> item${items.length !== 1 ? 's' : ''}</span>`]
    ;['video', 'pdf', 'quiz', 'puzzle'].forEach(t => {
      if (counts[t]) parts.push(`<span>${TYPE_CONFIG[t].icon} ${counts[t]} ${TYPE_CONFIG[t].label}${counts[t] !== 1 && t !== 'pdf' ? 's' : ''}</span>`)
    })
    metaEl.className = 'lcl-meta cm-meta-strip'
    metaEl.innerHTML = parts.join('')
  }

  async function handleAdd(type) {
    try {
      if (type === 'video') {
        const data = await showUploadDialog({ apiClient, contentType: 'video' })
        if (!data) return
        await apiClient.createContent(lessonId, data)
        await refresh()
      } else if (type === 'pdf') {
        const data = await showUploadDialog({ apiClient, contentType: 'pdf' })
        if (!data) return
        await apiClient.createContent(lessonId, data); await refresh()
      } else if (type === 'quiz') {
        const title = await showAppPrompt({ title: 'Add Quiz', placeholder: 'Knowledge check' })
        if (title === null) return
        await apiClient.createContent(lessonId, { content_type: 'quiz', title: title.trim() || 'Quiz', quiz_data: [], xp_reward: 15 })
        await refresh()
      } else if (type === 'puzzle') {
        openPuzzleComposer({ apiClient, lessonId, lessonTitle, onSave: () => refresh(), onClose: () => {} })
      }
    } catch (err) {
      console.error('Failed to add content:', err)
    }
  }

  const onPatch = (id, fields) => apiClient.updateContent(id, fields)

  async function onDelete(id) {
    try {
      await apiClient.deleteContent(id)
      // Remove widget from map and DOM without re-rendering siblings
      const w = widgets.get(id)
      if (w) { w.destroy(); w.element.remove(); widgets.delete(id) }
      currentItems = currentItems.filter(it => it.id !== id)
      renderMetaStrip(currentItems)
      // Show empty state if no items left
      if (widgets.size === 0) renderEmpty()
    } catch (err) {
      console.error('Failed to delete content:', err)
    }
  }

  function renderState(kind, msg) {
    if (!listEl) return
    if (kind === 'empty') {
      listEl.innerHTML = `<div style="text-align:center;padding:48px 16px;color:#94a3b8;font-size:13px;border:1px dashed #e2e8f0;border-radius:9px;background:#fff"><div style="font-weight:600;color:#475569;margin-bottom:4px">No content yet</div><div style="font-size:12px">Add videos, PDFs, quizzes, or puzzles using the buttons above.</div></div>`
    } else if (kind === 'loading') {
      listEl.innerHTML = '<div style="padding:16px;text-align:center;color:#94a3b8;font-size:13px">Loading...</div>'
    } else {
      listEl.innerHTML = `<div style="padding:16px;text-align:center;color:#dc2626;font-size:13px">${msg}</div>`
    }
  }
  const renderEmpty = () => renderState('empty')

  async function refresh() {
    if (!listEl) renderShell()
    renderState('loading')

    // Destroy all existing widgets
    widgets.forEach(w => w.destroy())
    widgets.clear()

    try {
      const items = await apiClient.getLessonContent(lessonId)
      if (!listEl) return

      currentItems = items
      renderMetaStrip(items)
      if (items.length === 0) { renderEmpty(); return }

      listEl.innerHTML = ''
      items.forEach(item => {
        const w = createItemWidget({ item, apiClient, lessonTitle, onPatch, onDelete, onRefresh: refresh })
        widgets.set(item.id, w)
        listEl.appendChild(w.element)
      })
      const savedScroll = restoreScroll(lessonId)
      if (savedScroll > 0) requestAnimationFrame(() => { container.scrollTop = savedScroll })
    } catch (err) {
      renderState('error', err.message || 'Failed to load content')
    }
  }

  function destroy() {
    saveScroll(lessonId, container.scrollTop)
    widgets.forEach(w => w.destroy()); widgets.clear()
  }

  renderShell(); refresh()

  return { refresh, destroy }
}
