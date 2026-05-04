# UC-PSL-005: Wrong-but-Legal Move Handling

**Module:** puzzle-solving
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student plays a chess-legal move that is not the puzzle solution. Board shows feedback and snaps back.

## Preconditions
- Puzzle is open and interactive

## Main Flow
1. Student makes a legal move that does not match puzzle solution
2. System detects mismatch
3. Visual "wrong" feedback shown (red flash or shake)
4. Piece snaps back to origin after short delay
5. Wrong-attempt counter incremented
6. Student may try again (or use hint)

## Postconditions
- Board position unchanged
- Wrong attempt count +1
- Hint availability may change based on attempt threshold

## Business Rules
- Wrong attempt is tracked and affects scoring
- No penalty cap defined; students may try indefinitely
- Snapback must complete before board accepts next input

## Related TCs
TC-PSL-005-01, TC-PSL-005-02, TC-PSL-005-03
