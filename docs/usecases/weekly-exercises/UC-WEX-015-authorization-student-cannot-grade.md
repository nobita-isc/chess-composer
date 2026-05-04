# UC-WEX-015: Authorization — Student Cannot Grade, Mark-Final, or Reset-Score

**Module:** weekly-exercises | **Actor:** Student / Unauthenticated | **Priority:** P0

## Description
Grade, mark-final, and reset-score endpoints require admin role; student requests rejected with 403.

## Preconditions
- User authenticated as student

## Main Flow
1. Student sends PUT to `/api/student-exercises/:id/mark-final`
2. `requireRole('admin')` middleware rejects
3. Returns 403 Forbidden
4. DB unchanged

## Alternate Flows
- 1a. PUT to `/api/student-exercises/:id/reset-score` → same 403
- 1b. No auth token → 401

## Postconditions
- DB unchanged
- No score/final-flag modified

## Related
- Middleware: `requireRole('admin')`
- APIs: `PUT /api/student-exercises/:id/mark-final`, `PUT /api/student-exercises/:id/reset-score`
- TCs: TC-WEX-015-01..03
