# UC-WEX-003: Admin Assigns Exercise to Students

**Module:** weekly-exercises | **Actor:** Admin | **Priority:** P0

## Description
Admin assigns an existing weekly exercise to one or more students, creating `student_exercises` records.

## Preconditions
- Admin authenticated
- Exercise exists
- Target students exist

## Main Flow
1. Admin selects exercise, picks student IDs
2. System POSTs `/api/exercises/:id/assign` with `{ studentIds: [...] }`
3. Service creates `student_exercise` row per student (idempotent on duplicate)
4. Returns 200 with assignment result data

## Alternate Flows
- 2a. `studentIds` missing or empty → 400 "At least one student ID is required"
- 2b. Exercise not found → service returns error → 400
- 2c. Some student IDs invalid → partial success or error per implementation

## Postconditions
- `student_exercises` rows created for each student
- Students can now view the exercise

## Related
- API: `POST /api/exercises/:id/assign`
- TCs: TC-WEX-003-01..03
