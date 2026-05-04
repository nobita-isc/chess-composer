# UC-PSL-002: Make Correct First Move (Click)

**Module:** puzzle-solving
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student clicks a piece then clicks the target square to submit the correct first move of a puzzle.

## Preconditions
- Puzzle is open (UC-PSL-001)
- Board is interactive (student's turn)

## Main Flow
1. Student clicks their piece (source square highlights)
2. Legal target squares highlighted
3. Student clicks a legal target square
4. System evaluates move against puzzle solution
5. Move is correct → piece animates to target; system plays engine reply (if any)
6. Next move prompt shown

## Postconditions
- Move recorded in attempt
- Board reflects new position
- If no engine reply: puzzle solved or next student move awaited

## Business Rules
- Only the puzzle's correct move advances progress; wrong-but-legal triggers UC-PSL-005
- Illegal moves are blocked silently (UC-PSL-004)

## Related TCs
TC-PSL-002-01, TC-PSL-002-02
