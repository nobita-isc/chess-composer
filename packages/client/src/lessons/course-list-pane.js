/**
 * course-list-pane.js
 * Left pane of the 3-pane course management workspace.
 * Renders course list, emits onSelectCourse(id), exposes refresh().
 * Course actions (edit, assign, delete, preview) remain accessible via row buttons.
 */

import { showAppConfirm, showAppAlert } from '../shared/app-dialogs.js'
import { openLessonPlayer } from './lesson-player.js'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const SKILL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }

/**
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {ApiClient} opts.apiClient
 * @param {string|null} opts.selectedCourseId
 * @param {(id: string) => void} opts.onSelectCourse
 * @param {(course: Object) => void} opts.onEditCourse - triggers create/edit dialog in orchestrator
 * @param {(courseId: string) => void} opts.onAssign - triggers assign dialog in orchestrator
 * @returns {{ refresh: () => void }}
 */
export function renderCourseListPane(container, { apiClient, selectedCourseId, onSelectCourse, onEditCourse, onAssign, onListLoaded }) {
  let courses = []

  function render(list) {
    courses = list
    if (list.length === 0) {
      container.innerHTML = `
        <div class="cm-pane-header"><span class="cm-pane-title">Courses</span></div>
        <div class="cm-empty-state">No courses yet.</div>`
      return
    }
    container.innerHTML = `
      <div class="cm-pane-header"><span class="cm-pane-title">Courses</span><span style="font-weight:500;color:#cbd5e1;text-transform:none;letter-spacing:0">${list.length}</span></div>
      <ul class="cm-course-list">
        ${list.map(c => `
          <li class="cm-course-item${c.id === selectedCourseId ? ' cm-selected' : ''}" data-id="${escapeHtml(c.id)}">
            <div class="cm-course-row">
              <div class="cm-course-info" data-action="select">
                <span class="cm-skill-dot cm-skill-${c.skill_level || 'beginner'}" title="${escapeHtml(SKILL_LABELS[c.skill_level] || c.skill_level || '')}"></span>
                <span class="cm-course-title">${escapeHtml(c.title)}</span>
                <span class="cm-course-meta">${c.lesson_count || 0}</span>
              </div>
              <div class="cm-course-actions">
                <button class="cm-icon-btn" data-action="edit" title="Edit course">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="cm-icon-btn" data-action="assign" title="Assign students">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                </button>
                <button class="cm-icon-btn cm-icon-btn-danger" data-action="delete" title="Delete course">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
              </div>
            </div>
          </li>
        `).join('')}
      </ul>
    `

    container.querySelectorAll('.cm-course-item').forEach(item => {
      const courseId = item.dataset.id
      const course = courses.find(c => c.id === courseId)

      item.querySelector('[data-action="select"]').addEventListener('click', () => onSelectCourse(courseId))

      item.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
        e.stopPropagation()
        if (course) onEditCourse(course)
      })

      item.querySelector('[data-action="assign"]').addEventListener('click', (e) => {
        e.stopPropagation()
        onAssign(courseId)
      })

      item.querySelector('[data-action="delete"]').addEventListener('click', async (e) => {
        e.stopPropagation()
        try {
          const confirmed = await showAppConfirm({
            title: 'Delete Course?',
            message: 'This will permanently delete this course and all its lessons.',
            confirmLabel: 'Delete',
            confirmColor: 'var(--color-error-500)',
            icon: 'delete'
          })
          if (confirmed) {
            await apiClient.deleteCourse(courseId)
            refresh()
          }
        } catch (err) {
          showAppAlert({ title: 'Error', message: err.message })
        }
      })
    })
  }

  async function refresh() {
    container.innerHTML = '<div class="cm-loading">Loading...</div>'
    try {
      const list = await apiClient.getCourses()
      render(list)
      if (onListLoaded) onListLoaded(list)
    } catch (err) {
      container.innerHTML = `<div class="cm-error">Error: ${escapeHtml(err.message)}</div>`
    }
  }

  refresh()
  return { refresh }
}
