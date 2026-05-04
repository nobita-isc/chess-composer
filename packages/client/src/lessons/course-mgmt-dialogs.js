/**
 * course-mgmt-dialogs.js
 * Create/Edit Course dialog and Assign Students dialog for the course management workspace.
 * Extracted from CourseManagementPage.js to keep orchestrator under 200 lines.
 */

import { showAppAlert } from '../shared/app-dialogs.js'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const INPUT_STYLE = 'width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;font-family:inherit'
const LABEL_STYLE = 'display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px'

/**
 * Show create or edit course modal dialog.
 * @param {ApiClient} apiClient
 * @param {() => void} onSuccess
 * @param {Object|null} existing - existing course object for edit mode
 */
export function showCreateCourseDialog(apiClient, onSuccess, existing = null) {
  const isEdit = !!existing

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
          <label style="${LABEL_STYLE}">Course Title</label>
          <input type="text" id="course-title" value="${escapeHtml(existing?.title || '')}" placeholder="e.g., Learn The Italian Game" style="${INPUT_STYLE}">
        </div>
        <div>
          <label style="${LABEL_STYLE}">Description</label>
          <textarea id="course-desc" rows="3" placeholder="Describe what students will learn..." style="${INPUT_STYLE};resize:vertical">${escapeHtml(existing?.description || '')}</textarea>
        </div>
        <div>
          <label style="${LABEL_STYLE}">Skill Level</label>
          <select id="course-skill" style="${INPUT_STYLE}">
            <option value="beginner" ${existing?.skill_level === 'beginner' ? 'selected' : ''}>Beginner</option>
            <option value="intermediate" ${existing?.skill_level === 'intermediate' ? 'selected' : ''}>Intermediate</option>
            <option value="advanced" ${existing?.skill_level === 'advanced' ? 'selected' : ''}>Advanced</option>
          </select>
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

/**
 * Show assign-students modal dialog.
 * @param {ApiClient} apiClient
 * @param {string} courseId
 */
export async function showAssignDialog(apiClient, courseId) {
  const dialog = document.createElement('div')
  dialog.className = 'pv-overlay'
  dialog.style.zIndex = '55000'
  dialog.innerHTML = `<div class="gd-dialog" style="width:500px"><div style="padding:40px;text-align:center">Loading...</div></div>`
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
