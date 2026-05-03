# UC-LSN-005: Delete Lesson

**Module:** lessons | **Actor:** Admin | **Priority:** P1

## Description
Admin deletes a lesson; system cascades deletion to all associated content items.

## Preconditions
- Admin authenticated
- Lesson exists with or without content

## Main Flow
1. Admin selects lesson in middle pane
2. Admin clicks delete icon / "Delete Lesson" button
3. System shows confirmation dialog
4. Admin confirms
5. System DELETEs `/api/lessons/:id`
6. Lesson removed from list; right pane clears; selection reset

## Alternate Flows
- 4a. Admin cancels dialog → no change
- 5a. Lesson not found → 404, error toast

## Postconditions
- Lesson row removed from `lessons` table
- All `lesson_content` rows for lesson removed (cascade)
- URL hash / localStorage selection cleared

## Related
- API: `DELETE /api/lessons/:id`
- UI: `lesson-list-pane.js`, `lesson-editor-pane.js`
- TCs: TC-LSN-005-01..03
