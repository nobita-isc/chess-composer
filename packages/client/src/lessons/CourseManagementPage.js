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
import { renderBreadcrumb } from './course-mgmt-breadcrumb.js'
import { showCreateCourseDialog, showAssignDialog } from './course-mgmt-dialogs.js'
import * as selectionStore from './shared/selection-store.js'

const STYLES = `<style>
.cm-workspace{display:flex;flex-direction:column;height:100%;min-height:0;font-family:inherit}
.cm-topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;border-bottom:1px solid #e2e8f0;background:#fff;flex-shrink:0}
.cm-breadcrumb{display:flex;align-items:center;gap:4px}
.cm-bc-seg{background:none;border:none;cursor:pointer;font-size:13px;color:#4f46e5;padding:2px 4px;border-radius:4px;font-family:inherit}
.cm-bc-seg:hover{background:#ede9fe}
.cm-bc-seg.cm-bc-active{color:#1e293b;font-weight:600;cursor:default}
.cm-bc-seg.cm-bc-active:hover{background:none}
.cm-bc-sep{color:#94a3b8;font-size:13px;user-select:none}
.cm-body{display:flex;flex:1;min-height:0;overflow:hidden}
.cm-pane{overflow-y:auto;display:flex;flex-direction:column;min-width:0}
.cm-pane-courses{width:260px;flex-shrink:0;border-right:1px solid #e2e8f0;background:#f8fafc}
.cm-pane-lessons{width:280px;flex-shrink:0;border-right:1px solid #e2e8f0;background:#fff}
.cm-pane-editor{flex:1;background:#fff;overflow-y:auto}
.cm-splitter{width:4px;flex-shrink:0;cursor:col-resize;background:transparent;transition:background 0.15s}
.cm-pane-header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;flex-shrink:0}
.cm-pane-title{flex:1}
.cm-add-btn{width:22px;height:22px;border-radius:6px;border:none;background:#ede9fe;color:#4f46e5;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.cm-add-btn:hover{background:#ddd6fe}
.cm-course-list,.cm-lesson-list{list-style:none;margin:0;padding:4px 0}
.cm-course-item,.cm-lesson-item{position:relative}
.cm-course-row,.cm-lesson-row{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;cursor:pointer;transition:background .1s}
.cm-course-row:hover,.cm-lesson-row:hover{background:#f1f5f9}
.cm-course-item.cm-selected .cm-course-row,.cm-lesson-item.cm-selected .cm-lesson-row{background:#ede9fe}
.cm-course-info{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.cm-course-title,.cm-lesson-title{font-size:13px;font-weight:500;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cm-course-meta,.cm-lesson-meta{font-size:11px;color:#94a3b8}
.cm-badge-sm{font-size:9px;padding:1px 5px}
.cm-course-actions,.cm-lesson-actions{display:none;align-items:center;gap:2px;position:absolute;right:8px;top:50%;transform:translateY(-50%)}
.cm-course-item:hover .cm-course-actions,.cm-lesson-item:hover .cm-lesson-actions{display:flex}
.cm-icon-btn{width:24px;height:24px;border:none;background:none;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#64748b}
.cm-icon-btn:hover{background:#e2e8f0;color:#1e293b}
.cm-icon-btn-danger:hover{background:#fee2e2;color:#ef4444}
.cm-lesson-row{align-items:center}
.cm-lesson-index{width:22px;height:22px;border-radius:8px;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#4f46e5;flex-shrink:0}
.cm-lesson-info{flex:1;min-width:0}
.cm-editor-shell{padding:24px;display:flex;flex-direction:column;gap:20px}
.cm-editor-header{border-bottom:1px solid #e2e8f0;padding-bottom:12px}
.cm-editor-title{font-size:20px;font-weight:700;color:#1e293b;margin:0}
.cm-editor-section{border:1px solid #e2e8f0;border-radius:10px;padding:16px}
.cm-placeholder-section{border-style:dashed;background:#f8fafc}
.cm-placeholder-badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:#ede9fe;color:#4f46e5;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em}
.cm-placeholder-label{font-size:13px;color:#94a3b8;margin:0}
.cm-editor-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:100%;color:#94a3b8;font-size:13px;text-align:center;padding:40px}
.cm-empty-state{padding:40px 16px;text-align:center;color:#94a3b8;font-size:13px}
.cm-loading{padding:20px 16px;text-align:center;color:#94a3b8;font-size:13px}
.cm-error{padding:16px;color:#ef4444;font-size:13px}
@media(max-width:768px){
  .cm-body{flex-direction:column}
  .cm-splitter{display:none}
  .cm-pane-courses,.cm-pane-lessons{width:100%!important;border-right:none;border-bottom:1px solid #e2e8f0}
  .cm-pane-editor{min-height:300px}
  .cm-course-actions,.cm-lesson-actions{display:flex}
}
</style>`

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
        <button id="cm-create-btn" class="generate-btn" style="font-size:12px;padding:6px 12px">+ Create Course</button>
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
      onAssign: (courseId) => showAssignDialog(apiClient, courseId)
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
      onLessonsChanged: () => courseListCtrl?.refresh()
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
    renderLessonEditorPane(editorPane, { lesson: selectedLesson, onPatch: patchLesson, apiClient })
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
