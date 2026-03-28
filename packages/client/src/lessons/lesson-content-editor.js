/**
 * lesson-content-editor.js
 * Full-page editor for lesson content items (video, PDF, puzzle, quiz).
 * Renders inside a container with back navigation.
 */

import { showAppConfirm, showAppPrompt, showAppAlert } from '../shared/app-dialogs.js'
import { openPuzzleComposer } from './puzzle-composer.js'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const TYPE_CONFIG = {
  video: { bg: '#f5f3ff', border: '#c7d2fe', badge: '#eef2ff', text: '#4f46e5', label: 'VIDEO', icon: '▶' },
  pdf: { bg: '#fefce8', border: '#fde68a', badge: '#fef3c7', text: '#92400e', label: 'PDF', icon: '📄' },
  puzzle: { bg: '#f0fdf4', border: '#86efac', badge: '#dcfce7', text: '#059669', label: 'PUZZLE', icon: '♟' },
  quiz: { bg: '#fef2f2', border: '#fca5a5', badge: '#fee2e2', text: '#dc2626', label: 'QUIZ', icon: '❓' }
}

/**
 * Show the lesson content editor as a full-page overlay.
 * @param {ApiClient} apiClient
 * @param {string} lessonId
 * @param {string} lessonTitle
 * @param {string} courseName
 * @param {Function} onClose - called when user navigates back
 */
export async function showLessonContentEditor(apiClient, lessonId, lessonTitle, onClose, courseName = '') {
  const overlay = document.createElement('div')
  overlay.className = 'pv-overlay'
  overlay.style.cssText = 'z-index:50000;background:var(--color-bg-base);align-items:stretch;justify-content:stretch'
  overlay.innerHTML = `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden">
      <div id="lce-header" style="flex-shrink:0;padding:16px 32px;border-bottom:1px solid var(--color-gray-200);background:#fff;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:16px">
          <button id="lce-back" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--color-brand-600);font-size:13px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Lessons
          </button>
          <div style="width:1px;height:24px;background:var(--color-gray-200)"></div>
          <div>
            <div style="font-size:18px;font-weight:700;color:var(--color-gray-900)">${escapeHtml(lessonTitle)}</div>
            ${courseName ? `<div style="font-size:12px;color:var(--color-gray-400)">${escapeHtml(courseName)}</div>` : ''}
          </div>
        </div>
        <div id="lce-add-btns" style="display:flex;gap:8px"></div>
      </div>
      <div id="lce-body" style="flex:1;overflow-y:auto;padding:32px;background:#f8fafc">
        <div class="loading-cell">Loading...</div>
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  document.body.style.overflow = 'hidden'

  const close = () => {
    document.body.style.overflow = ''
    overlay.remove()
    onClose?.()
  }

  overlay.querySelector('#lce-back').addEventListener('click', close)

  // Render add buttons
  const addBtnsEl = overlay.querySelector('#lce-add-btns')
  Object.entries(TYPE_CONFIG).forEach(([type, c]) => {
    const btn = document.createElement('button')
    btn.style.cssText = `display:flex;align-items:center;gap:6px;padding:8px 14px;background:${c.badge};border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;color:${c.text}`
    btn.innerHTML = `${c.icon} + ${c.label}`
    btn.addEventListener('click', () => addContent(type))
    addBtnsEl.appendChild(btn)
  })

  const bodyEl = overlay.querySelector('#lce-body')

  async function render() {
    try {
      const content = await apiClient.getLessonContent(lessonId)

      if (content.length === 0) {
        bodyEl.innerHTML = `
          <div style="text-align:center;padding:80px 40px">
            <div style="font-size:48px;margin-bottom:16px">📚</div>
            <div style="font-size:18px;font-weight:600;color:var(--color-gray-900);margin-bottom:8px">No content yet</div>
            <div style="font-size:14px;color:var(--color-gray-400);max-width:400px;margin:0 auto">Add videos, puzzles, PDFs, or quizzes using the buttons above to build your lesson.</div>
          </div>
        `
        return
      }

      bodyEl.innerHTML = `
        <div style="max-width:800px;margin:0 auto;display:flex;flex-direction:column;gap:12px">
          ${content.map((item, i) => renderItem(item, i, content.length)).join('')}
        </div>
      `

      // Wire events
      bodyEl.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const confirmed = await showAppConfirm({ title: 'Delete Content?', message: 'Remove this item from the lesson?', confirmLabel: 'Delete', confirmColor: 'var(--color-error-500)', icon: 'delete' })
          if (confirmed) { await apiClient.deleteContent(btn.dataset.id); render() }
        })
      })

      bodyEl.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => editContent(btn.dataset.id, content.find(c => c.id === btn.dataset.id)))
      })
    } catch (err) {
      bodyEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--color-error-500)">${escapeHtml(err.message)}</div>`
    }
  }

  function renderItem(item, index, total) {
    const c = TYPE_CONFIG[item.content_type] || TYPE_CONFIG.video
    const detail = getItemDetail(item)

    return `
      <div style="display:flex;gap:16px;align-items:flex-start;padding:20px;border-radius:12px;background:#fff;border:1px solid ${c.border};transition:box-shadow 0.2s">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:40px">
          <span style="width:32px;height:32px;border-radius:8px;background:${c.badge};display:flex;align-items:center;justify-content:center;font-size:16px">${c.icon}</span>
          <span style="font-size:10px;font-weight:700;color:${c.text};letter-spacing:0.05em">${c.label}</span>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:600;color:var(--color-gray-900);margin-bottom:4px">${escapeHtml(item.title)}</div>
          <div style="font-size:12px;color:var(--color-gray-400);margin-bottom:8px">${escapeHtml(detail)}</div>
          <div style="display:flex;gap:8px;align-items:center">
            <span style="padding:2px 8px;background:${c.badge};border-radius:10px;font-size:11px;font-weight:500;color:${c.text}">+${item.xp_reward} XP</span>
            <span style="font-size:11px;color:var(--color-gray-400)">Item ${index + 1} of ${total}</span>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button data-action="edit" data-id="${item.id}" style="padding:6px 14px;border:1px solid var(--color-gray-200);border-radius:8px;background:#fff;font-size:12px;color:var(--color-gray-600);cursor:pointer">Edit</button>
          <button data-action="delete" data-id="${item.id}" style="padding:6px 14px;border:1px solid #fecaca;border-radius:8px;background:#fff;font-size:12px;color:#dc2626;cursor:pointer">Delete</button>
        </div>
      </div>
    `
  }

  function getItemDetail(item) {
    if (item.content_type === 'video') return item.video_url || item.file_path || 'No URL set'
    if (item.content_type === 'pdf') return item.file_path || 'No file uploaded'
    if (item.content_type === 'puzzle') {
      if (item.puzzle_instruction) return item.puzzle_instruction.substring(0, 60) + (item.puzzle_instruction.length > 60 ? '...' : '')
      return item.puzzle_fen ? `FEN: ${item.puzzle_fen.substring(0, 40)}...` : 'No FEN set'
    }
    if (item.content_type === 'quiz') return item.quiz_data ? `${JSON.parse(item.quiz_data).length} questions` : 'No questions'
    return ''
  }

  async function addContent(type) {
    if (type === 'video' || type === 'pdf') {
      const result = await showUploadContentDialog(type, apiClient)
      if (!result) return
      await apiClient.createContent(lessonId, result)
    } else if (type === 'puzzle') {
      openPuzzleComposer({
        apiClient,
        lessonId,
        lessonTitle,
        onSave: () => render(),
        onClose: () => {}
      })
      return
    } else if (type === 'quiz') {
      const title = await showAppPrompt({ title: 'Add Quiz', placeholder: 'Knowledge check' }) || 'Quiz'
      await apiClient.createContent(lessonId, { content_type: 'quiz', title, quiz_data: [], xp_reward: 15 })
    }
    render()
  }

  async function editContent(contentId, item) {
    if (!item) return
    if (item.content_type === 'puzzle') {
      openPuzzleComposer({
        apiClient,
        lessonId,
        lessonTitle,
        existingContent: item,
        onSave: () => render(),
        onClose: () => {}
      })
      return
    }
    const newTitle = await showAppPrompt({ title: `Edit ${TYPE_CONFIG[item.content_type]?.label || 'Content'}`, defaultValue: item.title, placeholder: 'Title' })
    if (newTitle && newTitle !== item.title) {
      await apiClient.updateContent(contentId, { title: newTitle })
      render()
    }
  }

  render()
}

// ==================== Upload Content Dialog (Video URL / Upload File) ====================

function showUploadContentDialog(defaultType = 'video', apiClient = null) {
  return new Promise((resolve) => {
    const inputStyle = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;font-family:inherit'
    const labelStyle = 'display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px'
    let activeTab = defaultType === 'pdf' ? 'upload' : 'url'

    const dlg = document.createElement('div')
    dlg.className = 'pv-overlay'
    dlg.style.zIndex = '60000'

    function renderDialog() {
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
              <button data-tab="url" style="flex:1;height:36px;border:none;border-radius:8px;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;${activeTab === 'url' ? 'background:#fff;font-weight:600;color:#4f46e5;box-shadow:0 1px 4px rgba(0,0,0,0.07)' : 'background:transparent;color:#94a3b8'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                Video URL
              </button>
              <button data-tab="upload" style="flex:1;height:36px;border:none;border-radius:8px;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;${activeTab === 'upload' ? 'background:#fff;font-weight:600;color:#4f46e5;box-shadow:0 1px 4px rgba(0,0,0,0.07)' : 'background:transparent;color:#94a3b8'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload File
              </button>
            </div>
            ${activeTab === 'url' ? `
              <div><label style="${labelStyle}">YouTube / Vimeo URL</label><input type="text" id="uc-url" placeholder="https://youtube.com/watch?v=..." style="${inputStyle}"></div>
              <div style="height:180px;background:#f1f5f9;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px">Video preview will appear here</div>
            ` : `
              <div><label style="${labelStyle}">Upload Video, PDF, or Image</label>
                <div id="uc-dropzone" style="height:140px;border:1.5px dashed #c7d2fe;border-radius:12px;background:#faf5ff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span style="font-size:14px;font-weight:500;color:#7c3aed">Drop files here or click to browse</span>
                  <span style="font-size:11px;color:#94a3b8">MP4, PDF, PNG, JPG — Max 100MB</span>
                  <input type="file" id="uc-file" accept=".mp4,.pdf,.png,.jpg,.jpeg" style="display:none">
                </div>
                <div id="uc-file-info" style="display:none;margin-top:8px;padding:8px 12px;background:#f0fdf4;border-radius:8px;font-size:12px;color:#059669"></div>
              </div>
            `}
            <div><label style="${labelStyle}">Display Title</label><input type="text" id="uc-title" placeholder="Introduction to the Italian Game" style="${inputStyle}"></div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:12px;padding:16px 24px;border-top:1px solid #e2e8f0">
            <button data-action="close" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font-size:13px;color:#64748b;cursor:pointer">Cancel</button>
            <button id="uc-submit" style="padding:10px 20px;border:none;border-radius:8px;background:#4f46e5;font-size:13px;font-weight:600;color:#fff;cursor:pointer">Add to Lesson</button>
          </div>
        </div>
      `

      // Tab switching
      dlg.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => { activeTab = btn.dataset.tab; renderDialog() })
      })

      // Close
      dlg.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', () => { dlg.remove(); resolve(null) }))
      dlg.addEventListener('click', (e) => { if (e.target === dlg) { dlg.remove(); resolve(null) } })

      // File upload dropzone
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
            if (!dlg.querySelector('#uc-title').value) {
              dlg.querySelector('#uc-title').value = file.name.replace(/\.[^.]+$/, '')
            }
          }
        })
      }

      // Submit
      dlg.querySelector('#uc-submit').addEventListener('click', async () => {
        const title = dlg.querySelector('#uc-title').value.trim()
        if (!title) { showAppAlert({ title: 'Required', message: 'Please enter a display title' }); return }

        if (activeTab === 'url') {
          const url = dlg.querySelector('#uc-url').value.trim()
          if (!url) { showAppAlert({ title: 'Required', message: 'Please enter a video URL' }); return }
          dlg.remove()
          resolve({ content_type: 'video', title, video_url: url, xp_reward: 10 })
        } else {
          const file = fileInput?.files?.[0]
          if (!file) { showAppAlert({ title: 'Required', message: 'Please select a file' }); return }
          // Upload file to server
          const submitBtn = dlg.querySelector('#uc-submit')
          submitBtn.textContent = 'Uploading...'
          submitBtn.disabled = true
          try {
            const formData = new FormData()
            formData.append('file', file)
            const token = apiClient._authManager?.getAccessToken() || ''
            const res = await fetch('/api/content/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData })
            const result = await res.json()
            if (!result.success) throw new Error(result.error)
            const contentType = file.name.endsWith('.pdf') ? 'pdf' : 'video'
            dlg.remove()
            resolve({ content_type: contentType, title, file_path: result.data.file_path, file_size: result.data.file_size, xp_reward: contentType === 'pdf' ? 5 : 10 })
          } catch (err) {
            submitBtn.textContent = 'Add to Lesson'
            submitBtn.disabled = false
            showAppAlert({ title: 'Upload Failed', message: err.message })
          }
        }
      })
    }

    document.body.appendChild(dlg)
    renderDialog()
  })
}

