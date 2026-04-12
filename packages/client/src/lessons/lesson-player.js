/**
 * lesson-player.js
 * Coursera-style full-screen lesson player with sidebar navigation.
 * Used by both student learning and admin preview.
 */

import { safeMarkdown } from '../shared/safe-markdown.js'
import { openExercisePuzzleViewer } from '../exercises/ExercisePuzzleViewer.js'
import { openLessonPuzzlePlayer } from './lesson-puzzle-player.js'
import { downloadAsStyledHtml, downloadAllNotes } from '../shared/content-download-helper.js'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const DESCRIPTION_STYLES = `
  <style>
    .lp-description h2 { font-size:18px;font-weight:700;color:#1e293b;margin:16px 0 8px }
    .lp-description h3 { font-size:16px;font-weight:600;color:#334155;margin:12px 0 6px }
    .lp-description ul, .lp-description ol { padding-left:24px;margin:8px 0 }
    .lp-description li { margin:4px 0 }
    .lp-description a { color:#4f46e5;text-decoration:underline }
    .lp-description strong { font-weight:600 }
    .lp-description p { margin:8px 0 }
    .lp-description code { background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px }
  </style>
`

function renderDescription(markdown) {
  if (!markdown?.trim()) return ''
  const html = safeMarkdown(markdown)
  const isLong = markdown.length > 300
  return `
    <div class="lp-description-panel" style="padding:0 32px 20px">
      <button class="lp-desc-toggle" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#64748b;font-size:12px;font-weight:600;padding:8px 0">
        <svg class="lp-desc-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition:transform 0.2s;${isLong ? '' : 'transform:rotate(90deg)'}"><polyline points="9 18 15 12 9 6"/></svg>
        Learning Notes
      </button>
      <div class="lp-desc-body" style="overflow:hidden;transition:max-height 0.3s ease;${isLong ? 'max-height:0' : 'max-height:2000px'}">
        <div class="lp-description" style="font-size:14px;color:#374151;line-height:1.7;border-top:1px solid #e2e8f0;padding-top:12px">
          ${html}
        </div>
      </div>
    </div>
  `
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
  let activeTab = 'content'

  function renderSidebarContent(lessonList, items, activeIdx, icons) {
    return lessonList.map(lesson => `
      <div style="padding:8px 20px;font-size:12px;font-weight:600;color:#1e293b;display:flex;align-items:center;gap:6px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        ${escapeHtml(lesson.title)}
      </div>
      ${(lesson.content || []).map(item => {
        const idx = items.findIndex(i => i.id === item.id)
        const isActive = idx === activeIdx
        const isDone = item.completed
        return `
          <button class="lp-item" data-idx="${idx}" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 20px 8px 36px;border:none;cursor:pointer;font-size:12px;text-align:left;${isActive ? 'background:#eef2ff;font-weight:600;color:#4f46e5' : isDone ? 'background:transparent;color:#94a3b8' : 'background:transparent;color:#64748b'}">
            <span style="width:18px;height:18px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;${isDone ? 'background:#059669;color:#fff' : isActive ? 'background:#4f46e5;color:#fff' : 'border:1.5px solid #d1d5db'}">${isDone ? '✓' : isActive ? '●' : ''}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(item.title)}</span>
            <span style="font-size:10px;color:#94a3b8">${icons[item.content_type] || ''}</span>
          </button>
        `
      }).join('')}
    `).join('')
  }

  function renderNotesTab(items) {
    const withNotes = items.filter(i => i.description?.trim())
    if (withNotes.length === 0) {
      return '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px">No notes in this course yet</div>'
    }
    return withNotes.map(item => {
      const preview = item.description.replace(/[#*_\[\]()]/g, '').substring(0, 60)
      const idx = items.findIndex(i => i.id === item.id)
      return `
        <button class="lp-note-item" data-idx="${idx}" style="display:block;width:100%;text-align:left;padding:10px 20px;border:none;background:transparent;cursor:pointer;border-bottom:1px solid #f1f5f9">
          <div style="font-size:12px;font-weight:600;color:#1e293b">${escapeHtml(item.title)}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">${escapeHtml(preview)}...</div>
        </button>
      `
    }).join('')
  }

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
            ${allItems.some(i => i.description?.trim()) ? `<button id="lp-download-all" style="display:flex;align-items:center;justify-content:center;gap:6px;width:calc(100% - 16px);margin:8px 8px 0;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:600;color:#64748b;cursor:pointer">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download All Notes
            </button>` : ''}
          </div>
          ${allItems.some(i => i.description?.trim()) ? `
          <div style="display:flex;border-bottom:1px solid #e2e8f0;padding:0 20px">
            <button class="lp-tab" data-tab="content" style="flex:1;padding:8px 0;border:none;background:transparent;font-size:12px;font-weight:600;cursor:pointer;color:#4f46e5;border-bottom:2px solid #4f46e5">Content</button>
            <button class="lp-tab" data-tab="notes" style="flex:1;padding:8px 0;border:none;background:transparent;font-size:12px;font-weight:500;cursor:pointer;color:#94a3b8;border-bottom:2px solid transparent">Notes</button>
          </div>` : ''}
          <div id="lp-sidebar-content" style="flex:1;overflow-y:auto;padding:8px 0">
            ${renderSidebarContent(lessons, allItems, currentIndex, typeIcons)}
          </div>
          <div id="lp-sidebar-notes" style="flex:1;overflow-y:auto;padding:8px 0;display:none">
            ${renderNotesTab(allItems)}
          </div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
          <div id="lp-content" style="flex:1;overflow-y:auto">
            ${DESCRIPTION_STYLES}
            ${renderContent(current)}
          </div>
          <div style="padding:16px 32px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="padding:3px 10px;background:#eef2ff;border-radius:10px;font-size:11px;font-weight:500;color:#4f46e5">⚡ +${current.xp_reward || 10} XP</span>
              <span style="font-size:12px;color:#94a3b8">Item ${currentIndex + 1} of ${allItems.length}</span>
              ${current.description ? `<button id="lp-download" style="padding:6px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#64748b;cursor:pointer;display:flex;align-items:center;gap:4px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Notes
              </button>` : ''}
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

    // Description toggle (collapsible)
    const descToggle = overlay.querySelector('.lp-desc-toggle')
    if (descToggle) {
      descToggle.addEventListener('click', () => {
        const body = overlay.querySelector('.lp-desc-body')
        const chevron = overlay.querySelector('.lp-desc-chevron')
        const isCollapsed = body.style.maxHeight === '0px' || body.style.maxHeight === '0'
        body.style.maxHeight = isCollapsed ? `${body.scrollHeight}px` : '0'
        chevron.style.transform = isCollapsed ? 'rotate(90deg)' : ''
      })
    }

    // Open description links in new tab
    overlay.querySelectorAll('.lp-description a').forEach(a => {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noopener noreferrer')
    })

    // Download notes button
    const dlBtn = overlay.querySelector('#lp-download')
    if (dlBtn) {
      dlBtn.addEventListener('click', () => {
        downloadAsStyledHtml(current.title, current.description, {
          courseName: course.title, contentType: current.content_type
        })
      })
    }

    // Download all notes button
    const dlAllBtn = overlay.querySelector('#lp-download-all')
    if (dlAllBtn) {
      dlAllBtn.addEventListener('click', () => downloadAllNotes(course.title, allItems))
    }

    // Sidebar tab switching
    overlay.querySelectorAll('.lp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab
        const contentPanel = overlay.querySelector('#lp-sidebar-content')
        const notesPanel = overlay.querySelector('#lp-sidebar-notes')
        overlay.querySelectorAll('.lp-tab').forEach(t => {
          const isActive = t.dataset.tab === activeTab
          t.style.color = isActive ? '#4f46e5' : '#94a3b8'
          t.style.fontWeight = isActive ? '600' : '500'
          t.style.borderBottom = isActive ? '2px solid #4f46e5' : '2px solid transparent'
        })
        contentPanel.style.display = activeTab === 'content' ? 'block' : 'none'
        notesPanel.style.display = activeTab === 'notes' ? 'block' : 'none'
      })
    })

    // Notes tab item click → navigate to content
    overlay.querySelectorAll('.lp-note-item').forEach(btn => {
      btn.addEventListener('click', () => {
        currentIndex = parseInt(btn.dataset.idx)
        activeTab = 'content'
        render()
      })
    })

    // Puzzle player button
    const solveBtn = overlay.querySelector('#lp-solve')
    if (solveBtn) {
      solveBtn.addEventListener('click', () => {
        const currentItem = allItems[currentIndex]

        // Parse challenges: multi-challenge or single-puzzle fallback
        let challenges = []
        if (currentItem.puzzle_challenges) {
          try {
            const parsed = typeof currentItem.puzzle_challenges === 'string'
              ? JSON.parse(currentItem.puzzle_challenges) : currentItem.puzzle_challenges
            if (Array.isArray(parsed) && parsed.length > 0) challenges = parsed
          } catch { /* fallback below */ }
        }
        if (challenges.length === 0) {
          challenges = [currentItem] // single-puzzle fallback
        }

        // Track which challenges are solved
        const solved = new Set()

        function openChallenge(idx) {
          openLessonPuzzlePlayer({
            item: challenges[idx],
            courseTitle: course.title,
            challengeIndex: idx,
            totalChallenges: challenges.length,
            solvedCount: solved.size,
            onComplete: async () => {
              solved.add(idx)
              // Only mark content complete when ALL challenges are solved
              if (apiClient && !readOnly && solved.size === challenges.length) {
                try {
                  await apiClient.markContentComplete(currentItem.id, { xp_earned: currentItem.xp_reward || 20, course_id: course.id })
                  currentItem.completed = 1
                } catch {}
              }
            },
            onClose: () => render(),
            onNext: () => {
              if (idx < challenges.length - 1) openChallenge(idx + 1)
            },
            onPrev: () => {
              if (idx > 0) openChallenge(idx - 1)
            }
          })
        }

        openChallenge(0)
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
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="padding:2px 8px;background:#eef2ff;border-radius:6px;font-size:11px;font-weight:600;color:#4f46e5">VIDEO</span>
            <span style="font-size:12px;color:#94a3b8">${escapeHtml(item.lessonTitle)}</span>
          </div>
          <h2 style="font-size:22px;font-weight:700;color:#1e293b;margin:0">${escapeHtml(item.title)}</h2>
        </div>
        ${renderDescription(item.description)}
      `
    }
    if (item.content_type === 'puzzle') {
      let challengeCount = 1
      if (item.puzzle_challenges) {
        try {
          const parsed = typeof item.puzzle_challenges === 'string' ? JSON.parse(item.puzzle_challenges) : item.puzzle_challenges
          if (Array.isArray(parsed)) challengeCount = parsed.length
        } catch { /* */ }
      }
      return `
        <div style="display:flex;align-items:center;justify-content:center;padding:60px 32px;flex-direction:column;gap:20px">
          <div style="font-size:20px;font-weight:700;color:#1e293b">${escapeHtml(item.title)}</div>
          ${item.puzzle_instruction ? `<div style="font-size:14px;color:#64748b;max-width:500px;text-align:center;line-height:1.5">${escapeHtml(item.puzzle_instruction)}</div>` : ''}
          ${challengeCount > 1 ? `<div style="font-size:13px;color:#6366f1;font-weight:600">${challengeCount} challenges</div>` : ''}
          <button id="lp-solve" style="padding:12px 32px;background:#059669;border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:600;cursor:pointer">Play Challenge${challengeCount > 1 ? 's' : ''}</button>
          ${item.description ? `<div style="max-width:600px;text-align:left;width:100%">${renderDescription(item.description)}</div>` : ''}
        </div>
      `
    }
    if (item.content_type === 'pdf') {
      const pdfUrl = item.file_path || ''
      return pdfUrl ? `
        <div style="padding:16px 32px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="padding:2px 8px;background:#fef3c7;border-radius:6px;font-size:11px;font-weight:600;color:#92400e">PDF</span>
            <span style="font-size:12px;color:#94a3b8">${escapeHtml(item.lessonTitle)}</span>
          </div>
          <h2 style="font-size:22px;font-weight:700;color:#1e293b;margin:0">${escapeHtml(item.title)}</h2>
        </div>
        ${renderDescription(item.description)}
        <iframe src="${escapeHtml(pdfUrl)}" style="width:100%;height:100%;border:none;min-height:600px"></iframe>
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
