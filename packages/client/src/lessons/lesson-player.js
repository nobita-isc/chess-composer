/**
 * lesson-player.js
 * Coursera-style full-screen lesson player with sidebar navigation.
 * Used by both student learning and admin preview.
 */

import { openExercisePuzzleViewer } from '../exercises/ExercisePuzzleViewer.js'
import { openLessonPuzzlePlayer } from './lesson-puzzle-player.js'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Open the lesson player.
 * @param {object} course - { title, lessons: [{ title, content: [{ id, content_type, title, video_url, puzzle_fen, completed }] }] }
 * @param {object} options - { apiClient?, readOnly?, onClose? }
 */
export function openLessonPlayer(course, options = {}) {
  const { apiClient, readOnly = false, onClose } = options
  const lessons = course.lessons || []
  const allItems = []
  lessons.forEach(l => (l.content || []).forEach(item => { item.lessonTitle = l.title; allItems.push(item) }))

  if (allItems.length === 0) return

  let currentIndex = allItems.findIndex(i => !i.completed)
  if (currentIndex === -1) currentIndex = 0

  const overlay = document.createElement('div')
  overlay.className = 'pv-overlay'
  overlay.style.cssText = 'z-index:50000;background:#fff;align-items:stretch;justify-content:stretch'
  document.body.appendChild(overlay)
  document.body.style.overflow = 'hidden'

  const close = () => {
    document.body.style.overflow = ''
    overlay.remove()
    onClose?.()
  }

  function render() {
    const current = allItems[currentIndex]
    const typeIcons = { video: '▶', pdf: '📄', puzzle: '♟', quiz: '❓' }

    overlay.innerHTML = `
      <div style="width:100%;height:100%;display:flex">
        <div style="width:300px;height:100%;background:#f8fafc;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden;flex-shrink:0">
          <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0">
            <button id="lp-back" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#4f46e5;font-size:12px;margin-bottom:8px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              Back to Course
            </button>
            <div style="font-size:15px;font-weight:700;color:#1e293b">${escapeHtml(course.title)}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
              <div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
                <div style="width:${Math.round(allItems.filter(i => i.completed).length / allItems.length * 100)}%;height:100%;background:#4f46e5;border-radius:3px"></div>
              </div>
              <span style="font-size:11px;font-weight:600;color:#4f46e5">${Math.round(allItems.filter(i => i.completed).length / allItems.length * 100)}%</span>
            </div>
          </div>
          <div style="flex:1;overflow-y:auto;padding:8px 0">
            ${lessons.map(lesson => `
              <div style="padding:8px 20px;font-size:12px;font-weight:600;color:#1e293b;display:flex;align-items:center;gap:6px">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                ${escapeHtml(lesson.title)}
              </div>
              ${(lesson.content || []).map(item => {
                const idx = allItems.findIndex(i => i.id === item.id)
                const isActive = idx === currentIndex
                const isDone = item.completed
                return `
                  <button class="lp-item" data-idx="${idx}" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 20px 8px 36px;border:none;cursor:pointer;font-size:12px;text-align:left;${isActive ? 'background:#eef2ff;font-weight:600;color:#4f46e5' : isDone ? 'background:transparent;color:#94a3b8' : 'background:transparent;color:#64748b'}">
                    <span style="width:18px;height:18px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;${isDone ? 'background:#059669;color:#fff' : isActive ? 'background:#4f46e5;color:#fff' : 'border:1.5px solid #d1d5db'}">${isDone ? '✓' : isActive ? '●' : ''}</span>
                    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(item.title)}</span>
                    <span style="font-size:10px;color:#94a3b8">${typeIcons[item.content_type] || ''}</span>
                  </button>
                `
              }).join('')}
            `).join('')}
          </div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
          <div id="lp-content" style="flex:1;overflow-y:auto">
            ${renderContent(current)}
          </div>
          <div style="padding:16px 32px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="padding:3px 10px;background:#eef2ff;border-radius:10px;font-size:11px;font-weight:500;color:#4f46e5">⚡ +${current.xp_reward || 10} XP</span>
              <span style="font-size:12px;color:#94a3b8">Item ${currentIndex + 1} of ${allItems.length}</span>
            </div>
            ${readOnly ? '<span style="font-size:12px;color:#94a3b8">Preview mode</span>' : `
              <div style="display:flex;gap:8px">
                ${current.completed ? `<button id="lp-reset" style="padding:12px 24px;background:#fff;border:1px solid #d1d5db;border-radius:10px;color:#64748b;font-size:14px;font-weight:500;cursor:pointer">Reset Progress</button>` : ''}
                <button id="lp-next" style="display:flex;align-items:center;gap:8px;padding:12px 24px;background:${current.completed ? '#059669' : '#4f46e5'};border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:600;cursor:pointer">
                  ${current.completed ? (currentIndex < allItems.length - 1 ? 'Next →' : '✓ All Done') : (currentIndex < allItems.length - 1 ? 'Mark Complete & Next →' : 'Complete Lesson ✓')}
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    `

    // Events
    overlay.querySelector('#lp-back').addEventListener('click', close)
    overlay.querySelectorAll('.lp-item').forEach(btn => {
      btn.addEventListener('click', () => { currentIndex = parseInt(btn.dataset.idx); render() })
    })

    // Puzzle player button
    const solveBtn = overlay.querySelector('#lp-solve')
    if (solveBtn) {
      solveBtn.addEventListener('click', () => {
        const puzzleItems = allItems.filter(i => i.content_type === 'puzzle')
        const puzzleIdx = parseInt(solveBtn.dataset.puzzleIdx)
        const puzzleTotal = parseInt(solveBtn.dataset.puzzleTotal)
        const currentItem = allItems[currentIndex]

        openLessonPuzzlePlayer({
          item: currentItem,
          courseTitle: course.title,
          challengeIndex: puzzleIdx,
          totalChallenges: puzzleTotal,
          onComplete: async () => {
            if (apiClient && !readOnly) {
              try {
                await apiClient.markContentComplete(currentItem.id, { xp_earned: currentItem.xp_reward || 20, course_id: course.id })
                currentItem.completed = 1
              } catch {}
            }
          },
          onClose: () => render(),
          onNext: () => {
            // Find next puzzle item
            const nextPuzzle = puzzleItems[puzzleIdx + 1]
            if (nextPuzzle) {
              currentIndex = allItems.findIndex(i => i.id === nextPuzzle.id)
              render()
              // Auto-open next puzzle
              setTimeout(() => overlay.querySelector('#lp-solve')?.click(), 100)
            }
          },
          onPrev: () => {
            const prevPuzzle = puzzleItems[puzzleIdx - 1]
            if (prevPuzzle) {
              currentIndex = allItems.findIndex(i => i.id === prevPuzzle.id)
              render()
              setTimeout(() => overlay.querySelector('#lp-solve')?.click(), 100)
            }
          }
        })
      })
    }

    const resetBtn = overlay.querySelector('#lp-reset')
    if (resetBtn && apiClient) {
      resetBtn.addEventListener('click', async () => {
        const item = allItems[currentIndex]
        try { await apiClient.resetContentProgress(item.id); item.completed = 0 } catch {}
        render()
      })
    }

    const nextBtn = overlay.querySelector('#lp-next')
    if (nextBtn && apiClient) {
      nextBtn.addEventListener('click', async () => {
        const item = allItems[currentIndex]
        try {
          await apiClient.markContentComplete(item.id, { xp_earned: item.xp_reward || 10, course_id: course.id })
          item.completed = 1
        } catch {}
        if (currentIndex < allItems.length - 1) { currentIndex++; render() }
        else { close() }
      })
    }
  }

  function renderContent(item) {
    if (item.content_type === 'video') {
      const url = item.video_url || item.file_path || ''
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
      const isUploadedVideo = url.startsWith('/uploads/') || url.endsWith('.mp4') || url.endsWith('.webm')
      const embedUrl = url.includes('youtube.com/watch') ? url.replace('watch?v=', 'embed/') :
                        url.includes('youtu.be/') ? `https://www.youtube.com/embed/${url.split('youtu.be/')[1]}` : url
      return `
        <div style="width:100%;aspect-ratio:16/9;background:#0f172a">
          ${isYouTube ? `<iframe src="${escapeHtml(embedUrl)}" style="width:100%;height:100%;border:none" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>` :
           isUploadedVideo ? `<video src="${escapeHtml(url)}" controls style="width:100%;height:100%"></video>` :
           url ? `<iframe src="${escapeHtml(url)}" style="width:100%;height:100%;border:none"></iframe>` :
          '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#1e293b"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg><span style="color:#64748b;font-size:14px">No video uploaded yet</span></div>'}
        </div>
        <div style="padding:24px 32px">
          <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin:0 0 8px">${escapeHtml(item.title)}</h2>
          <p style="font-size:14px;color:#64748b;line-height:1.6">${escapeHtml(item.lessonTitle)}</p>
        </div>
      `
    }
    if (item.content_type === 'puzzle') {
      const puzzleItems = allItems.filter(i => i.content_type === 'puzzle')
      const puzzleIdx = puzzleItems.findIndex(p => p.id === item.id)
      return `
        <div style="display:flex;align-items:center;justify-content:center;padding:60px 32px;flex-direction:column;gap:20px">
          <div style="font-size:20px;font-weight:700;color:#1e293b">${escapeHtml(item.title)}</div>
          ${item.puzzle_instruction ? `<div style="font-size:14px;color:#64748b;max-width:500px;text-align:center;line-height:1.5">${escapeHtml(item.puzzle_instruction)}</div>` : ''}
          <div style="padding:20px;background:#f8fafc;border-radius:12px;font-family:monospace;font-size:12px;color:#64748b;max-width:500px;word-break:break-all">${escapeHtml(item.puzzle_fen || 'No FEN')}</div>
          <button id="lp-solve" data-puzzle-idx="${puzzleIdx}" data-puzzle-total="${puzzleItems.length}" style="padding:12px 32px;background:#059669;border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:600;cursor:pointer">Play Challenge</button>
        </div>
      `
    }
    if (item.content_type === 'pdf') {
      const pdfUrl = item.file_path || ''
      return pdfUrl ? `
        <iframe src="${escapeHtml(pdfUrl)}" style="width:100%;height:100%;border:none;min-height:600px"></iframe>
        <div style="padding:16px 32px">
          <h2 style="font-size:20px;font-weight:700;color:#1e293b;margin:0">${escapeHtml(item.title)}</h2>
        </div>
      ` : `
        <div style="display:flex;align-items:center;justify-content:center;padding:60px;flex-direction:column;gap:16px">
          <div style="font-size:48px">📄</div>
          <div style="font-size:20px;font-weight:700;color:#1e293b">${escapeHtml(item.title)}</div>
          <p style="font-size:14px;color:#64748b">No PDF file uploaded</p>
        </div>
      `
    }
    return `<div style="padding:60px;text-align:center;color:#64748b">${escapeHtml(item.title)}</div>`
  }

  render()
}
