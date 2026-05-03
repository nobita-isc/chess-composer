# UC-LSN-004: Inline Edit Lesson Description

**Module:** lessons | **Actor:** Admin | **Priority:** P1

## Description
Admin edits lesson description inline; auto-saves on 500ms debounce; Escape reverts to last saved value.

## Preconditions
- Admin authenticated
- Lesson selected

## Main Flow
1. Admin clicks description textarea in right pane
2. Admin edits text
3. System auto-saves after 500ms debounce (PUT `/api/lessons/:id`)
4. On blur → immediate save
5. Success indicator shown

## Alternate Flows
- 3a. Admin presses Escape → field reverts to last persisted value, no save fired
- 3b. Description > 10,000 chars → server returns 400, UI shows error

## Postconditions
- `lessons.description` updated (or reverted on Escape)

## Related
- API: `PUT /api/lessons/:id`
- UI: `lesson-meta-editor.js`
- TCs: TC-LSN-004-01..03
