# UC-PSL-004: Reject Illegal Move

**Module:** puzzle-solving
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Board silently blocks a move that violates chess rules (e.g., moving into check, wrong piece color).

## Preconditions
- Puzzle is open and interactive

## Main Flow
1. Student clicks/drags a piece to an illegal target square
2. System detects rule violation
3. Piece snaps back to origin; no move recorded
4. No error message shown (silent rejection per chess UI convention)

## Postconditions
- Board position unchanged
- Attempt counter not incremented
- Student may try again

## Business Rules
- Illegal = violates chess rules (not just wrong puzzle answer)
- Distinguished from wrong-but-legal (UC-PSL-005)

## Related TCs
TC-PSL-004-01, TC-PSL-004-02
