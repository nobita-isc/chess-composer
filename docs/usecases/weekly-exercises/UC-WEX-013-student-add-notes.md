# UC-WEX-013: Student Adds Personal Notes

**Module:** weekly-exercises | **Actor:** Student | **Priority:** P2

## Description
Student writes personal notes on their exercise assignment (visible only to themselves and admin).

## Preconditions
- Student authenticated
- `student_exercise` assignment exists

## Main Flow
1. Student types in notes field
2. System PUTs `/api/student-exercises/:id/notes` with `{ notes }`
3. Repo updates `student_exercises.notes`
4. Returns 200 with updated data

## Alternate Flows
- 3a. Assignment not found → 400 from repo
- 3b. Empty string → allowed (clears notes)

## Postconditions
- `student_exercises.notes` updated

## Related
- API: `PUT /api/student-exercises/:id/notes`
- TCs: TC-WEX-013-01..02
