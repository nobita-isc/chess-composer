/**
 * lesson-content-editor.js
 * Full-page editor for lesson content items (video, PDF, puzzle, quiz).
 * Renders inside a container with back navigation.
 */

import { showAppConfirm, showAppPrompt, showAppAlert } from '../shared/app-dialogs.js'

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
    if (item.content_type === 'puzzle') return item.puzzle_fen ? `FEN: ${item.puzzle_fen.substring(0, 40)}...` : 'No FEN set'
    if (item.content_type === 'quiz') return item.quiz_data ? `${JSON.parse(item.quiz_data).length} questions` : 'No questions'
    return ''
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
    const newTitle = await showAppPrompt({ title: `Edit ${TYPE_CONFIG[item.content_type]?.label || 'Content'}`, defaultValue: item.title, placeholder: 'Title' })
    if (newTitle && newTitle !== item.title) {
      await apiClient.updateContent(contentId, { title: newTitle })
      render()
    }
  }

  render()
}
