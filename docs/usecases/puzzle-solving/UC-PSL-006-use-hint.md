# UC-PSL-006: Use Hint (Reveal Correct Move)

**Module:** puzzle-solving
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student requests a hint; the correct move is highlighted on the board and the hint counter increments.

## Preconditions
- Puzzle is open and interactive
- Student has not yet solved current move

## Main Flow
1. Student clicks "Hint" button
2. System highlights the correct source and target squares
3. Hint counter increments by 1
4. Student may then click/drag the highlighted move to proceed

## Postconditions
- Hint counter persisted to attempt record
- Board shows highlight until student makes the move or resets

## Business Rules
- Hints are unlimited but each use is recorded
- Hint count contributes negatively to scoring formula
- Hint does not auto-play the move; student must still execute it

## Related TCs
TC-PSL-006-01, TC-PSL-006-02
