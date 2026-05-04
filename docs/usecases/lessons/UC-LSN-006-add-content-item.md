# UC-LSN-006: Add Content Item

**Module:** lessons | **Actor:** Admin | **Priority:** P0

## Description
Admin adds a content item (video, pdf, quiz, or puzzle) to a selected lesson.

## Preconditions
- Admin authenticated
- Lesson selected in middle pane

## Main Flow
1. Admin clicks "+ Add Content" in right pane content list
2. Admin selects content type (video / pdf / quiz / puzzle)
3. Admin enters title
4. System POSTs `/api/lessons/:id/content` with `content_type` and `title`
5. New content item appears in content list; inline editor shown for that type

## Alternate Flows
- 3a. Title empty → 400 "title required"
- 2a. Invalid content_type → 400 "content_type must be: video, pdf, puzzle, quiz"
- 4a. Network error → error toast, item not added

## Postconditions
- `lesson_content` row created with correct `lesson_id`, `content_type`, `order_index`

## Related
- API: `POST /api/lessons/:id/content`
- UI: `lesson-content-list.js`, content-item-{video,pdf,quiz,puzzle}.js
- TCs: TC-LSN-006-01..03
