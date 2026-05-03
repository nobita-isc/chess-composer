# UC-LSN-002: View Lessons List

**Module:** lessons | **Actor:** Admin | **Priority:** P1

## Description
Admin views the ordered list of lessons for a selected course in the middle pane.

## Preconditions
- Admin authenticated
- Course exists (may have zero lessons)

## Main Flow
1. Admin selects course in left pane
2. System GETs `/api/courses/:id/lessons`
3. Middle pane renders lesson list ordered by `order_index`
4. Each row shows lesson title and order position

## Alternate Flows
- 2a. Course has no lessons → middle pane shows empty state "No lessons yet"
- 2b. Course not found → 404 response, error displayed

## Postconditions
- Lesson list reflects current DB state

## Related
- API: `GET /api/courses/:id/lessons`
- UI: `lesson-list-pane.js`
- TCs: TC-LSN-002-01..02
