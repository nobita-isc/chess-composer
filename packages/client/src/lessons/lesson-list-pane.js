/**
 * lesson-list-pane.js
 * Middle pane of the 3-pane course management workspace.
 * Renders lessons for the selected course; emits onSelectLesson(id).
 * Handles add / rename / delete lesson inline.
 */

import { showAppConfirm, showAppPrompt, showAppAlert } from '../shared/app-dialogs.js'

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {ApiClient} opts.apiClient
 * @param {string|null} opts.courseId
 * @param {string|null} opts.selectedLessonId
 * @param {(id: string) => void} opts.onSelectLesson
 * @param {() => void} opts.onLessonsChanged - notify orchestrator (e.g. refresh course list count)
 * @returns {{ refresh: () => void }}
 */
export function renderLessonListPane(container, { apiClient, courseId, selectedLessonId, onSelectLesson, onLessonsChanged }) {
  if (!courseId) {
    container.innerHTML = '<div class="cm-empty-state">Select a course to view lessons.</div>'
    return { refresh: () => {} }
  }

  let lessons = []

  function renderHeader(courseTitle) {
    return `
      <div class="cm-pane-header">
        <span class="cm-pane-title">${escapeHtml(courseTitle || 'Lessons')}</span>
        <button class="cm-add-btn" id="add-lesson-btn" title="Add lesson">+</button>
      </div>
    `
  }

  function renderList(list) {
    if (list.length === 0) {
      return '<div class="cm-empty-state">No lessons yet. Click + to add one.</div>'
    }
    return `
      <ul class="cm-lesson-list">
        ${list.map((l, i) => `
          <li class="cm-lesson-item${l.id === selectedLessonId ? ' cm-selected' : ''}" data-id="${escapeHtml(l.id)}">
            <div class="cm-lesson-row" data-action="select">
              <span class="cm-lesson-index">${i + 1}</span>
              <div class="cm-lesson-info">
                <span class="cm-lesson-title">${escapeHtml(l.title)}</span>
                <span class="cm-lesson-meta">${l.content_count || 0} item${l.content_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div class="cm-lesson-actions">
              <button class="cm-icon-btn" data-action="rename" title="Rename lesson">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="cm-icon-btn cm-icon-btn-danger" data-action="delete" title="Delete lesson">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          </li>
        `).join('')}
      </ul>
    `
  }

  function wireEvents(courseData) {
    container.querySelector('#add-lesson-btn')?.addEventListener('click', async () => {
      const title = await showAppPrompt({ title: 'Add Lesson', placeholder: 'Lesson title' })
      if (!title) return
      try {
        await apiClient.createLesson(courseId, { title })
        onLessonsChanged()
        refresh()
      } catch (err) {
        showAppAlert({ title: 'Error', message: err.message })
      }
    })

    container.querySelectorAll('.cm-lesson-item').forEach(item => {
      const lessonId = item.dataset.id
      const lesson = lessons.find(l => l.id === lessonId)

      item.querySelector('[data-action="select"]').addEventListener('click', () => onSelectLesson(lessonId))

      item.querySelector('[data-action="rename"]')?.addEventListener('click', async (e) => {
        e.stopPropagation()
        const newTitle = await showAppPrompt({ title: 'Rename Lesson', defaultValue: lesson?.title, placeholder: 'Lesson title' })
        if (!newTitle) return
        try {
          await apiClient.updateLesson(lessonId, { title: newTitle })
          refresh()
        } catch (err) {
          showAppAlert({ title: 'Error', message: err.message })
        }
      })

      item.querySelector('[data-action="delete"]')?.addEventListener('click', async (e) => {
        e.stopPropagation()
        try {
          const confirmed = await showAppConfirm({
            title: 'Delete Lesson?',
            message: 'This will delete the lesson and all its content.',
            confirmLabel: 'Delete',
            confirmColor: 'var(--color-error-500)',
            icon: 'delete'
          })
          if (confirmed) {
            await apiClient.deleteLesson(lessonId)
            onLessonsChanged()
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
      const course = await apiClient.getCourse(courseId)
      lessons = course.lessons || []
      container.innerHTML = renderHeader(course.title) + renderList(lessons)
      wireEvents(course)
    } catch (err) {
      container.innerHTML = `<div class="cm-error">Error: ${escapeHtml(err.message)}</div>`
    }
  }

  refresh()
  return { refresh }
}
