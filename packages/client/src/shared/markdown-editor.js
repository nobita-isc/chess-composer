/**
 * markdown-editor.js
 * Reusable split-pane markdown editor with toolbar and live preview.
 * Used by admin content editors for writing rich descriptions.
 */

import { safeMarkdown } from './safe-markdown.js'

const TOOLBAR_ITEMS = [
  { label: 'B', title: 'Bold', prefix: '**', suffix: '**' },
  { label: 'I', title: 'Italic', prefix: '_', suffix: '_' },
  { label: 'H2', title: 'Heading 2', prefix: '## ', suffix: '' },
  { label: 'H3', title: 'Heading 3', prefix: '### ', suffix: '' },
  { label: 'UL', title: 'Bullet list', prefix: '- ', suffix: '' },
  { label: 'OL', title: 'Numbered list', prefix: '1. ', suffix: '' },
  { label: 'Link', title: 'Insert link', prefix: '[', suffix: '](url)' },
]

/**
 * Create a split-pane markdown editor.
 * @param {HTMLElement} container - Parent element to mount into
 * @param {object} options
 * @param {string} options.value - Initial markdown text
 * @param {Function} options.onChange - Called with new markdown text on edit
 * @param {string} options.placeholder - Textarea placeholder
 * @param {number} options.height - Editor height in px (default 300)
 * @returns {{ getValue: () => string, setValue: (v: string) => void, destroy: () => void }}
 */
export function createMarkdownEditor(container, options = {}) {
  const { value = '', onChange, placeholder = 'Write markdown...', height = 300 } = options
  let debounceTimer = null

  // Build DOM
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'border:1px solid #d1d5db;border-radius:8px;overflow:hidden;background:#fff'

  // Toolbar
  const toolbar = document.createElement('div')
  toolbar.style.cssText = 'display:flex;gap:2px;padding:6px 8px;background:#f8fafc;border-bottom:1px solid #e2e8f0'

  TOOLBAR_ITEMS.forEach(item => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.title = item.title
    btn.textContent = item.label
    btn.style.cssText = 'padding:4px 8px;border:1px solid #e2e8f0;border-radius:4px;background:#fff;font-size:12px;font-weight:600;cursor:pointer;color:#475569;min-width:28px'
    btn.addEventListener('click', () => insertMarkdown(item.prefix, item.suffix))
    toolbar.appendChild(btn)
  })

  // Split pane
  const pane = document.createElement('div')
  pane.style.cssText = `display:flex;height:${height}px`

  // Textarea
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.placeholder = placeholder
  textarea.style.cssText = 'flex:1;padding:12px;border:none;border-right:1px solid #e2e8f0;font-size:13px;font-family:inherit;resize:none;outline:none;line-height:1.6'

  // Preview
  const preview = document.createElement('div')
  preview.style.cssText = 'flex:1;padding:12px;overflow-y:auto;font-size:13px;color:#374151;line-height:1.6;word-wrap:break-word'
  preview.innerHTML = value ? safeMarkdown(value) : '<span style="color:#94a3b8;font-size:12px">Preview</span>'

  pane.appendChild(textarea)
  pane.appendChild(preview)
  wrapper.appendChild(toolbar)
  wrapper.appendChild(pane)
  container.appendChild(wrapper)

  // Live preview with debounce
  textarea.addEventListener('input', () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      const md = textarea.value
      preview.innerHTML = md.trim() ? safeMarkdown(md) : '<span style="color:#94a3b8;font-size:12px">Preview</span>'
      onChange?.(md)
    }, 200)
  })

  function insertMarkdown(prefix, suffix) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = textarea.value.substring(start, end)
    const before = textarea.value.substring(0, start)
    const after = textarea.value.substring(end)

    textarea.value = before + prefix + selected + suffix + after
    textarea.focus()

    // Place cursor after inserted text
    const cursorPos = start + prefix.length + selected.length + suffix.length
    textarea.setSelectionRange(cursorPos, cursorPos)

    // Trigger preview update
    textarea.dispatchEvent(new Event('input'))
  }

  return {
    getValue: () => textarea.value,
    setValue: (v) => {
      textarea.value = v || ''
      preview.innerHTML = v?.trim() ? safeMarkdown(v) : '<span style="color:#94a3b8;font-size:12px">Preview</span>'
    },
    destroy: () => {
      clearTimeout(debounceTimer)
      wrapper.remove()
    }
  }
}
