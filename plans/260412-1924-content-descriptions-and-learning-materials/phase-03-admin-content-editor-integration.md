# Phase 3: Admin Content Editor — Add Description Editing

## Context Links
- [lesson-content-editor.js](../../packages/client/src/lessons/lesson-content-editor.js) (326 lines)
- [puzzle-composer.js](../../packages/client/src/lessons/puzzle-composer.js) (558 lines)
- [Phase 2: Markdown Editor](./phase-02-markdown-editor-component.md)

## Overview
- **Priority**: P2
- **Status**: ✅ complete
- **Description**: Integrate the markdown editor into admin content workflows so coaches can add/edit rich descriptions for video, PDF, and puzzle content items.

## Key Insights
- `lesson-content-editor.js` is 326 lines — close to budget. New dialog code may push it over. Consider extracting the upload dialog into a separate file if needed.
- Current `editContent()` (line 181) only opens `showAppPrompt` for title. Must replace with a richer dialog that includes both title and description editing.
- `showUploadContentDialog()` (line 206) already has a form layout — add description textarea below title input.
- `puzzle-composer.js` (558 lines, over 200-line target) already has `puzzle_instruction` field. Add a separate `description` textarea below instruction for long-form content. File is already large; do NOT add significant code — keep it minimal.
- `renderItem()` in the content list should show a truncated description preview.

## Requirements

### Functional
- **Upload dialog (video/PDF)**: Add markdown editor below title field for writing description at creation time
- **Edit dialog (video/PDF)**: Replace simple title prompt with a modal that has title input + markdown editor for description
- **Puzzle composer**: Add a `description` textarea in the right-side form panel (below instruction, above video URL)
- **Content list**: Show first ~80 chars of description as preview text in `renderItem()`

### Non-functional
- `lesson-content-editor.js` must stay under or near 400 lines. If it exceeds, extract the edit dialog into `lesson-content-edit-dialog.js`.
- Immutable state patterns throughout

## Related Code Files

### Modify
1. **`packages/client/src/lessons/lesson-content-editor.js`**
   - `showUploadContentDialog()`: add markdown editor, include `description` in resolved data
   - `editContent()`: open a proper edit dialog with title + markdown editor
   - `renderItem()`: show truncated description preview
2. **`packages/client/src/lessons/puzzle-composer.js`**
   - `buildComposerHTML()`: add description textarea field
   - `saveCurrentFormState()`: capture description value
   - `populateForm()`: populate description field
   - `wireSaveEvents()` → save handler: include `description` in save payload

### Potentially Create
- **`packages/client/src/lessons/lesson-content-edit-dialog.js`** — only if lesson-content-editor.js exceeds ~400 lines after changes

## Implementation Steps

### A. Upload Dialog — Add Description (lesson-content-editor.js)

1. Import `createMarkdownEditor` from `'../shared/markdown-editor.js'`

2. In `showUploadContentDialog()`, after the title input field (line ~250), add:
   ```html
   <div>
     <label style="${labelStyle}">Description (Markdown)</label>
     <div id="uc-description-editor"></div>
   </div>
   ```

3. After `renderDialog()` populates the DOM, initialize the markdown editor:
   ```javascript
   let descriptionEditor = null
   // Inside renderDialog(), after DOM is built:
   const editorContainer = dlg.querySelector('#uc-description-editor')
   if (editorContainer) {
     descriptionEditor = createMarkdownEditor(editorContainer, {
       placeholder: 'Describe this content for students...',
       height: 200
     })
   }
   ```

4. In the submit handler (line ~287), add `description` to the resolved data:
   ```javascript
   const description = descriptionEditor?.getValue() || ''
   resolve({ content_type: ..., title, description, ... })
   ```

### B. Edit Dialog — Richer Edit (lesson-content-editor.js)

5. Replace `editContent()` implementation for non-puzzle types. Instead of `showAppPrompt`, create a full edit dialog:
   ```javascript
   async function editContent(contentId, item) {
     if (!item) return
     if (item.content_type === 'puzzle') {
       openPuzzleComposer({ ... })
       return
     }
     const result = await showEditContentDialog(item)
     if (result) {
       await apiClient.updateContent(contentId, result)
       render()
     }
   }
   ```

6. Create `showEditContentDialog(item)` function that returns a Promise resolving to `{ title, description }` or null:
   - Modal with title input (pre-filled)
   - Markdown editor (pre-filled with `item.description || ''`)
   - Save / Cancel buttons
   - Pattern: follow `showUploadContentDialog` structure

   If this pushes the file over ~400 lines, extract to `lesson-content-edit-dialog.js`.

### C. Content List — Description Preview (lesson-content-editor.js)

7. In `renderItem()`, after the detail line (line ~128), add a description preview:
   ```javascript
   const descPreview = item.description
     ? item.description.replace(/[#*_\[\]()]/g, '').substring(0, 80) + (item.description.length > 80 ? '...' : '')
     : ''
   ```
   Render it as a light-gray line below the detail.

### D. Puzzle Composer — Add Description (puzzle-composer.js)

8. In `buildComposerHTML()`, add a description textarea after the Instruction textarea (line ~503):
   ```html
   <div>
     <label style="${labelStyle}">Description (for students)</label>
     <textarea id="pc-description" rows="3"
       placeholder="Detailed explanation about this chess concept..."
       style="${inputStyle};resize:vertical"></textarea>
   </div>
   ```

9. Update `createBlankPuzzle()` — add `description: ''` to default object

10. Update `contentToPuzzleData()` — add `description: content.description || ''`

11. Update `saveCurrentFormState()` — capture `description` from `#pc-description`

12. Update `populateForm()` — set `#pc-description` value

13. Update save handler (line ~244) — include `description` in the data object sent to API:
    ```javascript
    const data = {
      ...existing fields,
      description: puzzles[0].description || null
    }
    ```

## Todo
- [x] Import createMarkdownEditor in lesson-content-editor.js
- [x] Add markdown editor to showUploadContentDialog
- [x] Include description in upload submit payload
- [x] Create showEditContentDialog for title + description editing
- [x] Replace editContent() to use new dialog
- [x] Add description preview in renderItem()
- [x] Add description textarea to puzzle composer buildComposerHTML
- [x] Update puzzle state management (create/populate/save)
- [x] Check file sizes — extract dialog if needed
- [x] Run build, verify no errors

## Success Criteria
- Coach uploads video with description -> description stored in DB
- Coach edits PDF content -> can modify both title and description
- Content list shows truncated description preview
- Puzzle composer includes description field, saves to API
- All files under 400 lines (ideally under 200 for new files)

## Risk Assessment
- **Risk**: lesson-content-editor.js exceeds 400 lines → Mitigation: extract edit dialog into separate file
- **Risk**: Markdown editor height makes upload dialog too tall → Mitigation: use `height: 200` and scrollable container
- **Risk**: puzzle-composer.js already 558 lines → Only adding ~15 lines for a textarea. No extraction needed for this phase.

## Security Considerations
- Description input from admin is stored as-is (raw markdown). Sanitization at render time only (Phase 4).
