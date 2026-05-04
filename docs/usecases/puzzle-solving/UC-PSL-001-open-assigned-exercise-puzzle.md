# UC-PSL-001: Open Assigned Exercise Puzzle

**Module:** puzzle-solving
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student navigates to their weekly exercise and opens an assigned puzzle to solve it interactively.

## Preconditions
- Student is authenticated
- An exercise with at least one puzzle is assigned to the student
- Exercise is in active/open status

## Main Flow
1. Student opens Weekly Exercises list
2. Student selects an assigned exercise
3. System loads exercise detail; shows first puzzle (or last incomplete)
4. Chessboard renders with puzzle position (correct side-to-move highlighted)
5. Student is prompted to make the first move

## Postconditions
- Board displays correct FEN position
- Attempt record created or existing attempt resumed
- Side-to-move indicator visible

## Business Rules
- Only puzzles belonging to assigned exercise are accessible
- Completed exercises may be viewed read-only
- If exercise has multiple puzzles, resume from first unsolved

## Related TCs
TC-PSL-001-01, TC-PSL-001-02, TC-PSL-001-03
