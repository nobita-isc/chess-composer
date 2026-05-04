# UC-LSN-001: Create Lesson

**Module:** lessons | **Actor:** Admin | **Priority:** P0

## Description
Admin adds a new lesson to an existing course via the 3-pane Course Management workspace.

## Preconditions
- Admin authenticated
- Target course exists

## Main Flow
1. Admin navigates to Course Management, selects course in left pane
2. Admin clicks "+ Add Lesson" in middle (lesson-list) pane
3. System prompts for lesson title (showAppPrompt dialog)
4. Admin enters title, confirms
5. System POSTs `/api/courses/:id/lessons`, refreshes lesson list
6. New lesson auto-selected; right pane shows empty editor

## Alternate Flows
- 4a. Title empty or whitespace → 400 "Title is required", lesson not created
- 5a. Network error → error toast, lesson list unchanged

## Postconditions
- `lessons` row exists with correct `course_id`, `order_index` = max+1
- Lesson visible on page reload

## Related
- API: `POST /api/courses/:id/lessons`
- UI: `lesson-list-pane.js`, `CourseManagementPage.js`
- TCs: TC-LSN-001-01..03
