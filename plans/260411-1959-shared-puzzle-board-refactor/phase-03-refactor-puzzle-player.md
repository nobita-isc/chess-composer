# Phase 3: Refactor PuzzlePlayer to Use Shared Module

## Context
- [PuzzlePlayer.js](../../packages/client/src/exercises/PuzzlePlayer.js) (1493 LOC) -- #2 on modularization priority list
- [interactive-puzzle-board.js](../../packages/client/src/shared/interactive-puzzle-board.js) (from Phase 1)
- [code-standards.md](../../docs/code-standards.md) -- PuzzlePlayer marked for split
- Call sites: [ExercisePanel.js L188, L308, L327, L1116, L1137](../../packages/client/src/exercises/ExercisePanel.js)

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 2h
- **Blocked by**: Phase 1

PuzzlePlayer.js is 1493 LOC -- nearly 2x the 800 LOC max. This phase both integrates the shared module AND splits PuzzlePlayer into focused sub-modules.

## Key Insights

### Current Structure (1493 LOC breakdown)
| Section | Lines | LOC | Purpose |
|---------|-------|-----|---------|
| Utils (parseUciMove, getLegalMoves, escapeHtml) | 0-37, 1482-1493 | ~50 | Duplicated utilities |
| Entry point + state setup | 49-127 | ~80 | Options parsing, result arrays |
| HTML template | 128-219 | ~90 | Overlay DOM construction |
| Inline CSS | 222-681 | ~460 | All styles in `<style>` tag |
| Board init (initPuzzle) | 687-804 | ~120 | Chessground setup, puzzle loading |
| Move handling | 809-931 | ~120 | handleMove, playOpponentMove |
| Feedback UI | 936-955 | ~20 | showFeedback, hideFeedback |
| Hint + Solution | 960-1017 | ~60 | showHint, showSolution |
| Grading functions | 1019-1228 | ~210 | saveGrade, markCorrect/Wrong, UI updates |
| Student solve functions | 1237-1368 | ~130 | solveResults tracking, save, finish |
| Event listeners | 1370-1480 | ~110 | Click, keyboard handlers, close |

### What Gets Removed (~170 LOC)
- `parseUciMove()`, `getLegalMoves()`, `escapeHtml()` -- use shared utils
- `initPuzzle()` board init section (L762-803) -- use `InteractivePuzzleBoard`
- `handleMove()` (L809-883) -- shared module handles this
- `playOpponentMove()` (L888-931) -- shared module handles this

### Modularization Strategy
Split into 4 files:

| File | Responsibility | Est. LOC |
|------|---------------|----------|
| `PuzzlePlayer.js` | Entry point, state, event wiring, close | ~200 |
| `puzzle-player-styles.js` | Export CSS string constant | ~200 |
| `puzzle-player-grading.js` | Grading logic (multi-student, save, UI) | ~200 |
| `puzzle-player-student-solve.js` | Student solve mode (tracking, save, UI) | ~150 |

Total: ~750 LOC (down from 1493). The ~460 LOC inline CSS moves to its own file.

## Requirements

### Functional
- All 4 modes preserved: play, grade single, grade multi-student, student solve, review
- Inline styles still injected (moved to separate file, same behavior)
- Multi-student tab switching works
- Auto-advance after grading works
- Student solve results auto-save
- Keyboard shortcuts: arrows, R, H, S, C/X for grading

### Non-Functional
- Public API unchanged: `openPuzzlePlayer(exercise, options)`
- Each sub-module under 200 LOC (styles file allowed up to 250 for CSS)
- No behavior changes

## Architecture

### File Structure After Refactor

```
packages/client/src/exercises/
  ├── PuzzlePlayer.js                    (~200 LOC, entry point)
  ├── puzzle-player-styles.js            (~200 LOC, CSS export)
  ├── puzzle-player-grading.js           (~200 LOC, grading logic)
  └── puzzle-player-student-solve.js     (~150 LOC, student mode)
```

### PuzzlePlayer.js (Entry Point, ~200 LOC)

```javascript
import { InteractivePuzzleBoard } from '../shared/interactive-puzzle-board.js'
import { escapeHtml } from '../shared/chess-puzzle-utils.js'
import { puzzlePlayerStyles } from './puzzle-player-styles.js'
import { createGradingController } from './puzzle-player-grading.js'
import { createStudentSolveController } from './puzzle-player-student-solve.js'

export function openPuzzlePlayer(exercise, options = {}) {
  // State setup (unchanged)
  // HTML template construction (unchanged)
  // Inject styles from puzzlePlayerStyles
  // Create grading/student controllers based on mode
  // initPuzzle() uses InteractivePuzzleBoard
  // Event wiring
  // close() cleanup
}
```

### initPuzzle() Integration Pattern

```javascript
function initPuzzle(index) {
  currentIndex = index
  const puzzle = puzzles[index]
  const moves = puzzle.moves ? puzzle.moves.split(' ') : []

  // Destroy previous board
  if (puzzleBoard) puzzleBoard.destroy()

  // Update navigation UI
  overlay.querySelector('#puzzle-current').textContent = index + 1
  overlay.querySelector('#btn-prev').disabled = index === 0
  overlay.querySelector('#btn-next').disabled = index === puzzles.length - 1

  // Determine player color by playing first move mentally
  const tempChess = new Chess(puzzle.fen)
  let lastMoveSan = null
  if (moves.length > 0) {
    const parsed = parseUciMove(moves[0])
    if (parsed) {
      const m = tempChess.move(parsed)
      if (m) lastMoveSan = m.san
    }
  }
  const playerColor = tempChess.turn()

  // Track puzzle state for grading/student modes
  puzzleState = { puzzle, moves, playerColor, isComplete: false, solutionShown: false }

  // Update info panel
  updateTurnIndicator(playerColor)
  overlay.querySelector('#puzzle-last-move').textContent = lastMoveSan ? `After ${lastMoveSan}` : ''
  overlay.querySelector('#puzzle-rating').textContent = puzzle.rating ? `Rating: ${puzzle.rating}` : ''

  // Create shared board
  const boardEl = overlay.querySelector('#puzzle-board')
  puzzleBoard = new InteractivePuzzleBoard({
    fen: puzzle.fen,
    solutionMoves: moves,
    boardEl,
    onCorrectMove: (san, idx) => {
      showFeedback('Correct!', 'correct')
      if (studentMode && solveResults && !puzzleState.isComplete) {
        // Don't mark complete yet -- wait for onPuzzleComplete
      }
    },
    onWrongMove: (attemptedSan) => {
      showFeedback('Try again', 'incorrect')
      if (studentMode) {
        puzzleState.wrongAttempts = (puzzleState.wrongAttempts || 0) + 1
      }
    },
    onOpponentMove: (san, idx) => {
      // Opponent move animated by shared module
    },
    onPuzzleComplete: () => {
      puzzleState.isComplete = true
      showFeedback('Puzzle Complete!', 'complete')
      if (studentMode && solveResults && solveResults[currentIndex] !== true) {
        solveResults[currentIndex] = true
        studentSolveCtrl?.updateUI()
        studentSolveCtrl?.saveResults()
      }
    }
  })

  puzzleBoard.init()

  // Review mode: disable board
  if (reviewMode) {
    puzzleBoard.getBoard().set({
      movable: { free: false, color: undefined, dests: new Map() },
      draggable: { enabled: false }
    })
  }

  // Update mode-specific UI
  gradingCtrl?.updateUI()
  studentSolveCtrl?.updateUI()
}
```

### puzzle-player-grading.js

```javascript
/**
 * Creates a grading controller for PuzzlePlayer.
 * Manages multi-student grading state, save, UI updates.
 *
 * @param {Object} params
 * @param {Object[]} params.students - student assignment objects
 * @param {Object[]} params.puzzles - puzzle array
 * @param {boolean[][]} params.studentResults - results[studentIdx][puzzleIdx]
 * @param {HTMLElement} params.overlay - DOM overlay
 * @param {ApiClient} params.apiClient
 * @param {Function} params.getCurrentIndex - () => currentIndex
 * @param {Function} params.getCurrentStudentIndex - () => currentStudentIndex
 * @param {Function} params.setCurrentStudentIndex - (idx) => void
 * @param {Function} params.initPuzzle - (idx) => void
 * @returns {{ updateUI, markCorrect, markWrong, switchStudent, finishGrading }}
 */
export function createGradingController(params) { ... }
```

### puzzle-player-student-solve.js

```javascript
/**
 * Creates a student solve controller for PuzzlePlayer.
 * Manages solve results, hint tracking, save, UI updates.
 *
 * @param {Object} params
 * @param {boolean[]} params.solveResults
 * @param {boolean[]} params.hintUsed
 * @param {Object[]} params.puzzles
 * @param {HTMLElement} params.overlay
 * @param {ApiClient} params.apiClient
 * @param {string} params.studentExerciseId
 * @param {boolean} params.studentMode
 * @param {boolean} params.reviewMode
 * @param {Function} params.getCurrentIndex
 * @returns {{ updateUI, saveResults, finishSolving }}
 */
export function createStudentSolveController(params) { ... }
```

### Hint Integration

```javascript
// In PuzzlePlayer.js showHint():
function showHint() {
  if (puzzleState.isComplete) return
  const expected = puzzleBoard.getExpectedMove()
  if (!expected) return

  if (studentMode && hintUsed) hintUsed[currentIndex] = true

  // Flash source square
  puzzleBoard.getBoard().setAutoShapes([
    { orig: expected.from, brush: 'green' }
  ])
  setTimeout(() => puzzleBoard.getBoard().setAutoShapes([]), 1500)
}
```

### Solution Integration

```javascript
// showSolution() stays largely the same -- it reconstructs all moves as SAN
// Uses uciMovesToSan(puzzle.fen, moves) from shared utils instead of manual loop
function showSolution() {
  puzzleState.solutionShown = true
  const sanMoves = uciMovesToSan(puzzleState.puzzle.fen, puzzleState.moves)
  const boardState = puzzleBoard.getState()
  // Render solution with played/current highlighting based on boardState.currentMoveIndex
}
```

## Related Code Files

### Modify
- `packages/client/src/exercises/PuzzlePlayer.js` -- refactor + split

### Create
- `packages/client/src/exercises/puzzle-player-styles.js`
- `packages/client/src/exercises/puzzle-player-grading.js`
- `packages/client/src/exercises/puzzle-player-student-solve.js`

### No changes needed
- `packages/client/src/exercises/ExercisePanel.js` -- call sites unchanged

## Implementation Steps

1. Create `puzzle-player-styles.js` -- move all CSS from `style.textContent` block
2. Create `puzzle-player-grading.js` -- extract `saveStudentGrade`, `markCorrect`, `markWrong`, `autoAdvance`, `switchStudent`, `updateGradingUI`, `finishGrading`
3. Create `puzzle-player-student-solve.js` -- extract `saveStudentSolveResults`, `updateStudentSolveUI`, `finishSolving`
4. In `PuzzlePlayer.js`: remove `parseUciMove`, `getLegalMoves`, `escapeHtml`; import from shared
5. Replace `initPuzzle()` board init with `InteractivePuzzleBoard`
6. Remove `handleMove()` and `playOpponentMove()` -- replaced by shared module callbacks
7. Update `showHint()` to use `puzzleBoard.getExpectedMove()`
8. Update `showSolution()` to use `uciMovesToSan()` from shared utils
9. Wire grading controller in grading mode
10. Wire student solve controller in student/review mode
11. Update `close()` to call `puzzleBoard.destroy()`
12. Verify all 5 call sites work

## Todo
- [ ] Extract CSS to `puzzle-player-styles.js`
- [ ] Extract grading logic to `puzzle-player-grading.js`
- [ ] Extract student solve logic to `puzzle-player-student-solve.js`
- [ ] Replace board logic with `InteractivePuzzleBoard`
- [ ] Import shared utilities
- [ ] Update hint/solution to use shared module
- [ ] Test: play mode (ExercisePanel play button)
- [ ] Test: grade single student
- [ ] Test: grade multiple students (tab switching)
- [ ] Test: student solve mode
- [ ] Test: review mode (board disabled)
- [ ] Verify all files under 200 LOC (styles under 250)

## Success Criteria
- `PuzzlePlayer.js` under 200 LOC
- Each sub-module under 200 LOC (styles up to 250)
- No `Chessground` import in any PuzzlePlayer file
- No direct `chess.js` move validation (only in solution display)
- `openPuzzlePlayer` public API unchanged
- All 4 modes work correctly
- Multi-student tab switching + auto-advance preserved

## Risk Assessment
- **Large refactor scope**: Mitigate by extracting CSS first (pure move, no logic changes), then extracting grading/student modules, then integrating shared board. Each step independently verifiable.
- **Grading controller needs `initPuzzle` reference**: Pass as callback in controller params. Avoid circular dependency.
- **`boardInstance.move()` animation**: PuzzlePlayer currently uses `boardInstance.move(from, to)` for smooth opponent move animation. This is already planned in the shared module's `_playOpponentMove()`. Verify animation quality is preserved.
- **Style injection timing**: CSS is currently injected once. Moving to imported constant means the style element creation stays in PuzzlePlayer.js, just the content comes from the styles module.
