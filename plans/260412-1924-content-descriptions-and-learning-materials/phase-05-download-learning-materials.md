# Phase 5: Download as Learning Materials

## Context Links
- [lesson-player.js](../../packages/client/src/lessons/lesson-player.js) — wire download button here
- [Phase 4](./phase-04-lesson-player-descriptions.md) — `marked` already imported in player

## Overview
- **Priority**: P2
- **Status**: ✅ complete
- **Description**: Create a download helper that exports content descriptions as styled HTML files. Wire a "Download Notes" button into the lesson player.

## Key Insights
- Zero server-side deps needed — all client-side using Blob + `URL.createObjectURL`
- Styled HTML is the best format: self-contained, looks like browser view, student can print to PDF natively
- Offer secondary `.md` download for tech-savvy users
- `marked` is already available from Phase 2/4
- "Download All Lesson Notes" combines all descriptions in current lesson — simple concatenation with section dividers

## Requirements

### Functional
- Single item download: styled HTML file with rendered description + title + metadata
- Markdown download: raw `.md` file as alternative
- "Download All Notes" button: combines all content descriptions in current lesson into one HTML file
- Download filenames: `{content-title}-notes.html` / `{course-title}-all-notes.html`

### Non-functional
- No server round-trips for download
- HTML file is self-contained (embedded CSS, no external dependencies)
- Print-friendly: includes `@media print` styles
- File under 200 lines

## Related Code Files

### Create
1. **`packages/client/src/shared/content-download-helper.js`**

### Modify
1. **`packages/client/src/lessons/lesson-player.js`** — add download buttons

## Architecture

```
content-download-helper.js
  ├── downloadAsStyledHtml(title, markdownContent, metadata?)
  │     └── marked.parse() → wrap in HTML template → Blob → <a download> click
  ├── downloadAsMarkdown(title, markdownContent)
  │     └── Blob('text/markdown') → <a download> click
  └── downloadAllNotes(courseTitle, items[])
        └── Concatenate all descriptions → downloadAsStyledHtml
```

## Implementation Steps

### A. Create content-download-helper.js

1. Create `packages/client/src/shared/content-download-helper.js`:

   ```javascript
   import { marked } from 'marked'

   /**
    * Download markdown content as a styled, self-contained HTML file.
    * @param {string} title - Document title
    * @param {string} markdown - Markdown content
    * @param {object} metadata - Optional { courseName, contentType, date }
    */
   export function downloadAsStyledHtml(title, markdown, metadata = {}) {
     const renderedBody = marked.parse(markdown, { breaks: true })
     const html = buildHtmlTemplate(title, renderedBody, metadata)
     triggerDownload(html, `${sanitizeFilename(title)}-notes.html`, 'text/html')
   }

   /**
    * Download raw markdown content as a .md file.
    */
   export function downloadAsMarkdown(title, markdown) {
     const content = `# ${title}\n\n${markdown}`
     triggerDownload(content, `${sanitizeFilename(title)}-notes.md`, 'text/markdown')
   }

   /**
    * Download all content descriptions from a lesson as one styled HTML.
    * @param {string} courseTitle
    * @param {Array} items - [{ title, description, content_type }]
    */
   export function downloadAllNotes(courseTitle, items) {
     const itemsWithDesc = items.filter(i => i.description?.trim())
     if (itemsWithDesc.length === 0) return false

     const combinedMd = itemsWithDesc
       .map(item => `## ${item.title}\n\n${item.description}`)
       .join('\n\n---\n\n')

     downloadAsStyledHtml(courseTitle, combinedMd, { courseName: courseTitle })
     return true
   }
   ```

2. `buildHtmlTemplate(title, bodyHtml, metadata)` — returns complete HTML string:
   - `<!DOCTYPE html>` with utf-8 charset
   - Embedded CSS: clean typography (system fonts), max-width 720px, centered
   - Header with title, optional course name, date
   - Body with rendered content
   - `@media print` styles: hide download link, adjust margins
   - Footer: "Generated from Chess Composer"

3. `triggerDownload(content, filename, mimeType)`:
   ```javascript
   function triggerDownload(content, filename, mimeType) {
     const blob = new Blob([content], { type: mimeType })
     const url = URL.createObjectURL(blob)
     const a = document.createElement('a')
     a.href = url
     a.download = filename
     document.body.appendChild(a)
     a.click()
     document.body.removeChild(a)
     URL.revokeObjectURL(url)
   }
   ```

4. `sanitizeFilename(str)` — strip special chars, lowercase, replace spaces with hyphens

### B. Wire into Lesson Player (lesson-player.js)

5. Import helpers:
   ```javascript
   import { downloadAsStyledHtml, downloadAllNotes } from '../shared/content-download-helper.js'
   ```

6. Add "Download Notes" button in the bottom bar of the lesson player, next to the XP badge (only if current item has a description):
   ```javascript
   ${current.description ? `<button id="lp-download" style="padding:6px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#64748b;cursor:pointer;display:flex;align-items:center;gap:4px">
     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
     Download Notes
   </button>` : ''}
   ```

7. Wire click handler in `render()` events section:
   ```javascript
   const dlBtn = overlay.querySelector('#lp-download')
   if (dlBtn) {
     dlBtn.addEventListener('click', () => {
       downloadAsStyledHtml(current.title, current.description, {
         courseName: course.title,
         contentType: current.content_type
       })
     })
   }
   ```

8. Add "Download All Notes" button in the sidebar header (below progress bar):
   ```javascript
   const hasAnyDescriptions = allItems.some(i => i.description?.trim())
   // render button if hasAnyDescriptions
   ```

9. Wire "Download All Notes":
   ```javascript
   const dlAllBtn = overlay.querySelector('#lp-download-all')
   if (dlAllBtn) {
     dlAllBtn.addEventListener('click', () => {
       downloadAllNotes(course.title, allItems)
     })
   }
   ```

## Todo
- [x] Create `content-download-helper.js` with 3 export functions
- [x] Implement buildHtmlTemplate with embedded CSS + print styles
- [x] Implement triggerDownload Blob mechanism
- [x] Import helpers in lesson-player.js
- [x] Add "Download Notes" button for individual items
- [x] Add "Download All Notes" button in sidebar
- [x] Wire click handlers
- [x] Verify: download produces valid, styled HTML file
- [x] Verify: print from downloaded HTML looks clean

## Success Criteria
- Click "Download Notes" → browser downloads `{title}-notes.html`
- Opening downloaded file in browser shows styled, readable content
- Printing the HTML file produces clean, print-friendly output
- "Download All Notes" combines all descriptions into one file
- Items without descriptions don't show download button
- `content-download-helper.js` under 200 lines

## Risk Assessment
- **Risk**: Blob URL not revoked → Mitigation: `URL.revokeObjectURL` immediately after click
- **Risk**: Filename has special characters → Mitigation: `sanitizeFilename()` strips non-alphanumeric
- **Risk**: Large combined download with many items → Low risk; text-only content, trivial size
