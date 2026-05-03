# UC-PSL-003: Make Correct First Move (Drag)

**Module:** puzzle-solving
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student drags a piece to the correct target square to submit the correct first move.

## Preconditions
- Puzzle is open (UC-PSL-001)
- Board is interactive

## Main Flow
1. Student presses and holds a piece
2. Piece follows cursor/finger; legal squares highlighted
3. Student releases on correct target square
4. System evaluates → correct; piece lands, engine reply plays
5. Next move prompt shown

## Postconditions
- Same as UC-PSL-002

## Business Rules
- Drag released on illegal square: piece snaps back, no attempt counted
- Drag and click are equivalent input methods

## Related TCs
TC-PSL-003-01, TC-PSL-003-02
