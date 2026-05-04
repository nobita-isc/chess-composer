# UC-WEX-007: Admin Resets Student Score

**Module:** weekly-exercises | **Actor:** Admin | **Priority:** P1

## Description
Admin resets a student's score (and final flag) to allow reattempt or re-grading.

## Preconditions
- Admin authenticated
- `student_exercise` record exists

## Main Flow
1. Admin clicks "Reset Score" for a student assignment
2. System PUTs `/api/student-exercises/:id/reset-score`
3. Service clears score and `is_final` flag
4. Returns 200 with updated data

## Alternate Flows
- 2a. Assignment not found → 400 from service
- 2b. Non-admin → 403

## Postconditions
- `student_exercises.score = null`, `is_final = false`
- Student can submit new attempt

## Related
- API: `PUT /api/student-exercises/:id/reset-score`
- Middleware: `requireRole('admin')`
- TCs: TC-WEX-007-01..02
