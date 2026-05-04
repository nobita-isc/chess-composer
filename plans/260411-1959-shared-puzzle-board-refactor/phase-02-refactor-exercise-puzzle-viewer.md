# Phase 2: Refactor ExercisePuzzleViewer to Use Shared Module

## Context
- [ExercisePuzzleViewer.js](../../packages/client/src/exercises/ExercisePuzzleViewer.js) (522 LOC)
- [interactive-puzzle-board.js](../../packages/client/src/shared/interactive-puzzle-board.js) (from Phase 1)
- [chess-puzzle-utils.js](../../packages/client/src/shared/chess-puzzle-utils.js) (from Phase 1)
- Call sites: [ExercisePanel.js L928, L1181, L1183](../../packages/client/src/exercises/ExercisePanel.js), [StudentDashboard.js L251](../../packages/client/src/auth/StudentDashboard.js), [lesson-player.js L7](../../packages/client/src/lessons/lesson-player.js)

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 1h
- **Blocked by**: Phase 1

Replace all duplicated board logic in ExercisePuzzleViewer with `InteractivePuzzleBoard`. Keep all UI/modal/grading code intact.

## Key Insights

### What Gets Removed (~130 LOC)
- `parseUciMove()` (L22-24) -- use from `chess-puzzle-utils.js`
- `getDestinationMap()` (L69-76) -- use `getLegalMoves` from `chess-puzzle-utils.js`
- `_recreateBoard()` (L379-400) -- shared module handles Chessground lifecycle
- `_autoPlayOpponent()` (L402-413) -- shared module's `init()` does this
- `_handleMove()` (L415-469) -- shared module's internal `_handlePlayerMove()`
- Manual Chessground init block (L242-257) -- shared module's `init()`
- `_logMove()` (L472-480) -- move logging reconstructed from callbacks

### What Stays (~260 LOC)
- `openExercisePuzzleViewer()` entry point + options handling
- `convertExercisePuzzle()` -- exercise-specific UCI-to-SAN conversion
- `_openViewer()` -- modal overlay DOM construction
- All grading logic (gradeAndSave, keyboard shortcuts, auto-advance)
- `_renderMoves()`, `_showStatus()`, `_gradeSummaryHtml()`, `_hideActions()`
- Navigation (prev/next/flip), hint, solution, copy FEN handlers
- `escapeHtml()` -- use from `chess-puzzle-utils.js`
- `getDifficultyInfo()` -- stays (UI-only helper)

### Estimated Result
~350 LOC (down from 522) -- well within 200-400 target range.

## Requirements

### Functional
- All existing behavior preserved: view, grade, navigate, hint, solution, flip, copy FEN
- Grading mode: keyboard shortcuts (C/X), auto-advance to next ungraded
- Puzzle navigation destroys old board, creates new `InteractivePuzzleBoard`
- Move log still renders in sidebar panel

### Non-Functional
- No behavior changes from user perspective
- Public API unchanged: `openExercisePuzzleViewer(exercise, options)`

## Architecture

### Before (simplified)
```
ExercisePuzzleViewer
  ├── parseUciMove()          ← DUPLICATED
  ├── getDestinationMap()     ← DUPLICATED
  ├── _recreateBoard()        ← WORKAROUND
  ├── _autoPlayOpponent()     ← DUPLICATED
  ├── _handleMove()           ← DUPLICATED
  ├── Chessground(boardEl, {  ← DUPLICATED init
  ├── convertExercisePuzzle() ← UNIQUE
  ├── grading logic           ← UNIQUE
  └── modal UI                ← UNIQUE
```

### After
```
ExercisePuzzleViewer
  ├── InteractivePuzzleBoard (from shared)
  │     ├── init(), destroy(), reset(), flip()
  │     └── callbacks: onCorrectMove, onWrongMove, onOpponentMove, onPuzzleComplete
  ├── chess-puzzle-utils (from shared)
  │     ├── escapeHtml(), uciMovesToSan()
  ├── convertExercisePuzzle() ← UNIQUE (kept)
  ├── grading logic           ← UNIQUE (kept)
  └── modal UI                ← UNIQUE (kept)
```

### Integration Pattern

```javascript
import { InteractivePuzzleBoard } from '../shared/interactive-puzzle-board.js'
import { escapeHtml, uciMovesToSan } from '../shared/chess-puzzle-utils.js'

// In _openViewer(), after DOM is appended:
setTimeout(() => {
  const boardEl = document.getElementById('epv-board')
  if (!boardEl) return

  // Convert SAN solution back to UCI for shared module
  // (convertExercisePuzzle already has original UCI moves)
  const uciMoves = (puzzle.rawMoves || '').split(' ').filter(Boolean)

  state.puzzleBoard = new InteractivePuzzleBoard({
    fen: puzzle.fen,
    solutionMoves: uciMoves,
    boardEl,
    opponentMoveDelay: 600,
    onCorrectMove: (san, index) => {
      _logMove(state, san, 'correct')
      _renderMoves(state, overlay)
    },
    onWrongMove: (attemptedSan) => {
      _showStatus(overlay, 'error', 'Wrong move!',
        `${attemptedSan} is not the best move here. Try again.`)
      setTimeout(() => {
        const statusEl = overlay.querySelector('#epv-status')
        if (statusEl?.classList.contains('pv-status-error')) statusEl.style.display = 'none'
      }, 3000)
    },
    onOpponentMove: (san, index) => {
      _logMove(state, san, 'opponent')
      _renderMoves(state, overlay)
    },
    onPuzzleComplete: () => {
      state.isComplete = true
      _showStatus(overlay, 'success', 'Puzzle Solved!', 'Great work!')
      _hideActions(overlay, ['hint', 'solution'])
    }
  })

  state.puzzleBoard.init()
}, 50)
```

### Data Flow Change

`convertExercisePuzzle()` currently discards original UCI moves after SAN conversion. Must preserve raw UCI moves for the shared module:

```javascript
// Add to convertExercisePuzzle return:
return {
  ...existingFields,
  rawMoves: puzzle.moves || ''  // preserve original UCI string
}
```

### Flip Handler Change

```javascript
// Before:
state.boardInstance.set({ orientation: state.orientation })

// After:
state.puzzleBoard.flip()
// Update state.orientation from puzzleBoard.getState().orientation
```

### Hint Handler Change

```javascript
// Before: reads from puzzle.solutionLine[state.currentMoveIndex]
// After:
const expected = state.puzzleBoard.getExpectedMove()
// expected = { from, to, promotion } or null
```

### Close/Navigate Cleanup

```javascript
// Before:
if (state.boardInstance?.destroy) state.boardInstance.destroy()

// After:
if (state.puzzleBoard) state.puzzleBoard.destroy()
```

## Related Code Files

### Modify
- `packages/client/src/exercises/ExercisePuzzleViewer.js` -- replace board logic with shared module

### No changes needed
- `packages/client/src/exercises/ExercisePanel.js` -- call sites unchanged
- `packages/client/src/auth/StudentDashboard.js` -- call site unchanged
- `packages/client/src/lessons/lesson-player.js` -- only imports `openExercisePuzzleViewer`

## Implementation Steps

1. Add import for `InteractivePuzzleBoard` and `escapeHtml`, `uciMovesToSan` from shared modules
2. Remove `parseUciMove`, `getDestinationMap`, `_recreateBoard` functions
3. Remove `escapeHtml` local definition (use shared)
4. Update `convertExercisePuzzle` to include `rawMoves` in return object
5. In `_openViewer`: replace Chessground init block (L234-264) with `InteractivePuzzleBoard` construction
6. Replace `_autoPlayOpponent` call with reliance on `puzzleBoard.init()`
7. Replace `_handleMove` with callbacks passed to constructor
8. Update flip handler to use `puzzleBoard.flip()`
9. Update hint handler to use `puzzleBoard.getExpectedMove()`
10. Update solution button to use `puzzle.solutionLine` (already available, no change needed)
11. Update close/navigate to call `puzzleBoard.destroy()`
12. Verify `state.isComplete` is still set correctly via `onPuzzleComplete` callback
13. Run manual test: open viewer, solve puzzle, wrong move, hint, solution, flip, navigate, grade

## Todo
- [ ] Replace imports
- [ ] Remove duplicated functions
- [ ] Wire InteractivePuzzleBoard with callbacks
- [ ] Update flip/hint/close handlers
- [ ] Preserve rawMoves in convertExercisePuzzle
- [ ] Manual test all viewer modes (view, grade)
- [ ] Verify keyboard shortcuts still work (C/X for grading)

## Success Criteria
- File under 400 LOC (target ~350)
- No `Chessground` import remaining in this file
- No `chess.js` direct usage for move validation (only in convertExercisePuzzle for SAN conversion)
- All 3 call sites work without changes
- Grading auto-save still works
- No Chessground interaction bugs (pieces selectable after multiple puzzles)

## Risk Assessment
- **Move log format**: `_logMove` tracks white/black pairs. Shared module callbacks provide SAN + index. Must map index to correct pair slot. Low risk -- logic is straightforward.
- **`convertExercisePuzzle` still uses chess.js**: This is fine -- it converts UCI to SAN for display. The shared module handles all interactive chess.js usage.
- **Rapid navigation (prev/next)**: Must ensure `destroy()` is called before creating new `InteractivePuzzleBoard`. Current code already does this pattern.
