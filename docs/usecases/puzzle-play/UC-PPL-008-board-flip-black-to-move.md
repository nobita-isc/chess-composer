# UC-PPL-008: Board Flip When Puzzle Is Black-to-Move

**Module:** puzzle-play
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
When a lesson puzzle's starting position requires Black to move, the board renders flipped (Black pieces at bottom) so the student always plays from their perspective.

## Preconditions
- Lesson puzzle open (UC-PPL-001)
- Puzzle FEN indicates Black to move (`b` in FEN active-color field)

## Main Flow
1. System loads puzzle FEN
2. Detects active color = Black
3. Board renders with Black pieces at bottom (board flipped 180°)
4. Side-to-move indicator shows "Black to move"
5. Student solves puzzle normally; all move validation uses Black's perspective

## Postconditions
- Board orientation matches side-to-move throughout the puzzle
- Engine replies (White moves) are animated from White's squares at top

## Business Rules
- Flip is automatic and not user-controlled during solve (no manual flip button in lesson mode)
- Multi-challenge puzzles: each challenge flips independently based on its own FEN active color
- Flip state does not persist across page reloads (re-derived from FEN)

## Related TCs
TC-PPL-008-01, TC-PPL-008-02
