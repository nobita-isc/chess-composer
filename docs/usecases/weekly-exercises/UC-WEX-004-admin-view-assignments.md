# UC-WEX-004: Admin Views Student Assignments

**Module:** weekly-exercises | **Actor:** Admin | **Priority:** P1

## Description
Admin views all student assignments for a specific exercise, including attempt/grade status.

## Preconditions
- Admin authenticated
- Exercise exists

## Main Flow
1. Admin selects exercise in admin UI
2. System GETs `/api/exercises/:id/assignments`
3. Returns array of `student_exercise` records with student info, scores, final flag

## Alternate Flows
- 2a. No assignments yet → empty array returned
- 2b. Exercise not found → 404 (or empty — depends on repo implementation)

## Postconditions
- Read-only

## Related
- API: `GET /api/exercises/:id/assignments`
- TCs: TC-WEX-004-01..02
