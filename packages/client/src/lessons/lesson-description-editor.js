/**
 * lesson-description-editor.js
 * Edit/Preview tab widget for markdown description field.
 * Used by lesson-meta-editor.js.
 *
 * API: createDescriptionEditor({ initialValue, onChange, onBlur }) →
 *      { element, getValue(), setValue(v), destroy() }
 */

import { safeMarkdown } from '../shared/safe-markdown.js'

// Inject tab styles once per page load
let _stylesInjected = false
function _injectStyles() {
  if (_stylesInjected || typeof document === 'undefined') return
  _stylesInjected = true
  const s = document.createElement('style')
  s.textContent = `
    .lme-desc-wrap { margin-top: 4px }
    .lme-tabs { display:flex; align-items:center; gap:4px; margin-bottom:6px }
    .lme-tab {
      padding:2px 10px; border:1px solid #e2e8f0; border-radius:6px;
      background:transparent; font-size:11px; font-weight:500;
      color:#94a3b8; cursor:pointer; transition:background .12s,color .12s,border-color .12s
    }
    .lme-tab--active {
      background:#eef2ff; color:#4f46e5; border-color:#c7d2fe; font-weight:600
    }
    .lme-md-hint { font-size:11px; color:#cbd5e1; margin-left:4px }
    .lme-tab-edit textarea.lme-desc-textarea {
      width:100%; box-sizing:border-box; resize:none; overflow:hidden;
      font-family:ui-monospace,monospace; font-size:13px; line-height:1.6;
      padding:8px 10px; border:1px solid #e2e8f0; border-radius:8px;
      color:#1e293b; background:#fff; outline:none; min-height:60px;
      transition:border-color .15s
    }
    .lme-tab-edit textarea.lme-desc-textarea:focus { border-color:#a5b4fc }
    .lme-tab-preview { min-height:60px }
    .lme-preview-body {
      padding:8px 10px; border:1px solid #e2e8f0; border-radius:8px;
      min-height:60px; font-size:13px; color:#374151; line-height:1.7;
      background:#f8fafc
    }
    .lme-preview-body p { margin:6px 0 }
    .lme-preview-body ul,.lme-preview-body ol { padding-left:20px; margin:6px 0 }
    .lme-preview-body li { margin:2px 0 }
    .lme-preview-body a { color:#4f46e5; text-decoration:underline }
    .lme-preview-body strong { font-weight:600 }
    .lme-preview-body code { background:#f1f5f9; padding:1px 5px; border-radius:4px; font-size:12px }
    .lme-preview-body h1,.lme-preview-body h2,.lme-preview-body h3 { font-weight:700; color:#1e293b; margin:10px 0 4px }
  `
  document.head.appendChild(s)
}

/**
 * @param {{ initialValue: string, onChange: (v: string) => void, onBlur: (v: string) => void }} opts
 */
export function createDescriptionEditor({ initialValue = '', onChange, onBlur }) {
  _injectStyles()
  let currentTab = 'edit'

  const wrap = document.createElement('div')
  wrap.className = 'lme-desc-wrap'
  wrap.innerHTML = `
    <div class="lme-tabs">
      <button class="lme-tab lme-tab--active" data-tab="edit">Edit</button>
      <button class="lme-tab" data-tab="preview">Preview</button>
      <span class="lme-md-hint">Markdown supported — bold, lists, links</span>
    </div>
    <div class="lme-tab-edit">
      <textarea
        class="lme-desc-textarea"
        placeholder="Add a short description…"
        rows="1"
        aria-label="Lesson description"
      ></textarea>
    </div>
    <div class="lme-tab-preview" hidden>
      <div class="lme-preview-body"></div>
    </div>
  `

  const tabBtns = wrap.querySelectorAll('.lme-tab')
  const editPane = wrap.querySelector('.lme-tab-edit')
  const previewPane = wrap.querySelector('.lme-tab-preview')
  const textarea = wrap.querySelector('.lme-desc-textarea')
  const previewBody = wrap.querySelector('.lme-preview-body')

  textarea.value = initialValue
  _autoGrow()

  // --- Tab switching ---
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab
      tabBtns.forEach(b => b.classList.toggle('lme-tab--active', b.dataset.tab === currentTab))
      if (currentTab === 'preview') {
        editPane.hidden = true
        previewPane.hidden = false
        const html = safeMarkdown(textarea.value)
        previewBody.innerHTML = html || '<em style="color:#94a3b8;font-size:13px">Nothing to preview yet.</em>'
        // Open links in new tab
        previewBody.querySelectorAll('a').forEach(a => {
          a.setAttribute('target', '_blank')
          a.setAttribute('rel', 'noopener noreferrer')
        })
      } else {
        previewPane.hidden = true
        editPane.hidden = false
        textarea.focus()
      }
    })
  })

  // --- Textarea events (only fire when in edit tab) ---
  textarea.addEventListener('input', () => {
    _autoGrow()
    onChange?.(textarea.value)
  })

  textarea.addEventListener('blur', () => {
    onBlur?.(textarea.value)
  })

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Let parent handle Escape (blur will fire)
      textarea.blur()
    }
  })

  function _autoGrow() {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }

  // --- Public API ---
  function getValue() {
    return textarea.value
  }

  function setValue(v) {
    textarea.value = v || ''
    // If currently on preview tab, refresh it
    if (currentTab === 'preview') {
      const html = safeMarkdown(textarea.value)
      previewBody.innerHTML = html || '<em style="color:#94a3b8;font-size:13px">Nothing to preview yet.</em>'
    }
    requestAnimationFrame(_autoGrow)
  }

  function destroy() {
    // No timers or observers to clean up
  }

  return { element: wrap, getValue, setValue, destroy }
}
