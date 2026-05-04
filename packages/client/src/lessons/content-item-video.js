/**
 * content-item-video.js
 * Inline editor for video content items.
 * Fields: title, video_url (with http/https validation), description.
 * Pattern: createContentItem({ item, onPatch, onDelete }) → { element, update(item), destroy() }
 */

import { debounce } from './shared/debounce.js'
import { showAppConfirm } from '../shared/app-dialogs.js'
import { renderVideoManagerPage } from './video-manager-page.js'
import { resolveVideoUrl } from '../shared/video-url-resolver.js'

const SAVE_DELAY_MS = 600

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function validateVideoUrl(v) {
  if (!v) return null
  // Allow server-relative upload paths (produced by the video picker)
  if (v.startsWith('/uploads/videos/') || v.startsWith('/uploads/courses/')) return null
  try {
    const u = new URL(v)
    return ['http:', 'https:'].includes(u.protocol) ? null : 'URL must be http or https'
  } catch {
    return 'Invalid URL format'
  }
}

/**
 * Render a small inline preview for the current video URL.
 * YouTube → small iframe thumbnail placeholder; uploaded → nothing shown (no DOM overhead).
 * @param {string} url
 * @returns {string} HTML string
 */
function renderVideoPreview(url) {
  if (!url) return ''
  const r = resolveVideoUrl(url)
  if (r.kind === 'youtube' && r.videoId) {
    const thumb = `https://img.youtube.com/vi/${r.videoId}/mqdefault.jpg`
    return `<div style="margin-top:8px;border-radius:6px;overflow:hidden;border:1px solid #e2e8f0;max-width:200px">
      <img src="${thumb}" alt="YouTube preview" style="display:block;width:100%;height:auto" loading="lazy">
    </div>`
  }
  if (r.kind === 'video' && r.playUrl) {
    return `<div style="margin-top:6px;font-size:11px;color:#059669;display:flex;align-items:center;gap:4px">
      <span>▶</span><span>Uploaded video</span>
    </div>`
  }
  return ''
}

/**
 * Open a modal overlay hosting the video manager in pickerMode.
 * On selection: writes the absolute URL back via fillUrl callback.
 * @param {(url: string) => void} fillUrl
 */
function openPickerModal(fillUrl) {
  const overlay = document.createElement('div')
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:60000;background:rgba(0,0,0,.55)',
    'display:flex;align-items:center;justify-content:center'
  ].join(';')

  const panel = document.createElement('div')
  panel.style.cssText = [
    'background:#fff;border-radius:12px;overflow:auto',
    'width:min(860px,95vw);max-height:90vh;box-shadow:0 20px 60px rgba(0,0,0,.25)'
  ].join(';')

  overlay.appendChild(panel)
  document.body.appendChild(overlay)

  // Close on backdrop click
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })

  function close() { overlay.remove() }

  renderVideoManagerPage(panel, {
    pickerMode: true,
    onPick(video) {
      const filename = (video.file_path || '').split('/').pop()
      const url = filename ? `/uploads/videos/${filename}` : (video.file_path || '')
      fillUrl(url)
      close()
    },
    onCancel: close
  })
}

/**
 * @param {object} opts
 * @param {object} opts.item
 * @param {Function} opts.onPatch  - async (id, fields) => void
 * @param {Function} opts.onDelete - async (id) => void
 */
export function createContentItem({ item: initialItem, onPatch, onDelete }) {
  let item = { ...initialItem }
  let expanded = false
  let saveState = 'idle' // idle | saving | saved | error
  let serverValues = { title: item.title || '', video_url: item.video_url || '', description: item.description || '' }

  const el = document.createElement('div')
  el.className = 'ci-card ci-video'

  function renderHeader() {
    return `
      <div class="ci-header" style="display:flex;align-items:center;gap:10px;padding:12px 14px 12px 16px;cursor:pointer;user-select:none">
        <span class="ci-type-icon">▶</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.title) || '<em style="color:#94a3b8;font-style:normal">Untitled</em>'}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.video_url) || 'No URL'}</div>
        </div>
        <span class="ci-type-tag">VIDEO</span>
        <svg class="ci-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="flex-shrink:0;transition:transform .2s;${expanded ? 'transform:rotate(180deg)' : ''}"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    `
  }

  function renderBody() {
    if (!expanded) return ''
    const urlError = item.video_url ? validateVideoUrl(item.video_url) : null
    return `
      <div class="ci-body" style="padding:0 14px 14px;display:flex;flex-direction:column;gap:10px;border-top:1px solid #e2e8f0">
        <div style="padding-top:12px">
          <label style="display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Title</label>
          <input class="ci-title" type="text" value="${escapeHtml(item.title)}" placeholder="Video title"
            style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Video URL</label>
          <div style="display:flex;gap:6px;align-items:flex-start">
            <input class="ci-url" type="url" value="${escapeHtml(item.video_url)}" placeholder="https://youtube.com/watch?v=..."
              style="flex:1;padding:8px 10px;border:1px solid ${urlError ? '#fca5a5' : '#d1d5db'};border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;outline:none">
            <button class="ci-pick-btn" title="Pick from video library" style="flex-shrink:0;padding:8px 10px;border:1px solid #c7d2fe;border-radius:6px;background:#eef2ff;color:#4f46e5;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">📁 Library</button>
          </div>
          ${urlError ? `<div style="font-size:11px;color:#dc2626;margin-top:3px">${escapeHtml(urlError)}</div>` : ''}
          ${renderVideoPreview(item.video_url)}
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Description (optional)</label>
          <textarea class="ci-desc" rows="3" placeholder="Describe this video for students..."
            style="width:100%;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;resize:vertical;outline:none">${escapeHtml(item.description)}</textarea>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="ci-save-badge" style="font-size:11px;color:#94a3b8">${saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Save failed' : ''}</div>
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
      Object.assign(serverValues, fields); Object.assign(item, fields)
      saveState = 'saved'; updateBadge()
      setTimeout(() => { saveState = 'idle'; updateBadge() }, 2000)
    } catch {
      saveState = 'error'; updateBadge()
    }
  }, SAVE_DELAY_MS)

  function updateBadge() {
    const badge = el.querySelector('.ci-save-badge')
    if (!badge) return
    const map = { idle: '', saving: 'Saving...', saved: 'Saved', error: 'Save failed' }
    badge.textContent = map[saveState] || ''
    badge.style.color = saveState === 'error' ? '#dc2626' : saveState === 'saved' ? '#059669' : '#94a3b8'
  }

  /**
   * Execute an immediate patch (on blur). On error: set badge to error, do NOT update serverValues.
   * On success: update serverValues so Esc can revert correctly.
   * @param {string} id - item id
   * @param {object} fields - fields to patch
   * @param {object} prevServerFields - previous server values for rollback reference (unused here; serverValues updated on success)
   */
  async function executePatch(id, fields, prevServerFields) {
    saveState = 'saving'; updateBadge()
    try {
      await onPatch(id, fields)
      Object.assign(serverValues, fields)
      Object.assign(item, fields)
      saveState = 'saved'; updateBadge()
      setTimeout(() => { saveState = 'idle'; updateBadge() }, 2000)
    } catch (err) {
      console.error('[content-item-video] blur save failed:', err)
      saveState = 'error'; updateBadge()
      // Do NOT update serverValues — next edit or Esc will use previous good value
    }
  }

  function bindEvents() {
    el.querySelector('.ci-header')?.addEventListener('click', () => { expanded = !expanded; render() })

    if (!expanded) return

    const titleEl = el.querySelector('.ci-title')
    const urlEl = el.querySelector('.ci-url')
    const descEl = el.querySelector('.ci-desc')

    titleEl?.addEventListener('input', () => {
      item.title = titleEl.value
      el.querySelector('.ci-header div div:first-child').innerHTML = escapeHtml(item.title) || '<em style="color:#94a3b8">Untitled</em>'
      debouncedPatch({ title: item.title })
    })
    titleEl?.addEventListener('blur', () => {
      debouncedPatch.cancel()
      executePatch(item.id, { title: item.title }, { title: serverValues.title })
    })

    urlEl?.addEventListener('input', () => {
      item.video_url = urlEl.value
      const err = validateVideoUrl(item.video_url)
      urlEl.style.borderColor = err ? '#fca5a5' : '#d1d5db'
      if (!err) debouncedPatch({ video_url: item.video_url })
    })
    urlEl?.addEventListener('blur', () => {
      const err = validateVideoUrl(item.video_url)
      if (!err) {
        debouncedPatch.cancel()
        executePatch(item.id, { video_url: item.video_url }, { video_url: serverValues.video_url })
      }
    })

    el.querySelector('.ci-pick-btn')?.addEventListener('click', () => {
      openPickerModal((url) => {
        item.video_url = url
        if (urlEl) urlEl.value = url
        debouncedPatch.cancel()
        executePatch(item.id, { video_url: url }, { video_url: serverValues.video_url })
        // Re-render to update header subtitle and preview
        render()
      })
    })

    descEl?.addEventListener('input', () => { item.description = descEl.value; debouncedPatch({ description: item.description }) })
    descEl?.addEventListener('blur', () => {
      debouncedPatch.cancel()
      executePatch(item.id, { description: item.description }, { description: serverValues.description })
    })

    el.querySelector('.ci-delete')?.addEventListener('click', async () => {
      const ok = await showAppConfirm({ title: 'Delete video?', message: 'Remove this video from the lesson?', confirmLabel: 'Delete', confirmColor: '#dc2626', icon: 'delete' })
      if (ok) onDelete(item.id)
    })
  }

  render()

  return {
    element: el,
    update(newItem) { item = { ...newItem }; serverValues = { title: item.title || '', video_url: item.video_url || '', description: item.description || '' }; render() },
    destroy() { debouncedPatch.cancel() }
  }
}
