/**
 * student-courses-page.js
 * Student view: browse assigned courses, see progress, open lesson player.
 */

import { openLessonPlayer } from './lesson-player.js'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const SKILL_BADGE = { beginner: 'badge-beginner', intermediate: 'badge-intermediate', advanced: 'badge-advanced' }

/**
 * Render student courses tab content.
 * @param {HTMLElement} contentEl - Content container
 * @param {ApiClient} apiClient
 */
export async function renderStudentCourses(contentEl, apiClient) {
  contentEl.innerHTML = '<div class="loading-cell">Loading courses...</div>'

  try {
    let courses = []
    try {
      courses = await apiClient.getMyCourses()
    } catch (err) {
      if (err.message?.includes('Student account required')) {
        contentEl.innerHTML = '<div class="empty-state"><p>Your user account is not linked to a student profile.</p><p class="empty-hint">Ask your teacher to link your account in User Management.</p></div>'
        return
      }
      throw err
    }
    let gamification = null
    try { gamification = await apiClient.getMyGamification() } catch {}

    if (courses.length === 0) {
      contentEl.innerHTML = '<div class="empty-state"><p>No courses assigned yet.</p><p class="empty-hint">Your teacher will assign courses for you to learn.</p></div>'
      return
    }

    const gamHtml = gamification ? `
      <div style="display:flex;gap:12px;align-items:center">
        <span style="display:flex;align-items:center;gap:6px;padding:4px 14px;background:#eef2ff;border-radius:20px;font-size:12px;font-weight:600;color:#4f46e5">⚡ ${gamification.total_xp} XP</span>
        <span style="display:flex;align-items:center;gap:6px;padding:4px 14px;background:#fef3c7;border-radius:20px;font-size:12px;font-weight:600;color:#92400e">🔥 ${gamification.current_streak} days</span>
      </div>
    ` : ''

    contentEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h2 style="font-size:20px;font-weight:700;color:var(--color-gray-900);margin:0">My Courses</h2>
          <p style="font-size:13px;color:var(--color-gray-400);margin:4px 0 0">Continue your learning journey</p>
        </div>
        ${gamHtml}
      </div>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        ${courses.map(c => `
          <div class="course-card" data-course-id="${escapeHtml(c.course_id)}" style="width:calc(33.33% - 14px);min-width:280px;border:1px solid var(--color-gray-200);border-radius:16px;overflow:hidden;cursor:pointer;transition:box-shadow 0.2s">
            <div style="height:120px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;flex-direction:column;justify-content:flex-end;padding:16px">
              <div style="font-size:16px;font-weight:700;color:#fff">${escapeHtml(c.title)}</div>
              <div style="font-size:11px;color:#c7d2fe">${c.lesson_count} Lessons · <span class="badge ${SKILL_BADGE[c.skill_level] || ''}" style="font-size:10px">${c.skill_level}</span></div>
            </div>
            <div style="padding:14px;display:flex;flex-direction:column;gap:10px">
              <div style="display:flex;justify-content:space-between;font-size:11px">
                <span style="color:var(--color-gray-500)">${c.completed_items}/${c.total_items} items</span>
                <span style="font-weight:600;color:${c.progress_pct === 100 ? '#059669' : '#4f46e5'}">${c.progress_pct}%</span>
              </div>
              <div style="height:6px;background:var(--color-gray-200);border-radius:3px;overflow:hidden">
                <div style="width:${c.progress_pct}%;height:100%;background:${c.progress_pct === 100 ? '#059669' : '#4f46e5'};border-radius:3px"></div>
              </div>
              <button class="generate-btn course-open-btn" data-cid="${escapeHtml(c.course_id)}" style="width:100%;padding:10px;font-size:13px">${c.progress_pct === 100 ? '✓ Completed' : c.progress_pct > 0 ? 'Continue Learning' : 'Start Course'}</button>
            </div>
          </div>
        `).join('')}
      </div>
    `

    // Click card or button → open lesson player directly
    const openCourse = async (courseId) => {
      try {
        const course = await apiClient.getMyCourse(courseId)
        openLessonPlayer(course, {
          apiClient,
          onClose: () => renderStudentCourses(contentEl, apiClient)
        })
      } catch (err) {
        contentEl.innerHTML = `<div class="error-cell">Error: ${escapeHtml(err.message)}</div>`
      }
    }
    contentEl.querySelectorAll('.course-card').forEach(card => {
      card.addEventListener('click', () => { if (card.dataset.courseId) openCourse(card.dataset.courseId) })
    })
    contentEl.querySelectorAll('.course-open-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); if (btn.dataset.cid) openCourse(btn.dataset.cid) })
    })
  } catch (error) {
    contentEl.innerHTML = `<div class="error-cell">Error: ${escapeHtml(error.message)}</div>`
  }
}

async function showCourseDetail(contentEl, apiClient, courseId) {
  contentEl.innerHTML = '<div class="loading-cell">Loading course...</div>'

  try {
    const course = await apiClient.getMyCourse(courseId)
    if (!course) { contentEl.innerHTML = '<div class="error-cell">Course not found</div>'; return }
    const lessons = course.lessons || []

    contentEl.innerHTML = `
      <div style="margin-bottom:20px">
        <button id="back-to-courses" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#4f46e5;font-size:13px;margin-bottom:12px">← Back to My Courses</button>
        <h2 style="font-size:20px;font-weight:700;color:var(--color-gray-900);margin:0">${escapeHtml(course.title)}</h2>
        <p style="font-size:13px;color:var(--color-gray-400);margin:4px 0 0">${escapeHtml(course.description || '')}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${lessons.map((lesson, li) => {
          const allDone = lesson.content?.every(c => c.completed) && lesson.content?.length > 0
          const anyDone = lesson.content?.some(c => c.completed)
          const borderColor = allDone ? '#bbf7d0' : anyDone ? '#c7d2fe' : '#e2e8f0'
          const bg = allDone ? '#f0fdf4' : anyDone ? '#eef2ff' : '#f8fafc'
          return `
            <div style="padding:16px;border:1px solid ${borderColor};border-radius:12px;background:${bg}">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                <span style="width:28px;height:28px;border-radius:14px;background:${allDone ? '#059669' : anyDone ? '#4f46e5' : '#e2e8f0'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:${allDone || anyDone ? '#fff' : '#94a3b8'}">${allDone ? '✓' : li + 1}</span>
                <div style="flex:1">
                  <div style="font-weight:600;font-size:15px;color:#1e293b">${escapeHtml(lesson.title)}</div>
                  <div style="font-size:12px;color:#94a3b8">${lesson.completed_items}/${lesson.total_items} items completed</div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;margin-left:40px">
                ${(lesson.content || []).map(item => {
                  const typeLabel = item.content_type === 'video' ? '▶ Video' : item.content_type === 'puzzle' ? '♟ Puzzle' : item.content_type === 'pdf' ? '📄 PDF' : '❓ Quiz'
                  return `
                    <div class="lesson-item" data-content-id="${item.id}" data-type="${item.content_type}" data-fen="${escapeHtml(item.puzzle_fen || '')}" data-moves="${escapeHtml(item.puzzle_moves || '')}" data-url="${escapeHtml(item.video_url || '')}" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;cursor:pointer;${item.completed ? 'opacity:0.6' : 'background:#fff;border:1px solid #e2e8f0'}">
                      <span style="width:16px;height:16px;border-radius:8px;${item.completed ? 'background:#059669' : 'border:1.5px solid #d1d5db'};display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff">${item.completed ? '✓' : ''}</span>
                      <span style="font-size:12px;color:#64748b">${typeLabel}</span>
                      <span style="font-size:13px;color:#1e293b;font-weight:500">${escapeHtml(item.title)}</span>
                      <span style="margin-left:auto;font-size:11px;color:#94a3b8">+${item.xp_reward} XP</span>
                    </div>
                  `
                }).join('')}
              </div>
            </div>
          `
        }).join('')}
      </div>
    `

    contentEl.querySelector('#back-to-courses').addEventListener('click', () => renderStudentCourses(contentEl, apiClient))

    // Click lesson item → open lesson player
    contentEl.querySelectorAll('.lesson-item').forEach(item => {
      item.addEventListener('click', () => {
        openLessonPlayer(course, {
          apiClient,
          onClose: () => showCourseDetail(contentEl, apiClient, courseId)
        })
      })
    })
  } catch (error) {
    contentEl.innerHTML = `<div class="error-cell">Error: ${escapeHtml(error.message)}</div>`
  }
}
