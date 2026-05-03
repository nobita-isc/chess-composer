/**
 * lesson-content-upload-dialog.js
 * Modal dialog for uploading new content (video URL or file upload).
 * Carved from lesson-content-editor.js.
 * Export: showUploadDialog({ apiClient, contentType, onSuccess })
 */

import { showAppAlert } from '../shared/app-dialogs.js'
import { createMarkdownEditor } from '../shared/markdown-editor.js'

const INPUT_STYLE = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;font-family:inherit'
const LABEL_STYLE = 'display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px'

/**
 * Open upload/URL dialog.
 * @param {object} opts
 * @param {object} opts.apiClient
 * @param {'video'|'pdf'} [opts.contentType='video']
 * @param {Function} opts.onSuccess - called with content data object
 */
export function showUploadDialog({ apiClient, contentType = 'video', onSuccess }) {
  return new Promise((resolve) => {
    let activeTab = contentType === 'pdf' ? 'upload' : 'url'
    let descriptionEditor = null
    let savedDescription = ''

    const dlg = document.createElement('div')
    dlg.className = 'pv-overlay'
    dlg.style.zIndex = '60000'

    const closeDlg = () => { descriptionEditor?.destroy(); dlg.remove(); resolve(null) }

    function renderDialog() {
      if (descriptionEditor) {
        savedDescription = descriptionEditor.getValue() || ''
        descriptionEditor.destroy()
        descriptionEditor = null
      }

      dlg.innerHTML = `
        <div style="width:500px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.2);display:flex;flex-direction:column;overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid #e2e8f0">
            <span style="font-size:18px;font-weight:700;color:#1e293b">Upload Content</span>
            <button data-action="close" style="width:32px;height:32px;border-radius:8px;background:#f1f5f9;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style="padding:24px;display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;background:#f1f5f9;border-radius:10px;padding:4px;gap:4px">
              <button data-tab="url" style="flex:1;height:36px;border:none;border-radius:8px;font-size:13px;cursor:pointer;${activeTab === 'url' ? 'background:#fff;font-weight:600;color:#4f46e5;box-shadow:0 1px 4px rgba(0,0,0,0.07)' : 'background:transparent;color:#94a3b8'}">Video URL</button>
              <button data-tab="upload" style="flex:1;height:36px;border:none;border-radius:8px;font-size:13px;cursor:pointer;${activeTab === 'upload' ? 'background:#fff;font-weight:600;color:#4f46e5;box-shadow:0 1px 4px rgba(0,0,0,0.07)' : 'background:transparent;color:#94a3b8'}">Upload File</button>
            </div>
            ${activeTab === 'url' ? `
              <div><label style="${LABEL_STYLE}">YouTube / Vimeo URL</label><input type="text" id="uc-url" placeholder="https://youtube.com/watch?v=..." style="${INPUT_STYLE}"></div>
            ` : `
              <div><label style="${LABEL_STYLE}">Upload Video or PDF</label>
                <div id="uc-dropzone" style="height:120px;border:1.5px dashed #c7d2fe;border-radius:12px;background:#faf5ff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer">
                  <span style="font-size:13px;font-weight:500;color:#7c3aed">Drop files here or click to browse</span>
                  <span style="font-size:11px;color:#94a3b8">MP4, PDF — Max 100MB</span>
                  <input type="file" id="uc-file" accept=".mp4,.pdf,.png,.jpg,.jpeg" style="display:none">
                </div>
                <div id="uc-file-info" style="display:none;margin-top:8px;padding:8px 12px;background:#f0fdf4;border-radius:8px;font-size:12px;color:#059669"></div>
              </div>
            `}
            <div><label style="${LABEL_STYLE}">Display Title</label><input type="text" id="uc-title" placeholder="Lesson title" style="${INPUT_STYLE}"></div>
            <div><label style="${LABEL_STYLE}">Description (optional)</label><div id="uc-desc-editor"></div></div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:12px;padding:16px 24px;border-top:1px solid #e2e8f0">
            <button data-action="close" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font-size:13px;color:#64748b;cursor:pointer">Cancel</button>
            <button id="uc-submit" style="padding:10px 20px;border:none;border-radius:8px;background:#4f46e5;font-size:13px;font-weight:600;color:#fff;cursor:pointer">Add to Lesson</button>
          </div>
        </div>
      `

      const descEl = dlg.querySelector('#uc-desc-editor')
      if (descEl) {
        descriptionEditor = createMarkdownEditor(descEl, { value: savedDescription, placeholder: 'Describe this content...', height: 120 })
      }

      dlg.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => { activeTab = btn.dataset.tab; renderDialog() })
      })
      dlg.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', closeDlg))
      dlg.addEventListener('click', (e) => { if (e.target === dlg) closeDlg() })

      const dropzone = dlg.querySelector('#uc-dropzone')
      const fileInput = dlg.querySelector('#uc-file')
      if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click())
        fileInput.addEventListener('change', () => {
          const file = fileInput.files[0]
          if (file) {
            const info = dlg.querySelector('#uc-file-info')
            info.style.display = 'block'
            info.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`
            const titleEl = dlg.querySelector('#uc-title')
            if (!titleEl.value) titleEl.value = file.name.replace(/\.[^.]+$/, '')
          }
        })
      }

      dlg.querySelector('#uc-submit').addEventListener('click', async () => {
        const title = dlg.querySelector('#uc-title').value.trim()
        if (!title) { showAppAlert({ title: 'Required', message: 'Please enter a display title' }); return }
        const description = descriptionEditor?.getValue()?.trim() || null

        if (activeTab === 'url') {
          const url = dlg.querySelector('#uc-url').value.trim()
          if (!url) { showAppAlert({ title: 'Required', message: 'Please enter a video URL' }); return }
          try { const u = new URL(url); if (!['http:', 'https:'].includes(u.protocol)) throw new Error() }
          catch { showAppAlert({ title: 'Invalid URL', message: 'URL must start with http:// or https://' }); return }
          descriptionEditor?.destroy(); dlg.remove()
          const result = { content_type: 'video', title, video_url: url, description, xp_reward: 10 }
          onSuccess?.(result); resolve(result)
        } else {
          const file = fileInput?.files?.[0]
          if (!file) { showAppAlert({ title: 'Required', message: 'Please select a file' }); return }
          const submitBtn = dlg.querySelector('#uc-submit')
          submitBtn.textContent = 'Uploading...'; submitBtn.disabled = true
          try {
            const formData = new FormData()
            formData.append('file', file)
            const token = apiClient._authManager?.getAccessToken() || ''
            const res = await fetch('/api/content/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData })
            const data = await res.json()
            if (!data.success) throw new Error(data.error)
            const ct = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'video'
            descriptionEditor?.destroy(); dlg.remove()
            const result = { content_type: ct, title, file_path: data.data.file_path, file_size: data.data.file_size, description, xp_reward: ct === 'pdf' ? 5 : 10 }
            onSuccess?.(result); resolve(result)
          } catch (err) {
            submitBtn.textContent = 'Add to Lesson'; submitBtn.disabled = false
            showAppAlert({ title: 'Upload Failed', message: err.message })
          }
        }
      })
    }

    document.body.appendChild(dlg)
    renderDialog()
  })
}
