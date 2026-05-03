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

  // --- DOM ---
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
    </div>
    <textarea
      class="lme-desc-textarea"
      placeholder="Description (optional)"
      rows="3"
      aria-label="Lesson description"
    ></textarea>
  `

  const titleInput = el.querySelector('.lme-title-input')
  const descTextarea = el.querySelector('.lme-desc-textarea')
  const badge = el.querySelector('.lme-badge')

  // Populate initial values
  titleInput.value = serverTitle
  descTextarea.value = serverDesc

  // --- Save state badge ---
  function setBadge(state, msg = '') {
    saveState = state
    badge.className = `lme-badge lme-badge--${state}`
    const labels = { idle: '', saving: 'Saving…', saved: 'Saved', error: msg || 'Error' }
    badge.textContent = labels[state] ?? ''
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
      if (fields.description !== undefined) descTextarea.value = serverDesc
    }
  }

  function collectDirtyFields() {
    const fields = {}
    if (titleDirty) fields.title = titleInput.value.trim()
    if (descDirty) fields.description = descTextarea.value
    return fields
  }

  // --- Title input handlers ---
  titleInput.addEventListener('input', () => {
    titleDirty = true
    setBadge('idle')
    debouncedPatch({ title: titleInput.value.trim(), ...(descDirty ? { description: descTextarea.value } : {}) })
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

  // --- Description textarea handlers ---
  descTextarea.addEventListener('input', () => {
    descDirty = true
    setBadge('idle')
    debouncedPatch({ description: descTextarea.value, ...(titleDirty ? { title: titleInput.value.trim() } : {}) })
  })

  descTextarea.addEventListener('blur', () => {
    if (!descDirty) return
    debouncedPatch.cancel()
    executePatch(collectDirtyFields())
  })

  descTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      debouncedPatch.cancel()
      descTextarea.value = serverDesc
      descDirty = false
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
    descTextarea.value = serverDesc
    titleDirty = false
    descDirty = false
    setBadge('idle')
  }

  function destroy() {
    debouncedPatch.cancel()
  }

  return { element: el, update, destroy }
}
