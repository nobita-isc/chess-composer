# UC-LSN-003: Inline Edit Lesson Title

**Module:** lessons | **Actor:** Admin | **Priority:** P1

## Description
Admin edits a lesson title inline in the editor pane; system auto-saves after 500ms debounce and on blur.

## Preconditions
- Admin authenticated
- Lesson selected in middle pane

## Main Flow
1. Admin clicks lesson title field in right pane (lesson-meta-editor)
2. Field becomes editable
3. Admin types new title
4. After 500ms idle, system PUTs `/api/lessons/:id` with new title (debounced auto-save)
5. On blur, system fires immediate save if pending changes exist
6. Success indicator shown briefly

## Alternate Flows
- 4a. Title cleared to empty → save blocked client-side; field shows validation hint
- 4b. Network error on auto-save → error toast, field value retained

## Postconditions
- `lessons.title` updated in DB
- UI reflects new title without full reload

## Related
- API: `PUT /api/lessons/:id`
- UI: `lesson-meta-editor.js`, `lesson-editor-pane.js`
- TCs: TC-LSN-003-01..03
