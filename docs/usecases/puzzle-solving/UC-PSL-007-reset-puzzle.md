# UC-PSL-007: Reset Puzzle

**Module:** puzzle-solving
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student resets the current puzzle to its starting position, discarding progress on the current attempt.

## Preconditions
- Puzzle is open (mid-solve or after wrong move)

## Main Flow
1. Student clicks "Reset" button
2. Confirmation prompt shown (optional, depends on implementation)
3. Board restores to initial puzzle FEN
4. Attempt move history cleared locally
5. Wrong/hint counters for current attempt preserved (server-side)

## Postconditions
- Board at starting position
- Student may begin solving again
- Previous wrong/hint counts not erased (they are committed per move)

## Business Rules
- Reset does not create a new attempt record; it resets local board state only
- Score already persisted for completed moves is not rolled back

## Related TCs
TC-PSL-007-01, TC-PSL-007-02
