# UC-PSL-010: Solve Full Puzzle → Backend Persists Score + Attempts + Final Flag

**Module:** puzzle-solving
**Actor:** Student, System
**Last Updated:** 2026-05-03

## Description
After the student completes all moves in a puzzle, the system writes the final score, attempt count, hint count, and completion flag to the backend.

## Preconditions
- Student has solved every required move in the puzzle
- Valid session/JWT present

## Main Flow
1. Student plays final correct move
2. System detects puzzle completion (no more engine replies pending)
3. Success UI shown (confetti / completion banner)
4. System calls `PATCH /api/student-exercises/:id/puzzles/:puzzleId/attempt` with:
   - `completed: true`
   - `score`: computed from wrong + hint counts
   - `attempts`: total wrong attempts
   - `hints`: total hints used
5. Backend persists record; returns updated attempt
6. If all puzzles in exercise solved → exercise marked complete

## Postconditions
- `student_puzzle_attempts` row: `completed = true`, score/attempts/hints set
- Exercise completion flag updated if applicable
- Student may review solution but cannot re-submit

## Business Rules
- Score formula: `max(0, 100 - (wrongAttempts * 10) - (hints * 5))`
- Completion is idempotent; re-sending does not lower already-set score
- Must be authenticated; 401 if token expired mid-solve

## Related TCs
TC-PSL-010-01, TC-PSL-010-02, TC-PSL-010-03
