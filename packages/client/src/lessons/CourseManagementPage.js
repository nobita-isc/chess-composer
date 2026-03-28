/**
 * CourseManagementPage.js
 * Admin page for managing courses, lessons, and content.
 */

import { showAppConfirm, showAppPrompt, showAppAlert } from '../shared/app-dialogs.js'
import { showLessonContentEditor } from './lesson-content-editor.js'

const SKILL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
const SKILL_BADGE_CLS = { beginner: 'badge-beginner', intermediate: 'badge-intermediate', advanced: 'badge-advanced' }

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Render the course management page.
 * @param {HTMLElement} container
 * @param {ApiClient} apiClient
 * @returns {Function} cleanup
 */
export function renderCoursesPage(container, apiClient) {
  container.innerHTML = `
    <div class="page-panel">
      <div class="main-header main-header-row">
        <div>
          <h1 class="page-title">Course Management</h1>
          <p class="page-subtitle">Create and manage chess opening courses</p>
        </div>
        <button id="create-course-btn" class="generate-btn">+ Create Course</button>
      </div>
      <div id="courses-content"><div class="loading-cell">Loading courses...</div></div>
    </div>
  `

  const contentEl = container.querySelector('#courses-content')

  container.querySelector('#create-course-btn').addEventListener('click', () => showCreateCourseDialog(apiClient, () => renderCourses()))

  async function renderCourses() {
    contentEl.innerHTML = '<div class="loading-cell">Loading...</div>'
    try {
      const courses = await apiClient.getCourses()

      if (courses.length === 0) {
        contentEl.innerHTML = '<div class="empty-message">No courses yet. Click "+ Create Course" to get started.</div>'
        return
      }

      contentEl.innerHTML = `
        <div class="ep-table-wrap">
          <table class="ep-table">
            <thead>
              <tr>
                <th class="ep-th-grow">Course</th>
                <th style="width:80px">Lessons</th>
                <th style="width:80px">Assigned</th>
                <th style="width:100px">Skill</th>
                <th style="width:280px">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${courses.map(c => `
                <tr data-id="${escapeHtml(c.id)}">
                  <td>
                    <div class="ep-cell-name">${escapeHtml(c.title)}</div>
                    <div class="ep-cell-muted" style="font-size:12px">${escapeHtml(c.description || 'No description')}</div>
                  </td>
                  <td>${c.lesson_count || 0}</td>
                  <td>${c.assigned_count || 0}</td>
                  <td><span class="badge ${SKILL_BADGE_CLS[c.skill_level] || 'badge-theme'}">${SKILL_LABELS[c.skill_level] || c.skill_level}</span></td>
                  <td>
                    <div class="ep-actions">
                      <button class="btn-outline btn-sm" data-action="edit">Edit</button>
                      <button class="btn-outline btn-sm" data-action="lessons">Lessons</button>
                      <button class="btn-outline btn-sm" data-action="assign">Assign</button>
                      <button class="btn-outline btn-sm" data-action="preview">Preview</button>
                      <button class="btn-outline btn-sm ep-more-btn" data-action="more" title="More">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `

      // Row actions
      contentEl.querySelectorAll('tr[data-id]').forEach(row => {
        row.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation()
            const courseId = row.dataset.id
            const action = btn.dataset.action

            try {
              if (action === 'edit') {
                const course = await apiClient.getCourse(courseId)
                showCreateCourseDialog(apiClient, () => renderCourses(), course)
              } else if (action === 'lessons') {
                showLessonManager(apiClient, courseId, () => renderCourses())
              } else if (action === 'assign') {
                showAssignDialog(apiClient, courseId)
              } else if (action === 'preview') {
                showAppAlert({ title: 'Preview', message: 'Preview mode will open the course as a student would see it. (Coming soon)' })
              } else if (action === 'more') {
                document.querySelectorAll('.gd-dropdown').forEach(d => d.remove())
                const dropdown = document.createElement('div')
                dropdown.className = 'gd-dropdown'
                dropdown.innerHTML = `<button class="gd-dd-item gd-dd-danger" data-dd="delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>Delete Course</button>`
                const rect = btn.getBoundingClientRect()
                dropdown.style.position = 'fixed'
                dropdown.style.top = `${rect.bottom + 4}px`
                dropdown.style.right = `${window.innerWidth - rect.right}px`
                document.body.appendChild(dropdown)
                const closeDd = () => { dropdown.remove(); document.removeEventListener('click', closeDd) }
                setTimeout(() => document.addEventListener('click', closeDd), 0)
                dropdown.querySelector('[data-dd="delete"]').addEventListener('click', async (ev) => {
                  ev.stopPropagation()
                  dropdown.remove()
                  const confirmed = await showAppConfirm({ title: 'Delete Course?', message: 'This will permanently delete this course and all its lessons.', confirmLabel: 'Delete', confirmColor: 'var(--color-error-500)', icon: 'delete' })
                  if (confirmed) {
                    await apiClient.deleteCourse(courseId)
                    renderCourses()
                  }
                })
              }
            } catch (error) {
              showAppAlert({ title: 'Error', message: error.message })
            }
          })
        })
      })
    } catch (error) {
      contentEl.innerHTML = `<div class="error-cell">Error: ${escapeHtml(error.message)}</div>`
    }
  }

  renderCourses()
  return () => {}
}

// ==================== Create/Edit Course Dialog ====================

function showCreateCourseDialog(apiClient, onSuccess, existing = null) {
  const isEdit = !!existing
  const inputStyle = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;font-family:inherit'
  const labelStyle = 'display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px'

  const dialog = document.createElement('div')
  dialog.className = 'pv-overlay'
  dialog.style.zIndex = '55000'
  dialog.innerHTML = `
    <div style="width:500px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.2);display:flex;flex-direction:column;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid #e2e8f0">
        <span style="font-size:18px;font-weight:700;color:#1e293b">${isEdit ? 'Edit Course' : 'Create New Course'}</span>
        <button data-action="close" style="width:32px;height:32px;border-radius:8px;background:#f1f5f9;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div style="padding:24px;display:flex;flex-direction:column;gap:16px">
        <div>
          <label style="${labelStyle}">Course Title</label>
          <input type="text" id="course-title" value="${escapeHtml(existing?.title || '')}" placeholder="e.g., Learn The Italian Game" style="${inputStyle}">
        </div>
        <div>
          <label style="${labelStyle}">Description</label>
          <textarea id="course-desc" rows="4" placeholder="Describe what students will learn..." style="${inputStyle};resize:vertical">${escapeHtml(existing?.description || '')}</textarea>
        </div>
        <div style="display:flex;gap:12px">
          <div style="flex:1">
            <label style="${labelStyle}">Skill Level</label>
            <select id="course-skill" style="${inputStyle}">
              <option value="beginner" ${existing?.skill_level === 'beginner' ? 'selected' : ''}>Beginner</option>
              <option value="intermediate" ${existing?.skill_level === 'intermediate' ? 'selected' : ''}>Intermediate</option>
              <option value="advanced" ${existing?.skill_level === 'advanced' ? 'selected' : ''}>Advanced</option>
            </select>
          </div>
          <div style="flex:1">
            <label style="${labelStyle}">Thumbnail</label>
            <div style="width:100%;height:40px;border:1px dashed #d1d5db;border-radius:8px;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;color:#94a3b8;font-size:12px;box-sizing:border-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload image
            </div>
          </div>
        </div>
        <div class="form-error" id="course-error"></div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:12px;padding:16px 24px;border-top:1px solid #e2e8f0">
        <button data-action="close" style="padding:10px 20px;border:1px solid #d1d5db;border-radius:8px;background:#fff;font-size:13px;color:#64748b;cursor:pointer">Cancel</button>
        <button id="course-submit" style="padding:10px 20px;border:none;border-radius:8px;background:#4f46e5;font-size:13px;font-weight:600;color:#fff;cursor:pointer">${isEdit ? 'Save Changes' : 'Create Course'}</button>
      </div>
    </div>
  `

  document.body.appendChild(dialog)
  const close = () => dialog.remove()
  dialog.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close))
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close() })

  dialog.querySelector('#course-submit').addEventListener('click', async () => {
    const title = dialog.querySelector('#course-title').value.trim()
    const description = dialog.querySelector('#course-desc').value.trim()
    const skill_level = dialog.querySelector('#course-skill').value
    const errorEl = dialog.querySelector('#course-error')

    if (!title) { errorEl.textContent = 'Title is required'; return }

    try {
      if (isEdit) {
        await apiClient.updateCourse(existing.id, { title, description, skill_level })
      } else {
        await apiClient.createCourse({ title, description, skill_level })
      }
      close()
      onSuccess()
    } catch (err) {
      errorEl.textContent = err.message
    }
  })
}

// ==================== Lesson Manager ====================

async function showLessonManager(apiClient, courseId, onClose) {
  const dialog = document.createElement('div')
  dialog.className = 'pv-overlay'
  dialog.style.cssText = 'z-index:50000;background:var(--color-bg-base);align-items:stretch;justify-content:stretch'
  dialog.innerHTML = `
    <div style="width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden">
      <div id="lm-header" style="flex-shrink:0;padding:16px 32px;border-bottom:1px solid var(--color-gray-200);background:#fff;display:flex;justify-content:space-between;align-items:center"></div>
      <div id="lm-body" style="flex:1;overflow-y:auto;padding:32px;background:#f8fafc">
        <div class="loading-cell">Loading...</div>
      </div>
    </div>
  `
  document.body.appendChild(dialog)
  document.body.style.overflow = 'hidden'
  const close = () => { document.body.style.overflow = ''; dialog.remove(); onClose() }

  try {
    const course = await apiClient.getCourse(courseId)
    const lessons = course.lessons || []

    async function render() {
      const freshLessons = (await apiClient.getCourse(courseId)).lessons || []

      dialog.querySelector('#lm-header').innerHTML = `
        <div style="display:flex;align-items:center;gap:16px">
          <button data-action="close" style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--color-brand-600);font-size:13px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Courses
          </button>
          <div style="width:1px;height:24px;background:var(--color-gray-200)"></div>
          <div>
            <div style="font-size:18px;font-weight:700;color:var(--color-gray-900)">Lessons: ${escapeHtml(course.title)}</div>
            <div style="font-size:12px;color:var(--color-gray-400)">${freshLessons.length} lesson${freshLessons.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <button class="generate-btn" id="add-lesson-btn" style="font-size:13px;padding:8px 16px">+ Add Lesson</button>
      `

      const bodyEl = dialog.querySelector('#lm-body')
      bodyEl.innerHTML = freshLessons.length === 0
        ? `<div style="text-align:center;padding:80px 40px"><div style="font-size:48px;margin-bottom:16px">📖</div><div style="font-size:18px;font-weight:600;color:var(--color-gray-900);margin-bottom:8px">No lessons yet</div><div style="font-size:14px;color:var(--color-gray-400)">Click "+ Add Lesson" to start building your course.</div></div>`
        : `<div style="max-width:800px;margin:0 auto;display:flex;flex-direction:column;gap:12px">
            ${freshLessons.map((l, i) => `
              <div data-lesson-id="${escapeHtml(l.id)}" style="display:flex;align-items:center;gap:16px;padding:20px;background:#fff;border:1px solid var(--color-gray-200);border-radius:12px">
                <span style="width:36px;height:36px;border-radius:10px;background:var(--color-brand-50);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--color-brand-600)">${i + 1}</span>
                <div style="flex:1">
                  <div style="font-weight:600;font-size:15px;color:var(--color-gray-900)">${escapeHtml(l.title)}</div>
                  <div style="font-size:12px;color:var(--color-gray-400);margin-top:2px">${l.content_count || 0} content items</div>
                </div>
                <div style="display:flex;gap:8px">
                  <button class="btn-outline btn-sm" data-action="edit-lesson">Edit</button>
                  <button class="btn-outline btn-sm" data-action="content" style="color:var(--color-brand-600);border-color:var(--color-brand-200)">Content</button>
                  <button class="btn-outline btn-sm" data-action="delete-lesson" style="color:var(--color-error-600);border-color:var(--color-error-200)">Delete</button>
                </div>
              </div>
            `).join('')}
          </div>`

      dialog.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close))

      dialog.querySelector('#add-lesson-btn')?.addEventListener('click', async () => {
        const title = await showAppPrompt({ title: 'Add Lesson', placeholder: 'Lesson title' })
        if (title) {
          await apiClient.createLesson(courseId, { title })
          render()
        }
      })

      dialog.querySelectorAll('[data-action="edit-lesson"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const lessonId = btn.closest('[data-lesson-id]').dataset.lessonId
          const lesson = freshLessons.find(l => l.id === lessonId)
          const newTitle = await showAppPrompt({ title: 'Edit Lesson', defaultValue: lesson?.title, placeholder: 'Lesson title' })
          if (newTitle) { await apiClient.updateLesson(lessonId, { title: newTitle }); render() }
        })
      })

      dialog.querySelectorAll('[data-action="delete-lesson"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const lessonId = btn.closest('[data-lesson-id]').dataset.lessonId
          const confirmed = await showAppConfirm({ title: 'Delete Lesson?', message: 'This will delete the lesson and all its content.', confirmLabel: 'Delete', confirmColor: 'var(--color-error-500)', icon: 'delete' })
          if (confirmed) { await apiClient.deleteLesson(lessonId); render() }
        })
      })

      dialog.querySelectorAll('[data-action="content"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const lessonRow = btn.closest('[data-lesson-id]')
          const lessonId = lessonRow.dataset.lessonId
          const lessonTitle = freshLessons.find(l => l.id === lessonId)?.title || 'Lesson'
          showLessonContentEditor(apiClient, lessonId, lessonTitle, () => render(), course.title)
        })
      })
    }

    render()
  } catch (err) {
    dialog.querySelector('.gd-dialog').innerHTML = `<div style="padding:40px;text-align:center;color:var(--color-error-500)">${escapeHtml(err.message)}</div>`
  }
}

// ==================== Assign Dialog ====================

async function showAssignDialog(apiClient, courseId) {
  const dialog = document.createElement('div')
  dialog.className = 'pv-overlay'
  dialog.style.zIndex = '55000'
  dialog.innerHTML = `<div class="gd-dialog" style="width:500px"><div class="gd-loading" style="padding:40px;text-align:center">Loading...</div></div>`
  document.body.appendChild(dialog)
  const close = () => dialog.remove()
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close() })

  try {
    const [students, assignments] = await Promise.all([
      apiClient.getStudents(),
      apiClient.getCourseAssignments(courseId)
    ])
    const assignedIds = new Set(assignments.map(a => a.student_id))

    dialog.querySelector('.gd-dialog').innerHTML = `
      <div class="gd-header">
        <span class="gd-title">Assign Course to Students</span>
        <button class="pv-close-btn" data-action="close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <div class="gd-body">
        ${students.length === 0 ? '<div class="empty-message">No students found</div>' :
          `<div style="display:flex;flex-direction:column;gap:8px">
            ${students.map(s => `
              <label style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--color-gray-200);border-radius:8px;cursor:pointer">
                <input type="checkbox" value="${escapeHtml(s.id)}" ${assignedIds.has(s.id) ? 'checked disabled' : ''} style="accent-color:var(--color-brand-600)">
                <span style="font-weight:500">${escapeHtml(s.name)}</span>
                ${assignedIds.has(s.id) ? '<span class="badge badge-beginner" style="font-size:10px">Already assigned</span>' : ''}
              </label>
            `).join('')}
          </div>`}
      </div>
      <div class="gd-footer">
        <button class="btn-outline" data-action="close" style="padding:10px 24px">Cancel</button>
        <button class="generate-btn" id="assign-submit" style="padding:10px 24px">Assign Selected</button>
      </div>
    `

    dialog.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close))

    dialog.querySelector('#assign-submit')?.addEventListener('click', async () => {
      const selected = [...dialog.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)')].map(cb => cb.value)
      if (selected.length === 0) { showAppAlert({ title: 'No Selection', message: 'Select at least one student' }); return }
      try {
        await apiClient.assignCourse(courseId, selected)
        showAppAlert({ title: 'Assigned', message: `Course assigned to ${selected.length} student(s)` })
        close()
      } catch (err) {
        showAppAlert({ title: 'Error', message: err.message })
      }
    })
  } catch (err) {
    dialog.querySelector('.gd-dialog').innerHTML = `<div style="padding:40px;text-align:center;color:var(--color-error-500)">${escapeHtml(err.message)}</div>`
  }
}
