# UC-LSN-009: Selection Persistence

**Module:** lessons | **Actor:** Admin | **Priority:** P2

## Description
Selected course and lesson are persisted via URL hash and localStorage so reloading restores the same view.

## Preconditions
- Admin authenticated
- Course and lesson previously selected

## Main Flow
1. Admin selects course → URL hash updated with course ID
2. Admin selects lesson → URL hash updated with lesson ID; localStorage entry written
3. Admin reloads page
4. App reads URL hash / localStorage on mount
5. Course auto-selected in left pane; lesson auto-selected in middle pane; right pane restored

## Alternate Flows
- 4a. Stored course/lesson no longer exists → graceful reset to empty state, stale keys cleared
- 4b. URL hash present but localStorage absent (different browser tab) → hash takes precedence

## Postconditions
- UI state matches persisted selection on reload

## Related
- UI: `CourseManagementPage.js`, `lesson-list-pane.js`
- TCs: TC-LSN-009-01..02
