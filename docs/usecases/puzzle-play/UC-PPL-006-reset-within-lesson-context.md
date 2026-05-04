# UC-PPL-006: Reset Within Lesson Context

**Module:** puzzle-play
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student resets the lesson puzzle board to its starting position without leaving the lesson view.

## Preconditions
- Lesson puzzle open and mid-solve

## Main Flow
1. Student clicks "Reset" button on puzzle board
2. Board restores to initial puzzle FEN
3. Wrong/hint counters preserved (not zeroed)
4. No API call made on reset
5. Student begins solving again from scratch

## Postconditions
- Board at starting FEN
- Client-side wrong/hint counts retained
- No backend write triggered

## Business Rules
- Reset does not affect already-persisted completion records
- If puzzle was already solved, reset shows starting position in review mode (not interactive for re-submission)
- Multi-challenge puzzle: reset applies to current challenge only

## Related TCs
TC-PPL-006-01, TC-PPL-006-02
