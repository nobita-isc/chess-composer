# UC-PPL-004: Wrong Move Snapback / No Progress Recorded

**Module:** puzzle-play
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student plays a chess-legal but incorrect move; the piece snaps back and no partial progress is written to the backend.

## Preconditions
- Lesson puzzle open and interactive (UC-PPL-001)

## Main Flow
1. Student plays a legal move that is not the puzzle solution
2. Wrong-move visual feedback shown (red highlight / shake animation)
3. Piece snaps back to origin after ~500ms
4. Wrong-attempt counter incremented (client-side only until completion)
5. No API write occurs for the wrong move
6. Student may retry

## Postconditions
- Board position unchanged
- Backend not called mid-attempt (only on full completion)
- Wrong-attempt count held in client state

## Business Rules
- No partial progress persisted for lesson puzzles (differs from exercise puzzles where per-move tracking may apply)
- Snapback must fully complete before next input accepted
- Wrong moves affect final score calculation on completion

## Related TCs
TC-PPL-004-01, TC-PPL-004-02
