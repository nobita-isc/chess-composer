# Phase 5: Integration Testing

## Context
- All consumer files refactored in Phases 2-4
- [ExercisePanel.js](../../packages/client/src/exercises/ExercisePanel.js) -- 5 call sites for PuzzlePlayer
- [StudentDashboard.js](../../packages/client/src/auth/StudentDashboard.js) -- 1 call site for ExercisePuzzleViewer
- [lesson-player.js](../../packages/client/src/lessons/lesson-player.js) -- 1 call site for each viewer

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 1h
- **Blocked by**: Phases 2, 3, 4

Verify all puzzle interaction flows work correctly after refactoring. Focus on the Chessground interaction bug that motivated this work.

## Key Insights

### Critical Bug to Verify Fixed
The Chessground `set()` corruption bug: pieces become unselectable after multiple board state updates. This was the original motivation. Test specifically:
1. Solve 3+ puzzles sequentially in ExercisePuzzleViewer (navigate next after each)
2. Grade 5+ puzzles in PuzzlePlayer (rapid grading with C/X keys)
3. Play 3+ lesson challenges in sequence (next button)
4. In each case: after completing a puzzle, verify pieces on next puzzle are draggable/selectable

### All Call Sites to Test

| # | Flow | Entry Point | File | Call |
|---|------|-------------|------|------|
| 1 | Play exercise | ExercisePanel play button | ExercisePanel.js L188 | `openPuzzlePlayer(playData)` |
| 2 | View puzzles | ExercisePanel view details | ExercisePanel.js L928 | `openExercisePuzzleViewer(data)` |
| 3 | Grade all students | Exercise details dialog | ExercisePanel.js L308 | `openPuzzlePlayer(exercise, { gradingMode, assignments })` |
| 4 | Grade single student | Exercise details dialog | ExercisePanel.js L327 | `openPuzzlePlayer(exercise, { gradingMode, assignments: [a] })` |
| 5 | Student solve | Student exercise list | ExercisePanel.js L1116 | `openPuzzlePlayer(exercise, { studentMode })` |
| 6 | Student review | Student exercise list | ExercisePanel.js L1137 | `openPuzzlePlayer(exercise, { reviewMode })` |
| 7 | View from panel | Exercise panel puzzle viewer | ExercisePanel.js L1181 | `openExercisePuzzleViewer(exercise)` |
| 8 | Grade from panel | Exercise panel puzzle grading | ExercisePanel.js L1183 | `openExercisePuzzleViewer(exercise, { gradingMode })` |
| 9 | Student dashboard | Student dashboard exercises | StudentDashboard.js L251 | `openExercisePuzzleViewer(exerciseData, { ... })` |
| 10 | Lesson puzzle | Lesson player puzzle content | lesson-player.js L135 | `openLessonPuzzlePlayer({ item, ... })` |

## Test Plan

### Test 1: Exercise Play Mode (Flow #1)
- [ ] Open exercise, click Play
- [ ] Board renders with correct orientation
- [ ] Opponent first move auto-plays with animation
- [ ] Player can drag/click pieces
- [ ] Correct move: feedback shown, opponent responds
- [ ] Wrong move: undo animation, "Try again" feedback
- [ ] Complete puzzle: "Puzzle Complete!" feedback, board disabled
- [ ] Reset button: puzzle returns to initial state
- [ ] Hint button: source square highlighted green
- [ ] Solution button: moves displayed in panel
- [ ] Navigate next/prev: new puzzle loads cleanly
- [ ] Close: overlay removed, no DOM leaks

### Test 2: Exercise Puzzle Viewer (Flow #2, #7)
- [ ] Open puzzle viewer modal
- [ ] Board renders, opponent move auto-plays
- [ ] Solve puzzle, verify "Puzzle Solved!" status
- [ ] Navigate to next puzzle (arrow buttons)
- [ ] **CRITICAL**: After navigating 3+ puzzles, verify pieces still selectable
- [ ] Flip board: orientation changes
- [ ] Copy FEN: clipboard contains correct FEN
- [ ] Hint: shows piece-type hint
- [ ] Solution: shows full SAN line
- [ ] Close modal: body overflow restored

### Test 3: Grading - ExercisePuzzleViewer (Flow #8)
- [ ] Open grading mode (ExercisePuzzleViewer with gradingMode)
- [ ] Grade buttons (Correct/Wrong) visible
- [ ] Click Correct: button highlights, saves to server
- [ ] Click Wrong: button highlights, saves to server
- [ ] Keyboard C: marks correct
- [ ] Keyboard X: marks wrong
- [ ] Auto-advance: jumps to next ungraded puzzle
- [ ] Grade summary updates (N correct, N wrong, N remaining)
- [ ] All graded: "All puzzles graded!" message

### Test 4: Grading - PuzzlePlayer Multi-Student (Flow #3)
- [ ] Open with multiple students
- [ ] Student tabs visible with names and scores
- [ ] Click student tab: switches to that student's results
- [ ] Grade puzzle for Student A, auto-advance
- [ ] Switch to Student B: different grading state shown
- [ ] Grade dots reflect per-student results (correct=green, wrong=red)
- [ ] Score per student updates in tab
- [ ] Done button: shows remaining count, then "all done" when complete
- [ ] **CRITICAL**: After grading 5+ puzzles rapidly, board still interactive

### Test 5: Grading - PuzzlePlayer Single Student (Flow #4)
- [ ] Open with single student
- [ ] No student tabs (single student mode)
- [ ] Grade flow same as multi-student
- [ ] Save confirmed in status area

### Test 6: Student Solve Mode (Flow #5)
- [ ] Open in student mode
- [ ] Board interactive, player solves puzzle
- [ ] Correct solve: auto-marked as correct, saved
- [ ] Wrong move: tracked (wrongAttempts counter)
- [ ] Hint button: shows hint, records hint usage
- [ ] Progress dots update (correct=green, with-hint=orange)
- [ ] Navigate away without solving: puzzle marked as wrong
- [ ] Score updates in header
- [ ] Done button: shows remaining count
- [ ] Results auto-saved to server

### Test 7: Review Mode (Flow #6)
- [ ] Open in review mode
- [ ] Board NOT interactive (dragging/clicking disabled)
- [ ] "Review" badge visible in header
- [ ] Solution button available
- [ ] Progress dots show previous results
- [ ] No hint button

### Test 8: Lesson Puzzle Player (Flow #10)
- [ ] Open puzzle challenge from lesson
- [ ] Full-screen dark theme layout renders
- [ ] Board correct orientation for player color
- [ ] Player moves first (no opponent auto-play at start)
- [ ] Correct move: explanation shown in timeline
- [ ] Computer responds: explanation shown in timeline
- [ ] Wrong move: "Not quite" feedback in timeline
- [ ] Hint button: reveals hint in timeline
- [ ] Video button: opens external URL (if configured)
- [ ] Reset: clears timeline, resets board
- [ ] Complete: progress bar updates, onComplete fires
- [ ] Prev/Next: navigates between challenges
- [ ] Back: returns to lesson player
- [ ] **CRITICAL**: After solving 3+ challenges sequentially, board still works

### Test 9: Chessground Interaction Bug (Regression Test)
- [ ] ExercisePuzzleViewer: open, solve puzzle, navigate next (x5). On puzzle 5, drag a piece.
- [ ] PuzzlePlayer: open, solve puzzle, navigate next (x5). On puzzle 5, drag a piece.
- [ ] PuzzlePlayer grading: grade 10 puzzles with C/X keys. On puzzle 10, try to interact with board.
- [ ] lesson-puzzle-player: solve challenge, close, open next challenge (x3). On challenge 3, drag a piece.
- [ ] In all cases: pieces must be selectable and draggable.

### Test 10: Edge Cases
- [ ] Exercise with single puzzle (no navigation)
- [ ] Puzzle with only 1 player move (2 total moves: opponent + player)
- [ ] Puzzle with promotion move (pawn reaches 8th rank)
- [ ] Very fast navigation (click next rapidly 5 times)
- [ ] Close modal while opponent move is animating
- [ ] Open viewer, close immediately, open again

## Implementation Steps

1. Start dev server: `npm run dev`
2. Log in as admin, navigate to exercises
3. Run through Tests 1-8 systematically
4. Create test exercise with known puzzles for regression test (Test 9)
5. Log in as student for Tests 5, 6, 9 (student perspective)
6. Test lesson puzzle player with a course that has puzzle challenges
7. Run edge case tests (Test 10)
8. If any test fails: document failure, fix in relevant phase, re-test

## Success Criteria
- All 10 test groups pass
- No Chessground interaction corruption after sequential puzzle solving
- No JavaScript console errors during any flow
- No visual regressions (layout, colors, animations)
- Board animations smooth (opponent moves, wrong move undo)
- Auto-save works in all grading/student modes

## Risk Assessment
- **Promotion handling**: Auto-queen is used everywhere currently. If a puzzle requires under-promotion, it will be solved incorrectly. This is a pre-existing limitation, not introduced by this refactor.
- **Race condition on rapid navigation**: If user clicks "next" while opponent move is mid-animation, `destroy()` must cleanly cancel pending timeouts. Shared module's `destroy()` should clear any `setTimeout` IDs. Verify this in Test 10.
- **Student dashboard call site**: Tested separately because it has a different code path through StudentDashboard.js, not ExercisePanel.js.
