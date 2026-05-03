# UC-WEX-005: Admin Grades Student Attempt

**Module:** weekly-exercises | **Actor:** Admin | **Priority:** P0

## Description
Admin submits a numeric score and optional notes/puzzleResults for a student's exercise assignment.

## Preconditions
- Admin authenticated (note: route has no requireRole — enforced by app layer or convention)
- `student_exercise` record exists

## Main Flow
1. Admin opens student assignment, enters score + optional notes + puzzleResults string
2. System PUTs `/api/student-exercises/:id/grade` with `{ score, notes, puzzleResults }`
3. Validates: score present, non-negative number; puzzleResults matches `/^[01,]*$/` if provided
4. Service updates assignment record
5. Returns 200 with updated data

## Alternate Flows
- 3a. `score` missing → 400 "Score is required"
- 3b. `score` < 0 → 400 "Score must be a non-negative number"
- 3c. `puzzleResults` invalid format → 400 "Invalid puzzleResults format"
- 3d. Assignment not found → 400 (service error)

## Postconditions
- `student_exercises.score` and `notes` updated

## Related
- API: `PUT /api/student-exercises/:id/grade`
- TCs: TC-WEX-005-01..03
