# UC-PSL-008: Promotion Picker (Pawn to 8th Rank)

**Module:** puzzle-solving
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
When the correct puzzle move involves a pawn reaching the 8th rank, a promotion picker dialog appears for the student to choose the promotion piece.

## Preconditions
- Puzzle is open and interactive
- Correct next move is a pawn promotion

## Main Flow
1. Student moves pawn to 8th rank (click or drag)
2. Promotion picker dialog appears (Queen, Rook, Bishop, Knight)
3. Student selects a piece
4. System evaluates: if selected piece matches puzzle solution, move accepted
5. If wrong piece chosen, treated as wrong-but-legal (UC-PSL-005)

## Postconditions
- Board reflects promoted piece
- Attempt continues or wrong-attempt counter increments

## Business Rules
- Picker must block board input until selection is made
- Dismissing picker without selection cancels the move (piece snaps back)
- Only piece matching solution is "correct"

## Related TCs
TC-PSL-008-01, TC-PSL-008-02, TC-PSL-008-03
