# Phase 2: Markdown Editor Component

## Context Links
- [app-dialogs.js](../../packages/client/src/shared/app-dialogs.js) — existing dialog pattern reference
- [interactive-puzzle-board.js](../../packages/client/src/shared/interactive-puzzle-board.js) — shared component pattern reference
- [client package.json](../../packages/client/package.json) — add `marked` here

## Overview
- **Priority**: P1 (blocking phases 3-5)
- **Status**: ✅ complete
- **Description**: Install `marked` and create a reusable split-pane markdown editor with textarea + live preview.

## Key Insights
- Codebase is vanilla JS (no React/Vue) — component is a factory function returning DOM elements
- `marked` is ESM-compatible, <5KB gzipped, actively maintained
- Coaches write chess opening descriptions — toolbar needs bold, italic, headers, lists, links
- Keep under 200 lines per file size rules
- Follow existing pattern: export a function that takes container + options, returns control API

## Requirements

### Functional
- Split-pane: left textarea, right live preview
- Toolbar buttons: Bold, Italic, H2, H3, Bullet list, Numbered list, Link
- Toolbar inserts markdown syntax at cursor position
- Live preview updates on input (debounced 200ms)
- Accepts initial value, reports changes via `onChange` callback
- `getValue()` method to read current markdown text

### Non-functional
- Bundle impact: `marked` only (~5KB gz)
- No external CSS files — inline styles matching existing codebase pattern
- Accessible: textarea has placeholder, toolbar buttons have title attributes

## Related Code Files

### Create
1. **`packages/client/src/shared/markdown-editor.js`** — reusable markdown editor component

### Modify
1. **`packages/client/package.json`** — add `marked` dependency

## Architecture

```
createMarkdownEditor(container, { value, onChange, placeholder })
  ├── toolbar div (bold, italic, h2, h3, ul, ol, link buttons)
  ├── split-pane div
  │   ├── textarea (left, 50%)
  │   └── preview div (right, 50%, rendered HTML)
  └── returns { getValue, setValue, destroy }
```

## Implementation Steps

1. Install marked:
   ```bash
   cd packages/client && npm install marked
   ```

2. Create `packages/client/src/shared/markdown-editor.js`:

   **Exports:**
   ```javascript
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
   export function createMarkdownEditor(container, options = {})
   ```

   **Key implementation details:**
   - Import `marked` from 'marked'. Configure: `marked.setOptions({ breaks: true })`
   - Toolbar: row of small buttons, each calls `insertMarkdown(prefix, suffix)` helper
   - `insertMarkdown()`: gets textarea selection, wraps selected text or inserts at cursor
   - Preview update: `textarea.addEventListener('input', debounce(updatePreview, 200))`
   - `updatePreview()`: set preview div's `innerHTML = marked.parse(textarea.value)`
   - Sanitize output: since only admin writes content, basic escaping is acceptable. Use marked's built-in sanitization. Wrap preview in a container with `word-wrap: break-word`.
   - Inline styles consistent with codebase (no external CSS)

   **Toolbar buttons config array:**
   ```javascript
   const toolbarItems = [
     { label: 'B', title: 'Bold', prefix: '**', suffix: '**' },
     { label: 'I', title: 'Italic', prefix: '_', suffix: '_' },
     { label: 'H2', title: 'Heading 2', prefix: '## ', suffix: '' },
     { label: 'H3', title: 'Heading 3', prefix: '### ', suffix: '' },
     { label: 'UL', title: 'Bullet list', prefix: '- ', suffix: '' },
     { label: 'OL', title: 'Numbered list', prefix: '1. ', suffix: '' },
     { label: 'Link', title: 'Insert link', prefix: '[', suffix: '](url)' },
   ]
   ```

3. Run `npm run build` to verify import resolves and tree-shakes correctly

## Todo
- [x] `npm install marked` in packages/client
- [x] Create `markdown-editor.js` with createMarkdownEditor export
- [x] Implement toolbar with insert-at-cursor logic
- [x] Implement debounced live preview
- [x] Implement getValue/setValue/destroy API
- [x] Verify build succeeds
- [x] Manual test: type markdown, verify preview renders correctly

## Success Criteria
- `import { createMarkdownEditor } from '../shared/markdown-editor.js'` works
- Typing `**bold**` in textarea shows **bold** in preview within 200ms
- Toolbar Bold button wraps selected text in `**`
- `getValue()` returns current markdown string
- File is under 200 lines

## Risk Assessment
- **Risk**: `marked` XSS in preview → Low risk since only admin sees the editor. Mitigation: wrap preview in sandboxed container, no script execution.
- **Risk**: Cursor position lost after toolbar insert → Mitigation: save/restore `selectionStart`/`selectionEnd`
