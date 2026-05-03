# UC-PSL-009: Multi-Puzzle Exercise Navigation

**Module:** puzzle-solving
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student navigates between multiple puzzles within the same exercise using previous/next controls.

## Preconditions
- Exercise contains ≥2 puzzles
- At least one puzzle is open

## Main Flow
1. Student completes or skips current puzzle
2. "Next Puzzle" button becomes active
3. Student clicks Next → board loads subsequent puzzle position
4. Student may click Previous to revisit earlier puzzles (read-only if already solved)
5. Progress indicator updates (e.g., "Puzzle 2 of 4")

## Postconditions
- Active puzzle index updated
- Already-solved puzzles shown read-only
- Unsolved puzzles remain interactive

## Business Rules
- Navigation does not reset attempt counters for completed puzzles
- Skipping an unsolved puzzle is allowed; it stays unsolved
- Final puzzle completion triggers UC-PSL-010

## Related TCs
TC-PSL-009-01, TC-PSL-009-02, TC-PSL-009-03
