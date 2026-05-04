/**
 * video-manager-page.js
 * Admin page for uploading, browsing, editing, and deleting videos.
 * Supports pickerMode for embedding as a modal video picker (used by Phase 3).
 *
 * Export: renderVideoManagerPage(container, opts?)
 *   opts.pickerMode {boolean}   - hide edit/delete, show Select per row
 *   opts.onPick    {Function}   - called with video object when row selected in pickerMode
 */

import { showAppAlert, showAppPrompt } from '../shared/app-dialogs.js'
import { apiClient } from '../api/ApiClient.js'
import { createVideoRow } from './video-manager-row.js'

const STYLES = `
<style>
.vm-page { padding: 24px; max-width: 960px; }
.vm-header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
.vm-header h2 { margin:0; font-size:18px; font-weight:600; flex:1; }
.vm-toolbar { display:flex; gap:8px; align-items:center; margin-bottom:16px; flex-wrap:wrap; }
.vm-toolbar select, .vm-toolbar input { padding:7px 10px; border:1px solid var(--color-gray-200,#e2e8f0); border-radius:6px; font-size:13px; background:#fff; }
.vm-toolbar input { flex:1; min-width:160px; }
.vm-upload-btn { padding:7px 14px; background:var(--color-brand-500,#4f46e5); color:#fff; border:none; border-radius:6px; font-size:13px; font-weight:500; cursor:pointer; white-space:nowrap; }
.vm-upload-btn:hover { background:var(--color-brand-600,#4338ca); }
.vm-upload-zone { border:2px dashed var(--color-gray-200,#e2e8f0); border-radius:8px; padding:20px; margin-bottom:16px; display:none; }
.vm-upload-queue { display:flex; flex-direction:column; gap:6px; }
.vm-upload-item { display:flex; align-items:center; gap:10px; font-size:13px; padding:8px 10px; background:var(--color-gray-50,#f8fafc); border-radius:6px; }
.vm-upload-item .vm-uname { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.vm-upload-badge { font-size:11px; font-weight:600; padding:2px 7px; border-radius:99px; background:#e2e8f0; color:#475569; }
.vm-upload-badge.uploading { background:#dbeafe; color:#1d4ed8; }
.vm-upload-badge.done { background:#dcfce7; color:#166534; }
.vm-upload-badge.error { background:#fee2e2; color:#b91c1c; }
.vm-list { display:flex; flex-direction:column; gap:6px; }
.vm-row { display:flex; align-items:center; gap:12px; padding:10px 12px; background:#fff; border:1px solid var(--color-gray-100,#f1f5f9); border-radius:8px; transition:border-color .15s; }
.vm-row:hover { border-color:var(--color-gray-200,#e2e8f0); }
.vm-row-icon { color:#94a3b8; flex-shrink:0; }
.vm-row-body { flex:1; min-width:0; }
.vm-title { font-size:13px; font-weight:500; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.vm-meta { font-size:12px; color:#94a3b8; margin-top:2px; display:flex; gap:4px; align-items:center; flex-wrap:wrap; }
.vm-folder { color:#6366f1; font-weight:500; }
.vm-dot { color:#cbd5e1; }
.vm-row-actions { display:flex; gap:4px; flex-shrink:0; }
.vm-btn { display:flex; align-items:center; gap:4px; padding:5px 9px; border:1px solid var(--color-gray-200,#e2e8f0); border-radius:5px; background:#fff; font-size:12px; cursor:pointer; color:#475569; white-space:nowrap; }
.vm-btn:hover { background:var(--color-gray-50,#f8fafc); }
.vm-btn-primary { background:var(--color-brand-500,#4f46e5); color:#fff; border-color:transparent; }
.vm-btn-primary:hover { background:var(--color-brand-600,#4338ca); }
.vm-btn-danger { color:var(--color-error-500,#ef4444); }
.vm-btn-danger:hover { background:#fee2e2; border-color:#fecaca; }
.vm-empty { text-align:center; padding:48px 24px; color:#94a3b8; font-size:14px; }
.vm-cancel-btn { padding:7px 14px; border:1px solid var(--color-gray-200,#e2e8f0); background:#fff; border-radius:6px; font-size:13px; cursor:pointer; }
</style>
`

let _debounceTimer = null
function debounce(fn, ms) {
  clearTimeout(_debounceTimer)
  _debounceTimer = setTimeout(fn, ms)
}

/**
 * @param {HTMLElement} container
 * @param {object} [opts]
 * @param {boolean} [opts.pickerMode]
 * @param {(video: object) => void} [opts.onPick]
 * @param {() => void} [opts.onCancel]
 */
export function renderVideoManagerPage(container, opts = {}) {
  const { pickerMode = false, onPick, onCancel } = opts
  container.innerHTML = STYLES + `
    <div class="vm-page">
      <div class="vm-header">
        <h2>${pickerMode ? 'Pick a Video' : 'Video Library'}</h2>
        ${pickerMode
    ? `<button class="vm-cancel-btn" id="vm-cancel">Cancel</button>`
    : `<button class="vm-upload-btn" id="vm-upload-trigger">+ Upload Videos</button>`}
      </div>
      ${!pickerMode ? `
      <div class="vm-upload-zone" id="vm-upload-zone">
        <input type="file" id="vm-file-input" multiple accept="video/*" style="display:none">
        <div class="vm-upload-queue" id="vm-upload-queue"></div>
      </div>` : ''}
      <div class="vm-toolbar">
        <select id="vm-folder-filter"><option value="">All folders</option></select>
        <input type="text" id="vm-search" placeholder="Search videos..." />
      </div>
      <div class="vm-list" id="vm-list"></div>
    </div>
  `

  if (pickerMode && onCancel) {
    container.querySelector('#vm-cancel')?.addEventListener('click', onCancel)
  }

  const listEl = container.querySelector('#vm-list')
  const folderSelect = container.querySelector('#vm-folder-filter')
  const searchInput = container.querySelector('#vm-search')
  let folders = []

  async function loadFolders() {
    try {
      folders = await apiClient.getVideoFolders()
      const opts = folders.map(f => `<option value="${f}">${f}</option>`).join('')
      folderSelect.innerHTML = '<option value="">All folders</option>' + opts
    } catch { /* non-critical */ }
  }

  async function loadList() {
    const q = searchInput?.value?.trim() || ''
    const folder = folderSelect?.value || ''
    try {
      const videos = await apiClient.getVideos({ q: q || undefined, folder: folder || undefined })
      renderList(videos)
    } catch (err) {
      listEl.innerHTML = `<div class="vm-empty">Failed to load videos: ${err.message}</div>`
    }
  }

  function renderList(videos) {
    listEl.innerHTML = ''
    if (!videos || videos.length === 0) {
      listEl.innerHTML = `<div class="vm-empty">No videos uploaded yet. Click <strong>Upload Videos</strong> to add your first.</div>`
      return
    }
    videos.forEach(video => {
      const row = createVideoRow(video, { pickerMode, onPick, onRefresh: loadList, apiClient, folders })
      listEl.appendChild(row)
    })
  }

  folderSelect?.addEventListener('change', loadList)
  searchInput?.addEventListener('input', () => debounce(loadList, 300))

  // Upload flow (admin mode only)
  if (!pickerMode) {
    const uploadZone = container.querySelector('#vm-upload-zone')
    const fileInput = container.querySelector('#vm-file-input')
    const uploadQueue = container.querySelector('#vm-upload-queue')

    container.querySelector('#vm-upload-trigger').addEventListener('click', async () => {
      const folderName = await showAppPrompt({ title: 'Folder (optional)', message: 'Enter a folder name or leave blank.', placeholder: 'e.g. openings' })
      uploadZone.style.display = ''
      uploadQueue.innerHTML = ''
      fileInput.value = ''
      fileInput.click()

      fileInput.onchange = async () => {
        const files = Array.from(fileInput.files)
        if (!files.length) return
        const items = files.map(f => {
          const item = document.createElement('div')
          item.className = 'vm-upload-item'
          item.innerHTML = `<span class="vm-uname">${f.name}</span><span class="vm-upload-badge uploading">0%</span>`
          uploadQueue.appendChild(item)
          return { file: f, item }
        })

        await Promise.all(items.map(async ({ file, item }) => {
          const badge = item.querySelector('.vm-upload-badge')
          try {
            await apiClient.uploadVideo(file, folderName || undefined, (pct) => {
              badge.textContent = pct < 100 ? `${pct}%` : 'Processing...'
            })
            badge.className = 'vm-upload-badge done'
            badge.textContent = 'Done'
          } catch (err) {
            badge.className = 'vm-upload-badge error'
            badge.textContent = 'Error'
            item.title = err.message
          }
        }))

        await loadFolders()
        await loadList()
      }
    })
  }

  // Initial load
  loadFolders()
  loadList()
}
