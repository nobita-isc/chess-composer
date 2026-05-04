/**
 * CourseManagementPage.js
 * Orchestrator for the 3-pane course management workspace.
 * Holds { courseId, lessonId } selection state; renders breadcrumb + 3 panes + 2 splitters.
 * Dialogs are in course-mgmt-dialogs.js.
 */

import { createSplitter } from './shared/pane-splitter.js'
import { renderCourseListPane } from './course-list-pane.js'
import { renderLessonListPane } from './lesson-list-pane.js'
import { renderLessonEditorPane } from './lesson-editor-pane.js'
import { openLessonPlayer } from './lesson-player.js'
import { renderBreadcrumb } from './course-mgmt-breadcrumb.js'
import { showCreateCourseDialog, showAssignDialog } from './course-mgmt-dialogs.js'
import * as selectionStore from './shared/selection-store.js'
import { CM_STYLES as STYLES } from './cm-styles.js'


export function renderCoursesPage(container, apiClient) {
  // Restore persisted selection on init (hash → localStorage → null)
  const stored = selectionStore.read()
  let sel = { courseId: stored.courseId, courseTitle: null, lessonId: stored.lessonId, lessonTitle: null }
  /** @type {object|null} Full lesson object (includes description) for the editor pane */
  let selectedLesson = null
  let courseListCtrl = null
  let lessonListCtrl = null
  let unsubPopstate = null

  container.innerHTML = STYLES + `
    <div class="cm-workspace">
      <div class="cm-topbar">
        <div id="cm-breadcrumb"></div>
        <div class="cm-topbar-actions">
          <button id="cm-create-btn" class="cm-create-btn" title="Create a new course"><span style="font-size:14px;line-height:1">+</span> New course</button>
        </div>
      </div>
      <div class="cm-body">
        <div id="cm-pane-courses" class="cm-pane cm-pane-courses"></div>
        <div id="cm-splitter-left" class="cm-splitter"></div>
        <div id="cm-pane-lessons" class="cm-pane cm-pane-lessons"></div>
        <div id="cm-splitter-right" class="cm-splitter"></div>
        <div id="cm-pane-editor" class="cm-pane cm-pane-editor"></div>
      </div>
    </div>`

  // Splitters — attach after DOM exists
  createSplitter({ axis: 'x', target: container.querySelector('#cm-pane-courses'), lsKey: 'cm-pane-courses', min: 180, max: 400, defaultPx: 260 })
    .attach(container.querySelector('#cm-splitter-left'))
  createSplitter({ axis: 'x', target: container.querySelector('#cm-pane-lessons'), lsKey: 'cm-pane-lessons', min: 200, max: 420, defaultPx: 280 })
    .attach(container.querySelector('#cm-splitter-right'))

  function refreshBreadcrumb() {
    renderBreadcrumb(container.querySelector('#cm-breadcrumb'), {
      selection: sel,
      onGoRoot: () => {
        sel = { courseId: null, courseTitle: null, lessonId: null, lessonTitle: null }
        selectedLesson = null
        selectionStore.write({ courseId: null, lessonId: null })
        refreshAll()
      },
      onGoCourse: () => {
        sel = { ...sel, lessonId: null, lessonTitle: null }
        selectedLesson = null
        selectionStore.write({ courseId: sel.courseId, lessonId: null })
        refreshLessonEditor(); refreshBreadcrumb()
      }
    })
  }

  function refreshCourseList() {
    courseListCtrl = renderCourseListPane(container.querySelector('#cm-pane-courses'), {
      apiClient,
      selectedCourseId: sel.courseId,
      onSelectCourse: (id) => {
        const titleEl = container.querySelector(`.cm-course-item[data-id="${id}"] .cm-course-title`)
        sel = { courseId: id, courseTitle: titleEl?.textContent || '', lessonId: null, lessonTitle: null }
        selectionStore.write({ courseId: id, lessonId: null })
        refreshBreadcrumb(); refreshLessonList(); refreshLessonEditor()
      },
      onEditCourse: (course) => showCreateCourseDialog(apiClient, () => courseListCtrl?.refresh(), course),
      onAssign: (courseId) => showAssignDialog(apiClient, courseId),
      onListLoaded: (list) => {
        // Resolve breadcrumb name from fetched data on initial restore from selectionStore
        if (sel.courseId && !sel.courseTitle) {
          const c = list.find(x => x.id === sel.courseId)
          if (c) { sel = { ...sel, courseTitle: c.title }; refreshBreadcrumb() }
        }
      }
    })
  }

  function refreshLessonList() {
    lessonListCtrl = renderLessonListPane(container.querySelector('#cm-pane-lessons'), {
      apiClient,
      courseId: sel.courseId,
      selectedLessonId: sel.lessonId,
      onSelectLesson: (id) => {
        const titleEl = container.querySelector(`.cm-lesson-item[data-id="${id}"] .cm-lesson-title`)
        sel = { ...sel, lessonId: id, lessonTitle: titleEl?.textContent || '' }
        selectionStore.write({ courseId: sel.courseId, lessonId: id })
        refreshBreadcrumb(); refreshLessonEditor()
      },
      onLessonsChanged: () => courseListCtrl?.refresh(),
      onListLoaded: (lessons, courseTitle) => {
        let changed = false
        if (sel.courseId && courseTitle && !sel.courseTitle) { sel = { ...sel, courseTitle }; changed = true }
        if (sel.lessonId && !sel.lessonTitle) {
          const l = lessons.find(x => x.id === sel.lessonId)
          if (l) { sel = { ...sel, lessonTitle: l.title }; changed = true }
        }
        if (changed) refreshBreadcrumb()
      }
    })
  }

  /**
   * PATCH lesson fields (title and/or description).
   * Called by the meta editor on auto-save. Also refreshes lesson list title in sidebar.
   * @param {object} fields - { title?, description? }
   */
  async function patchLesson(fields) {
    if (!sel.lessonId) return
    await apiClient.updateLesson(sel.lessonId, fields)
    // Keep sel.lessonTitle in sync if title was changed (breadcrumb + sidebar)
    if (fields.title !== undefined) {
      sel = { ...sel, lessonTitle: fields.title }
      refreshBreadcrumb()
      lessonListCtrl?.refresh()
    }
  }

  /**
   * Fetch full lesson data for the editor pane (needs description field).
   * getCourse already returns l.* via findLessonsByCourse which includes description.
   */
  async function fetchAndRenderLessonEditor() {
    const editorPane = container.querySelector('#cm-pane-editor')
    if (!sel.lessonId || !sel.courseId) {
      selectedLesson = null
      renderLessonEditorPane(editorPane, { lesson: null, onPatch: patchLesson, apiClient })
      return
    }
    try {
      const lessons = await apiClient.getCourseLessons(sel.courseId)
      selectedLesson = lessons.find(l => l.id === sel.lessonId) || null
      // If lessonId was set but not found (deleted/invalid), clear lesson from store
      if (sel.lessonId && !selectedLesson) {
        sel = { ...sel, lessonId: null, lessonTitle: null }
        selectionStore.write({ courseId: sel.courseId, lessonId: null })
      }
    } catch (err) {
      // Course not found (404) or network error — clear full selection
      const is404 = err?.status === 404 || err?.message?.includes('404')
      if (is404) {
        sel = { courseId: null, courseTitle: null, lessonId: null, lessonTitle: null }
        selectionStore.clear()
        // Re-render panes so ghost selection highlight is removed
        refreshBreadcrumb()
        refreshCourseList()
        refreshLessonList()
      }
      selectedLesson = null
    }
    const onPreview = selectedLesson ? async () => {
      try {
        const course = await apiClient.previewCourse(sel.courseId)
        openLessonPlayer(course, { readOnly: true, startLessonId: sel.lessonId })
      } catch (e) { console.error('preview failed', e) }
    } : undefined
    renderLessonEditorPane(editorPane, { lesson: selectedLesson, onPatch: patchLesson, apiClient, onPreview })
  }

  function refreshLessonEditor() {
    fetchAndRenderLessonEditor()
  }

  function refreshAll() {
    refreshBreadcrumb(); refreshCourseList(); refreshLessonList(); refreshLessonEditor()
  }

  container.querySelector('#cm-create-btn').addEventListener('click', () => {
    showCreateCourseDialog(apiClient, () => courseListCtrl?.refresh())
  })

  // Subscribe to browser back/forward — restore selection from hash
  unsubPopstate = selectionStore.onChange(({ courseId, lessonId }) => {
    sel = { courseId, courseTitle: null, lessonId, lessonTitle: null }
    selectedLesson = null
    refreshBreadcrumb(); refreshLessonList(); refreshLessonEditor()
  })

  refreshAll()
  return () => { if (unsubPopstate) unsubPopstate() }
}
