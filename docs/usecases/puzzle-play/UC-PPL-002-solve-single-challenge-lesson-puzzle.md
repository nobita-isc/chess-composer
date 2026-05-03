# UC-PPL-002: Solve Single-Challenge Lesson Puzzle

**Module:** puzzle-play
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student solves a lesson puzzle that has exactly one challenge (one move sequence to find).

## Preconditions
- Puzzle content item open (UC-PPL-001)
- Puzzle has a single challenge/solution line

## Main Flow
1. Student makes correct move(s) in the solution line
2. Engine replies play automatically after each correct student move
3. Final correct move played → success state shown (banner/animation)
4. System writes completion record: `POST /api/lesson-puzzle-attempts`
5. Lesson progress updated; next content item unlocked if sequential

## Postconditions
- Completion persisted with timestamp and score
- Puzzle shows solved state on revisit
- Student may replay but score not overwritten

## Business Rules
- Progress write only on full completion, not partial
- Revisiting already-solved puzzle shows read-only replay mode
- Score: 100 − (wrongAttempts × 10) − (hints × 5), min 0

## Related TCs
TC-PPL-002-01, TC-PPL-002-02
