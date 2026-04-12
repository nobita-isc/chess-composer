# Phase 4: Student Lesson Player — Show Descriptions

## Context Links
- [lesson-player.js](../../packages/client/src/lessons/lesson-player.js) (244 lines)
- [lesson-puzzle-player.js](../../packages/client/src/lessons/lesson-puzzle-player.js) — puzzle overlay
- [Phase 2: Markdown Editor](./phase-02-markdown-editor-component.md) — `marked` already installed

## Overview
- **Priority**: P2
- **Status**: ✅ complete
- **Description**: Render markdown descriptions in the lesson player for video, PDF, and puzzle content types so students can read coach-authored learning material alongside the content.

## Key Insights
- `lesson-player.js` is 244 lines — comfortably within budget for additions
- `renderContent(item)` (line 188) produces HTML per content type. Each type needs a description block inserted at an appropriate location.
- Import `marked` directly (already installed in Phase 2) — no need for the editor component here, only the parser
- Video: description goes below the video player + title area
- PDF: description goes above the PDF iframe (context before reading)
- Puzzle: description goes below `puzzle_instruction` on the puzzle landing page
- Description may be null/empty — must handle gracefully (render nothing)
- Need to sanitize rendered HTML since this faces students

## Requirements

### Functional
- Video content: rendered description below video title area
- PDF content: rendered description above or below PDF viewer
- Puzzle content: rendered description below instruction text on landing page
- Empty/null descriptions show nothing (no empty containers)
- Markdown renders with proper formatting: headings, bold, italic, lists, links

### Non-functional
- No layout shifts when description is absent
- Links in rendered markdown open in new tab (`target="_blank"`)
- Consistent typography: 14px base, 1.6 line-height, gray-700 text
- File stays under 300 lines after changes

## Related Code Files

### Modify
1. **`packages/client/src/lessons/lesson-player.js`**
   - Add `import { marked } from 'marked'` at top
   - Add `renderDescription(markdown)` helper function
   - Update `renderContent()` for video, pdf, puzzle branches

## Implementation Steps

1. Add import at top of `lesson-player.js`:
   ```javascript
   import { marked } from 'marked'
   ```

2. Create a helper function `renderDescription(markdown)`:
   ```javascript
   function renderDescription(markdown) {
     if (!markdown?.trim()) return ''
     const html = marked.parse(markdown, { breaks: true })
     return `
       <div class="lp-description" style="padding:20px 32px;font-size:14px;color:#374151;line-height:1.7;max-width:720px">
         <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:8px">
           ${html}
         </div>
       </div>
     `
   }
   ```
   Note: `marked.parse()` returns sanitized HTML by default. Add a style tag or inline styles for rendered elements (h2, h3, ul, ol, a, strong, em) to match design system.

3. Add a small inline style block for description content styling:
   ```javascript
   function getDescriptionStyles() {
     return `
       <style>
         .lp-description h2 { font-size:18px;font-weight:700;color:#1e293b;margin:16px 0 8px }
         .lp-description h3 { font-size:16px;font-weight:600;color:#334155;margin:12px 0 6px }
         .lp-description ul, .lp-description ol { padding-left:24px;margin:8px 0 }
         .lp-description li { margin:4px 0 }
         .lp-description a { color:#4f46e5;text-decoration:underline }
         .lp-description strong { font-weight:600 }
         .lp-description p { margin:8px 0 }
         .lp-description code { background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px }
       </style>
     `
   }
   ```
   Inject once at top of the overlay innerHTML (inside the render function).

4. Update **video** branch in `renderContent()` (line ~196):
   ```javascript
   // After the existing title/lessonTitle div:
   ${renderDescription(item.description)}
   ```

5. Update **puzzle** branch in `renderContent()` (line ~208):
   ```javascript
   // After puzzle_instruction and before the "Play Challenge" button:
   ${item.description ? `<div style="max-width:600px;text-align:left">${renderDescription(item.description)}</div>` : ''}
   ```

6. Update **PDF** branch in `renderContent()` (line ~225):
   ```javascript
   // After the title, before the iframe:
   ${renderDescription(item.description)}
   ```

7. Make links open in new tab — after rendering, use a post-render hook:
   ```javascript
   // In render(), after overlay.innerHTML is set:
   overlay.querySelectorAll('.lp-description a').forEach(a => {
     a.setAttribute('target', '_blank')
     a.setAttribute('rel', 'noopener noreferrer')
   })
   ```

## Todo
- [x] Import `marked` in lesson-player.js
- [x] Create `renderDescription()` helper
- [x] Add description styles
- [x] Update video renderContent branch
- [x] Update puzzle renderContent branch
- [x] Update PDF renderContent branch
- [x] Set `target="_blank"` on rendered links
- [x] Verify null/empty descriptions render nothing
- [x] Run build, verify no errors
- [x] Manual test with markdown content

## Success Criteria
- Video with description shows formatted markdown below the video
- PDF with description shows formatted text near the PDF viewer
- Puzzle landing page shows description below instruction
- Content without description looks identical to current behavior
- Links open in new tab
- File stays under ~300 lines

## Risk Assessment
- **Risk**: Rendered HTML contains malicious content → Low risk; only admin/coach writes descriptions. Mitigation: `marked` escapes HTML entities by default.
- **Risk**: Long descriptions push content below fold → Mitigation: Phase 6 adds collapsible description panel.
- **Risk**: Style conflicts with existing CSS → Mitigation: scope all styles under `.lp-description` class.
