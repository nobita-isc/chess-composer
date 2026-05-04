/**
 * video-manager-row.js
 * Renders a single row in the video manager list.
 * Supports normal mode (edit/delete) and pickerMode (select button only).
 */

import { showAppConfirm, showAppAlert, showAppPrompt } from '../shared/app-dialogs.js'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function videoUrl(video) {
  const filename = (video.file_path || '').split('/').pop()
  return `${window.location.origin}/uploads/videos/${filename}`
}

/**
 * @param {object} video - video record from API
 * @param {object} opts
 * @param {boolean} opts.pickerMode
 * @param {(video: object) => void} opts.onPick
 * @param {() => void} opts.onRefresh
 * @param {object} opts.apiClient
 * @param {string[]} opts.folders - for folder autocomplete
 * @returns {HTMLElement}
 */
export function createVideoRow(video, { pickerMode, onPick, onRefresh, apiClient, folders = [] }) {
  const row = document.createElement('div')
  row.className = 'vm-row'
  row.dataset.id = video.id

  const meta = [
    video.folder ? `<span class="vm-folder">${escapeHtml(video.folder)}</span>` : '',
    video.file_size ? `<span>${escapeHtml(formatBytes(video.file_size))}</span>` : '',
    video.created_at ? `<span>${escapeHtml(formatDate(video.created_at))}</span>` : ''
  ].filter(Boolean).join('<span class="vm-dot">·</span>')

  const actionBtns = pickerMode
    ? `<button class="vm-btn vm-btn-primary vm-action-pick">Select</button>`
    : `
      <button class="vm-btn vm-action-copy" title="Copy URL">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        Copy URL
      </button>
      <button class="vm-btn vm-action-edit" title="Edit">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Edit
      </button>
      <button class="vm-btn vm-btn-danger vm-action-delete" title="Delete">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        Delete
      </button>`

  row.innerHTML = `
    <div class="vm-row-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
    </div>
    <div class="vm-row-body">
      <div class="vm-title">${escapeHtml(video.title || video.original_name || 'Untitled')}</div>
      <div class="vm-meta">${meta}</div>
    </div>
    <div class="vm-row-actions">${actionBtns}</div>
  `

  if (pickerMode) {
    row.style.cursor = 'pointer'
    row.addEventListener('click', () => onPick(video))
    row.querySelector('.vm-action-pick').addEventListener('click', (e) => {
      e.stopPropagation()
      onPick(video)
    })
    return row
  }

  row.querySelector('.vm-action-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(videoUrl(video))
      const btn = row.querySelector('.vm-action-copy')
      const orig = btn.textContent
      btn.textContent = 'Copied!'
      setTimeout(() => { btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy URL` }, 2000)
    } catch { showAppAlert({ title: 'Error', message: 'Could not copy to clipboard.' }) }
  })

  row.querySelector('.vm-action-edit').addEventListener('click', async () => {
    const currentTitle = video.title || video.original_name || ''
    const newTitle = await showAppPrompt({ title: 'Rename video', placeholder: 'Title', defaultValue: currentTitle })
    if (!newTitle || newTitle === currentTitle) return
    try {
      await apiClient.updateVideo(video.id, { title: newTitle })
      onRefresh()
    } catch (err) { showAppAlert({ title: 'Error', message: err.message }) }
  })

  row.querySelector('.vm-action-delete').addEventListener('click', async () => {
    const confirmed = await showAppConfirm({
      title: 'Delete video?',
      message: `"${video.title || video.original_name}" will be permanently deleted.`,
      confirmLabel: 'Delete',
      confirmColor: 'var(--color-error-500)',
      icon: 'delete'
    })
    if (!confirmed) return
    try {
      await apiClient.deleteVideo(video.id)
      onRefresh()
    } catch (err) { showAppAlert({ title: 'Error', message: err.message }) }
  })

  return row
}
