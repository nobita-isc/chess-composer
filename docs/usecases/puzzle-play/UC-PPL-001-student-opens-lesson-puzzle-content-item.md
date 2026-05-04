# UC-PPL-001: Student Opens Lesson Puzzle Content Item

**Module:** puzzle-play
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student navigates to a lesson content item of type "puzzle" and the interactive board renders.

## Preconditions
- Student is authenticated
- Lesson is published and contains at least one puzzle content item
- Student has access to the course/lesson

## Main Flow
1. Student opens a lesson from their course list
2. Student selects a puzzle content item in the lesson sidebar
3. System loads puzzle data (FEN, solution moves, metadata)
4. Chessboard renders at correct starting position
5. Side-to-move indicator shown; student prompted to make first move

## Postconditions
- Board interactive for student role
- No progress written yet (write occurs on solve)
- Puzzle metadata (title, instructions) displayed

## Business Rules
- Puzzle content items are created by admin via lesson composer
- Student cannot access unpublished lessons
- Admin viewing same route enters preview mode (UC-PPL-005)

## Related TCs
TC-PPL-001-01, TC-PPL-001-02, TC-PPL-001-03
