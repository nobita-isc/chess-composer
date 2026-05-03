# UC-LSN-008: Delete Content Item

**Module:** lessons | **Actor:** Admin | **Priority:** P1

## Description
Admin removes a single content item from a lesson.

## Preconditions
- Admin authenticated
- Content item exists

## Main Flow
1. Admin clicks delete on a content item row
2. System shows confirmation
3. Admin confirms
4. System DELETEs `/api/content/:id`
5. Content item removed from list; remaining items retain order

## Alternate Flows
- 3a. Admin cancels → no change
- 4a. Content not found → 404, error toast

## Postconditions
- `lesson_content` row deleted
- Other content items' `order_index` unaffected (gaps acceptable)

## Related
- API: `DELETE /api/content/:id`
- UI: `lesson-content-list.js`
- TCs: TC-LSN-008-01..02
