# UC-WEX-011: Student Records Attempt

**Module:** weekly-exercises | **Actor:** Student | **Priority:** P0

## Description
Student submits their puzzle attempt with score, puzzleResults, and optional puzzleHints.

## Preconditions
- Student authenticated
- `student_exercise` assigned to student

## Main Flow
1. Student completes puzzles, clicks "Submit Attempt"
2. System PUTs `/api/student-exercises/:id/attempt` with `{ score, puzzleResults, puzzleHints }`
3. Validates score ≥ 0; puzzleResults/puzzleHints match `/^[01,]*$/`
4. Service saves attempt
5. Returns 200 with updated assignment data

## Alternate Flows
- 3a. `score` missing → 400 "Score is required"
- 3b. `score` negative → 400
- 3c. `puzzleResults` invalid chars → 400 "Invalid puzzleResults format"
- 3d. `puzzleHints` invalid chars → 400 "Invalid puzzleHints format"

## Postconditions
- `student_exercises` attempt fields updated

## Related
- API: `PUT /api/student-exercises/:id/attempt`
- TCs: TC-WEX-011-01..03
