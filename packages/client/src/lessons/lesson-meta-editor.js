/**
 * lesson-meta-editor.js
 * Inline title + description editor for a lesson.
 * Pure widget — no direct API calls. Orchestrator supplies onPatch(fields).
 *
 * API: createLessonMetaEditor({ lesson, onPatch }) → { element, update(newLesson), destroy() }
 *
 * Save states: idle | saving | saved | error
 * Behaviour:
 *   - Optimistic local update on every keystroke.
 *   - 500ms debounced onPatch while typing.
 *   - Blur: cancel debounce, flush immediate save if dirty.
 *   - Esc: revert field to last server value.
 */

import { debounce } from './shared/debounce.js'
import { createDescriptionEditor } from './lesson-description-editor.js'

const SAVE_DELAY_MS = 500

/** @param {{ lesson: object, onPatch: (fields: object) => Promise<void> }} opts */
export function createLessonMetaEditor({ lesson, onPatch }) {
  // Server-confirmed values (used for Esc revert)
  let serverTitle = lesson.title || ''
  let serverDesc = lesson.description || ''

  // Dirty tracking
  let titleDirty = false
  let descDirty = false

  // Save state: 'idle' | 'saving' | 'saved' | 'error'
  let saveState = 'idle'

  // --- DOM shell ---
  const el = document.createElement('div')
  el.className = 'lme-root'
  el.innerHTML = `
    <div class="lme-field-row">
      <input
        class="lme-title-input"
        type="text"
        placeholder="Lesson title"
        value=""
        aria-label="Lesson title"
      />
      <span class="lme-badge lme-badge--idle" aria-live="polite"></span>
      <button class="lme-save-btn" title="Save now (auto-saves on blur)" style="display:flex;align-items:center;gap:4px;padding:3px 10px;background:transparent;border:1px solid #e2e8f0;border-radius:7px;font-size:11px;font-weight:500;color:#94a3b8;cursor:default;white-space:nowrap;flex-shrink:0;transition:background .15s,color .15s,border-color .15s" disabled>Save</button>
    </div>
    <div class="lme-desc-mount"></div>
  `

  const titleInput = el.querySelector('.lme-title-input')
  const badge = el.querySelector('.lme-badge')
  const saveBtn = el.querySelector('.lme-save-btn')
  const descMount = el.querySelector('.lme-desc-mount')

  titleInput.value = serverTitle

  // --- Description editor (tab widget) ---
  const descEditor = createDescriptionEditor({
    initialValue: serverDesc,
    onChange: (value) => {
      descDirty = true
      setBadge('idle')
      debouncedPatch({ description: value, ...(titleDirty ? { title: titleInput.value.trim() } : {}) })
    },
    onBlur: (value) => {
      if (!descDirty) return
      debouncedPatch.cancel()
      executePatch({ description: value, ...(titleDirty ? { title: titleInput.value.trim() } : {}) })
    },
  })
  descMount.appendChild(descEditor.element)

  // --- Save button click: cancel debounce + immediate flush ---
  saveBtn.addEventListener('click', () => {
    const fields = collectDirtyFields()
    if (Object.keys(fields).length === 0) return
    debouncedPatch.cancel()
    executePatch(fields)
  })

  // --- Save state badge + button ---
  function setSaveBtn(dirty) {
    const enabled = dirty && saveState !== 'saving'
    saveBtn.disabled = !enabled
    if (enabled) {
      saveBtn.style.color = '#4f46e5'
      saveBtn.style.borderColor = '#c7d2fe'
      saveBtn.style.background = '#eef2ff'
      saveBtn.style.cursor = 'pointer'
    } else {
      saveBtn.style.color = '#94a3b8'
      saveBtn.style.borderColor = '#e2e8f0'
      saveBtn.style.background = 'transparent'
      saveBtn.style.cursor = 'default'
    }
  }

  function setBadge(state, msg = '') {
    saveState = state
    badge.className = `lme-badge lme-badge--${state}`
    const labels = { idle: '', saving: 'Saving…', saved: 'Saved', error: msg || 'Error' }
    badge.textContent = labels[state] ?? ''
    setSaveBtn(titleDirty || descDirty)
  }

  // --- Debounced patch ---
  const debouncedPatch = debounce(async (fields) => {
    await executePatch(fields)
  }, SAVE_DELAY_MS)

  async function executePatch(fields) {
    if (!fields.title && fields.title !== '' && !fields.description && fields.description !== '') return
    setBadge('saving')
    try {
      await onPatch(fields)
      // Confirm server values
      if (fields.title !== undefined) { serverTitle = fields.title; titleDirty = false }
      if (fields.description !== undefined) { serverDesc = fields.description; descDirty = false }
      setBadge('saved')
      setTimeout(() => { if (saveState === 'saved') setBadge('idle') }, 2000)
    } catch (err) {
      setBadge('error', err?.message || 'Save failed')
      // Rollback optimistic display
      if (fields.title !== undefined) titleInput.value = serverTitle
      if (fields.description !== undefined) descEditor.setValue(serverDesc)
    }
  }

  function collectDirtyFields() {
    const fields = {}
    if (titleDirty) fields.title = titleInput.value.trim()
    if (descDirty) fields.description = descEditor.getValue()
    return fields
  }

  // --- Title input handlers ---
  titleInput.addEventListener('input', () => {
    titleDirty = true
    setBadge('idle')
    debouncedPatch({ title: titleInput.value.trim(), ...(descDirty ? { description: descEditor.getValue() } : {}) })
  })

  titleInput.addEventListener('blur', () => {
    if (!titleDirty) return
    debouncedPatch.cancel()
    executePatch(collectDirtyFields())
  })

  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      debouncedPatch.cancel()
      titleInput.value = serverTitle
      titleDirty = false
      setBadge('idle')
    }
  })

  // --- Public API ---

  /** Sync editor fields when orchestrator selects a different lesson */
  function update(newLesson) {
    debouncedPatch.cancel()
    serverTitle = newLesson.title || ''
    serverDesc = newLesson.description || ''
    titleInput.value = serverTitle
    descEditor.setValue(serverDesc)
    titleDirty = false
    descDirty = false
    setBadge('idle')
  }

  function destroy() {
    debouncedPatch.cancel()
    descEditor.destroy()
  }

  return { element: el, update, destroy }
}
