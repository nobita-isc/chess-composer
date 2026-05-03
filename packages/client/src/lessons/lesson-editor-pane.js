/**
 * lesson-editor-pane.js
 * Right pane of the 3-pane course management workspace.
 * Phase 2: lesson-meta-editor (title + description, auto-save).
 * Phase 3: lesson-content-list (inline content items, per-type editors).
 */

import { createLessonMetaEditor } from './lesson-meta-editor.js'
import { createLessonContentList } from './lesson-content-list.js'

const META_EDITOR_STYLES = `<style>
.lme-root{display:flex;flex-direction:column;gap:8px;padding:0}
.lme-field-row{display:flex;align-items:center;gap:8px}
.lme-title-input{flex:1;font-size:18px;font-weight:700;color:#1e293b;border:none;border-bottom:2px solid transparent;outline:none;padding:2px 0;background:transparent;font-family:inherit;transition:border-color .15s}
.lme-title-input:focus{border-bottom-color:#4f46e5}
.lme-title-input::placeholder{color:#cbd5e1}
.lme-desc-textarea{width:100%;font-size:13px;color:#475569;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;resize:vertical;font-family:inherit;line-height:1.5;outline:none;transition:border-color .15s;box-sizing:border-box}
.lme-desc-textarea:focus{border-color:#4f46e5}
.lme-desc-textarea::placeholder{color:#cbd5e1}
.lme-badge{font-size:10px;font-weight:600;padding:2px 7px;border-radius:99px;white-space:nowrap;flex-shrink:0;min-width:0;transition:opacity .2s}
.lme-badge--idle{opacity:0}
.lme-badge--saving{background:#fef9c3;color:#92400e;opacity:1}
.lme-badge--saved{background:#dcfce7;color:#166534;opacity:1}
.lme-badge--error{background:#fee2e2;color:#991b1b;opacity:1}
</style>`

/**
 * @param {HTMLElement} container
 * @param {Object} opts
 * @param {object|null} opts.lesson      - full lesson object (id, title, description, …)
 * @param {Function}    opts.onPatch     - async (fields) => void — called with changed fields
 * @param {object}      opts.apiClient   - ApiClient instance for content CRUD
 */
export function renderLessonEditorPane(container, { lesson, onPatch, apiClient }) {
  // Destroy previous instances if present
  if (container._metaEditor) {
    container._metaEditor.destroy()
    container._metaEditor = null
  }
  if (container._contentList) {
    container._contentList.destroy()
    container._contentList = null
  }

  if (!lesson) {
    container.innerHTML = META_EDITOR_STYLES + `
      <div class="cm-empty-state cm-editor-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <p>Select a lesson to edit its content.</p>
      </div>
    `
    return { refresh: () => {} }
  }

  container.innerHTML = META_EDITOR_STYLES + `
    <div class="cm-editor-shell">
      <div class="cm-editor-meta-section" id="lme-mount"></div>
      <div id="lcl-mount"></div>
    </div>
  `

  const mountEl = container.querySelector('#lme-mount')
  const metaEditor = createLessonMetaEditor({ lesson, onPatch })
  mountEl.appendChild(metaEditor.element)
  container._metaEditor = metaEditor

  const contentListMount = container.querySelector('#lcl-mount')
  const contentList = createLessonContentList({
    container: contentListMount,
    apiClient,
    lessonId: lesson.id,
    lessonTitle: lesson.title || ''
  })
  container._contentList = contentList

  return { refresh: () => contentList.refresh() }
}
