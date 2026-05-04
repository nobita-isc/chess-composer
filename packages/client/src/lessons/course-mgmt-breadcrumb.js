/**
 * course-mgmt-breadcrumb.js
 * Top breadcrumb bar for the 3-pane course management workspace.
 * Renders: Courses › <Course Title> › <Lesson Title>
 * Each segment is clickable; clicking a parent clears the child selection.
 */

function escapeHtml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {Object} opts.selection - { courseId, courseTitle, lessonId, lessonTitle }
 * @param {() => void} opts.onGoRoot - clicked "Courses"
 * @param {() => void} opts.onGoCourse - clicked course title (clears lesson)
 */
export function renderBreadcrumb(container, { selection, onGoRoot, onGoCourse }) {
  const { courseId, courseTitle, lessonId, lessonTitle } = selection || {}

  const parts = []

  // Root segment — always present
  parts.push(`<button class="cm-bc-seg${!courseId ? ' cm-bc-active' : ''}" data-action="root">Courses</button>`)

  if (courseId) {
    parts.push('<span class="cm-bc-sep">›</span>')
    parts.push(`<button class="cm-bc-seg${!lessonId ? ' cm-bc-active' : ''}" data-action="course">${escapeHtml(courseTitle || 'Course')}</button>`)
  }

  if (lessonId) {
    parts.push('<span class="cm-bc-sep">›</span>')
    parts.push(`<span class="cm-bc-seg cm-bc-active">${escapeHtml(lessonTitle || 'Lesson')}</span>`)
  }

  container.innerHTML = `<nav class="cm-breadcrumb" aria-label="Course navigation">${parts.join('')}</nav>`

  container.querySelector('[data-action="root"]')?.addEventListener('click', onGoRoot)
  container.querySelector('[data-action="course"]')?.addEventListener('click', onGoCourse)
}
