/**
 * lesson-content-editor.js
 * Dialog for managing lesson content items (video, PDF, puzzle, quiz).
 * Supports drag-to-reorder, add/delete content blocks.
 */

import { showAppConfirm, showAppPrompt, showAppAlert } from '../shared/app-dialogs.js'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const TYPE_COLORS = {
  video: { bg: '#f5f3ff', border: '#c7d2fe', badge: '#eef2ff', text: '#4f46e5', label: 'VIDEO' },
  pdf: { bg: '#fefce8', border: '#fde68a', badge: '#fef3c7', text: '#92400e', label: 'PDF' },
  puzzle: { bg: '#f0fdf4', border: '#86efac', badge: '#dcfce7', text: '#059669', label: 'PUZZLE' },
  quiz: { bg: '#fef2f2', border: '#fca5a5', badge: '#fee2e2', text: '#dc2626', label: 'QUIZ' }
}

/**
 * Show the lesson content editor dialog.
 * @param {ApiClient} apiClient
 * @param {string} lessonId
 * @param {string} lessonTitle
 * @param {Function} onClose
 */
export async function showLessonContentEditor(apiClient, lessonId, lessonTitle, onClose) {
  const dialog = document.createElement('div')
  dialog.className = 'pv-overlay'
  dialog.style.zIndex = '55000'
  dialog.innerHTML = `<div class="gd-dialog" style="width:800px;max-height:90vh;display:flex;flex-direction:column"><div class="gd-loading" style="padding:40px;text-align:center">Loading...</div></div>`
  document.body.appendChild(dialog)
  const close = () => { dialog.remove(); onClose?.() }
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close() })

  async function render() {
    try {
      const content = await apiClient.getLessonContent(lessonId)

      dialog.querySelector('.gd-dialog').innerHTML = `
        <div class="gd-header" style="flex-shrink:0">
          <span class="gd-title">Edit: ${escapeHtml(lessonTitle)}</span>
          <button class="pv-close-btn" data-action="close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="gd-body" style="flex:1;overflow-y:auto">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <span style="font-weight:700;font-size:15px;color:var(--color-gray-900)">Lesson Content</span>
            <div style="display:flex;gap:6px">
              ${Object.entries(TYPE_COLORS).map(([type, c]) => `
                <button class="add-content-btn" data-type="${type}" style="display:flex;align-items:center;gap:4px;padding:5px 10px;background:${c.badge};border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:500;color:${c.text}">+ ${c.label}</button>
              `).join('')}
            </div>
          </div>
          <div id="content-list" style="display:flex;flex-direction:column;gap:8px">
            ${content.length === 0 ? '<div class="empty-message" style="padding:20px">No content yet. Add videos, puzzles, PDFs, or quizzes above.</div>' :
              content.map(item => renderContentItem(item)).join('')}
          </div>
        </div>
        <div class="gd-footer" style="flex-shrink:0;justify-content:space-between">
          <span style="font-size:12px;color:var(--color-gray-400)">${content.length} items</span>
          <button class="btn-outline" data-action="close" style="padding:10px 24px">Done</button>
        </div>
      `

      // Events
      dialog.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close))

      // Add content buttons
      dialog.querySelectorAll('.add-content-btn').forEach(btn => {
        btn.addEventListener('click', () => addContent(btn.dataset.type))
      })

      // Delete buttons
      dialog.querySelectorAll('[data-action="delete-content"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const confirmed = await showAppConfirm({ title: 'Delete Content?', message: 'Remove this item from the lesson?', confirmLabel: 'Delete', confirmColor: 'var(--color-error-500)', icon: 'delete' })
          if (confirmed) {
            await apiClient.deleteContent(btn.dataset.contentId)
            render()
          }
        })
      })

      // Edit buttons
      dialog.querySelectorAll('[data-action="edit-content"]').forEach(btn => {
        btn.addEventListener('click', () => editContent(btn.dataset.contentId, content.find(c => c.id === btn.dataset.contentId)))
      })
    } catch (err) {
      dialog.querySelector('.gd-dialog').innerHTML = `<div style="padding:40px;text-align:center;color:var(--color-error-500)">${escapeHtml(err.message)}</div>`
    }
  }

  function renderContentItem(item) {
    const c = TYPE_COLORS[item.content_type] || TYPE_COLORS.video
    const meta = item.content_type === 'video' ? (item.video_url || item.file_path || '') :
                 item.content_type === 'pdf' ? (item.file_path || '') :
                 item.content_type === 'puzzle' ? `FEN: ${item.puzzle_fen || item.puzzle_id || ''}` :
                 'Quiz'
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:10px;background:${c.bg};border:1px solid ${c.border}">
        <span style="padding:3px 8px;background:${c.badge};border-radius:6px;font-size:10px;font-weight:600;color:${c.text}">${c.label}</span>
        <div style="flex:1">
          <div style="font-weight:500;font-size:13px;color:#1e293b">${escapeHtml(item.title)}</div>
          <div style="font-size:11px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:400px">${escapeHtml(meta)}</div>
        </div>
        <div style="display:flex;gap:4px">
          <button data-action="edit-content" data-content-id="${item.id}" style="padding:4px 10px;border:1px solid var(--color-gray-200);border-radius:6px;background:#fff;font-size:11px;color:var(--color-gray-600);cursor:pointer">Edit</button>
          <button data-action="delete-content" data-content-id="${item.id}" style="padding:4px 10px;border:1px solid #fecaca;border-radius:6px;background:#fff;font-size:11px;color:#dc2626;cursor:pointer">Delete</button>
        </div>
      </div>
    `
  }

  async function addContent(type) {
    if (type === 'video') {
      const url = await showAppPrompt({ title: 'Add Video', message: 'Paste YouTube or video URL', placeholder: 'https://youtube.com/watch?v=...' })
      if (!url) return
      const title = await showAppPrompt({ title: 'Video Title', placeholder: 'Introduction to the opening' }) || 'Video'
      await apiClient.createContent(lessonId, { content_type: 'video', title, video_url: url, xp_reward: 10 })
    } else if (type === 'pdf') {
      const title = await showAppPrompt({ title: 'Add PDF', message: 'Enter PDF title (file upload coming soon)', placeholder: 'Study guide' })
      if (!title) return
      await apiClient.createContent(lessonId, { content_type: 'pdf', title, xp_reward: 5 })
    } else if (type === 'puzzle') {
      const fen = await showAppPrompt({ title: 'Add Puzzle', message: 'Paste FEN position', placeholder: 'rnbqkbnr/pppppppp/8/8/...' })
      if (!fen) return
      const moves = await showAppPrompt({ title: 'Solution Moves', message: 'Enter solution in UCI format', placeholder: 'e2e4 e7e5' }) || ''
      const title = await showAppPrompt({ title: 'Puzzle Title', placeholder: 'Find the pin' }) || 'Puzzle'
      await apiClient.createContent(lessonId, { content_type: 'puzzle', title, puzzle_fen: fen, puzzle_moves: moves, xp_reward: 20 })
    } else if (type === 'quiz') {
      const title = await showAppPrompt({ title: 'Add Quiz', placeholder: 'Knowledge check' }) || 'Quiz'
      await apiClient.createContent(lessonId, { content_type: 'quiz', title, quiz_data: [], xp_reward: 15 })
    }
    render()
  }

  async function editContent(contentId, item) {
    if (!item) return
    const newTitle = await showAppPrompt({ title: `Edit ${TYPE_COLORS[item.content_type]?.label || 'Content'}`, defaultValue: item.title, placeholder: 'Title' })
    if (newTitle && newTitle !== item.title) {
      await apiClient.updateContent(contentId, { title: newTitle })
      render()
    }
  }

  render()
}
