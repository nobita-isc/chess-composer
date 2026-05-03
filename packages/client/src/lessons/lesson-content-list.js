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
  video:  { label: 'Video',  icon: '▶', badge: '#eef2ff', text: '#4f46e5' },
  pdf:    { label: 'PDF',    icon: '📄', badge: '#fef3c7', text: '#92400e' },
  quiz:   { label: 'Quiz',   icon: '❓', badge: '#fee2e2', text: '#dc2626' },
  puzzle: { label: 'Puzzle', icon: '♟', badge: '#dcfce7', text: '#059669' }
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

/**
 * @param {object} opts
 * @param {HTMLElement} opts.container
 * @param {object}      opts.apiClient
 * @param {string}      opts.lessonId
 * @param {string}      [opts.lessonTitle]
 */
const SCROLL_NS = 'cm-scroll-'
const SCROLL_KEYS_KEY = 'cm-scroll-keys'
const SCROLL_MAX = 20

/** Save scrollTop for this lessonId to sessionStorage (LRU capped at SCROLL_MAX). */
function saveScroll(lessonId, scrollTop) {
  try {
    const key = SCROLL_NS + lessonId
    sessionStorage.setItem(key, String(scrollTop))
    // LRU key tracking
    let keys = []
    try { keys = JSON.parse(sessionStorage.getItem(SCROLL_KEYS_KEY) || '[]') } catch (_) {}
    // Move to end (most recent); evict oldest if over cap
    keys = keys.filter(k => k !== key)
    keys.push(key)
    if (keys.length > SCROLL_MAX) {
      const evicted = keys.shift()
      sessionStorage.removeItem(evicted)
    }
    sessionStorage.setItem(SCROLL_KEYS_KEY, JSON.stringify(keys))
  } catch (_) {}
}

/** Restore scrollTop for this lessonId from sessionStorage. Returns 0 if not found. */
function restoreScroll(lessonId) {
  try {
    const raw = sessionStorage.getItem(SCROLL_NS + lessonId)
    return raw !== null ? parseInt(raw, 10) || 0 : 0
  } catch (_) { return 0 }
}

export function createLessonContentList({ container, apiClient, lessonId, lessonTitle = '' }) {
  // Track live widget instances keyed by content id — avoids sibling re-render on patch
  const widgets = new Map()
  let headerEl = null
  let listEl = null
  let loading = false

  function renderShell() {
    container.innerHTML = `
      <div class="lcl-root" style="display:flex;flex-direction:column;gap:0">
        <div class="lcl-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0 8px">
          <span style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Content</span>
          <div class="lcl-add-btns" style="display:flex;gap:6px;flex-wrap:wrap"></div>
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
      btn.style.cssText = `display:flex;align-items:center;gap:4px;padding:4px 10px;background:${c.badge};border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;color:${c.text}`
      btn.innerHTML = `${c.icon} +${c.label}`
      btn.addEventListener('click', () => handleAdd(type))
      headerEl.appendChild(btn)
    })
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
        await apiClient.createContent(lessonId, data)
        await refresh()
      } else if (type === 'quiz') {
        const title = await showAppPrompt({ title: 'Add Quiz', placeholder: 'Knowledge check' })
        if (title === null) return
        await apiClient.createContent(lessonId, { content_type: 'quiz', title: title.trim() || 'Quiz', quiz_data: [], xp_reward: 15 })
        await refresh()
      } else if (type === 'puzzle') {
        openPuzzleComposer({
          apiClient,
          lessonId,
          lessonTitle,
          onSave: () => refresh(),
          onClose: () => {}
        })
      }
    } catch (err) {
      console.error('Failed to add content:', err)
    }
  }

  async function onPatch(id, fields) {
    await apiClient.updateContent(id, fields)
  }

  async function onDelete(id) {
    try {
      await apiClient.deleteContent(id)
      // Remove widget from map and DOM without re-rendering siblings
      const w = widgets.get(id)
      if (w) { w.destroy(); w.element.remove(); widgets.delete(id) }
      // Show empty state if no items left
      if (widgets.size === 0) renderEmpty()
    } catch (err) {
      console.error('Failed to delete content:', err)
    }
  }

  function renderEmpty() {
    if (!listEl) return
    listEl.innerHTML = `
      <div style="text-align:center;padding:32px 16px;color:#94a3b8;font-size:13px">
        <div style="font-size:32px;margin-bottom:8px">📚</div>
        <div style="font-weight:600;color:#64748b;margin-bottom:4px">No content yet</div>
        <div>Use the buttons above to add videos, PDFs, quizzes, or puzzles.</div>
      </div>
    `
  }

  function renderLoading() {
    if (!listEl) return
    listEl.innerHTML = '<div style="padding:16px;text-align:center;color:#94a3b8;font-size:13px">Loading...</div>'
  }

  function renderError(msg) {
    if (!listEl) return
    listEl.innerHTML = `<div style="padding:16px;text-align:center;color:#dc2626;font-size:13px">${msg}</div>`
  }

  async function refresh() {
    if (!listEl) renderShell()
    renderLoading()

    // Destroy all existing widgets
    widgets.forEach(w => w.destroy())
    widgets.clear()

    try {
      const items = await apiClient.getLessonContent(lessonId)
      if (!listEl) return

      if (items.length === 0) { renderEmpty(); return }

      listEl.innerHTML = ''
      items.forEach(item => {
        const w = createItemWidget({
          item,
          apiClient,
          lessonTitle,
          onPatch,
          onDelete,
          onRefresh: refresh
        })
        widgets.set(item.id, w)
        listEl.appendChild(w.element)
      })
      // Restore scroll position after items are in DOM
      const savedScroll = restoreScroll(lessonId)
      if (savedScroll > 0) {
        // Use rAF to ensure layout is complete before setting scroll
        requestAnimationFrame(() => { container.scrollTop = savedScroll })
      }
    } catch (err) {
      renderError(err.message || 'Failed to load content')
    }
  }

  function destroy() {
    // Save scroll position before teardown (survives composer round-trip)
    saveScroll(lessonId, container.scrollTop)
    widgets.forEach(w => w.destroy())
    widgets.clear()
  }

  // Init
  renderShell()
  refresh()

  return { refresh, destroy }
}
