# UC-WEX-014: Student Views Grade and Final-Mark Status

**Module:** weekly-exercises | **Actor:** Student | **Priority:** P1

## Description
Student views their score, admin notes/feedback, and whether the grade is marked final (read-only locked).

## Preconditions
- Student authenticated
- `student_exercise` graded (score set)

## Main Flow
1. Student opens exercise assignment
2. System GETs `/api/student-exercises/:id`
3. Response includes `score`, `notes` (admin feedback), `is_final`
4. UI renders score and feedback; if `is_final = true`, shows "Final" badge and hides resubmit option

## Alternate Flows
- 3a. Score not yet set → `score: null` shown as "Pending"
- 3b. `is_final = false` → student can still submit attempt

## Postconditions
- Read-only view

## Related
- API: `GET /api/student-exercises/:id`
- TCs: TC-WEX-014-01..02
