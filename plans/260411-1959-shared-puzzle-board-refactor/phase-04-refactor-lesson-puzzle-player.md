# Phase 4: Refactor lesson-puzzle-player to Use Shared Module

## Context
- [lesson-puzzle-player.js](../../packages/client/src/lessons/lesson-puzzle-player.js) (387 LOC)
- [interactive-puzzle-board.js](../../packages/client/src/shared/interactive-puzzle-board.js) (from Phase 1)
- [chess-puzzle-utils.js](../../packages/client/src/shared/chess-puzzle-utils.js) (from Phase 1)
- Call site: [lesson-player.js L135](../../packages/client/src/lessons/lesson-player.js)

## Overview
- **Priority**: P2
- **Status**: pending
- **Effort**: 1h
- **Blocked by**: Phase 1

Replace board interaction logic in lesson-puzzle-player with shared module. This file is the smallest (387 LOC) and most self-contained.

## Key Insights

### Unique Characteristics vs Other Two Files
1. **SAN-based move sequence** -- `moveSequence[].move` is SAN, not UCI. Must convert to UCI for shared module.
2. **Two roles per move** -- `{move, role: 'student'|'computer', hint, explanation}`. Shared module doesn't distinguish roles; it alternates player/opponent automatically.
3. **No opponent first move** -- Player moves first (playerColor = chess.turn() from initial FEN). The shared module auto-plays `solutionMoves[0]` as opponent. lesson-puzzle-player needs to skip this.
4. **Inline styles everywhere** -- All HTML uses inline `style=""`. No CSS classes for board interaction.
5. **Full-screen layout** -- Not a modal overlay; fills entire viewport.

### Adaptation Strategy

The core difference: lesson-puzzle-player's move sequence starts with the student's move, while the shared module expects solutionMoves[0] to be the opponent's first move.

**Solution**: Prepend a "no-op" or configure the shared module to skip opponent first move.

Better approach: Add an `opponentMovesFirst` config option to `InteractivePuzzleBoard`:
- `opponentMovesFirst: true` (default) -- plays solutionMoves[0] as opponent, player starts at index 1
- `opponentMovesFirst: false` -- player moves first at index 0, opponent plays index 1

This is a small addition to Phase 1 (~10 lines in the shared module).

### SAN-to-UCI Conversion
lesson-puzzle-player gets moves as SAN (from hints structure). Must convert to UCI for the shared module:

```javascript
function sanMovesToUci(fen, sanMoves) {
  const chess = new Chess(fen)
  const uciMoves = []
  for (const san of sanMoves) {
    try {
      const move = chess.move(san)
      if (move) {
        const uci = move.from + move.to + (move.promotion || '')
        uciMoves.push(uci)
      }
    } catch { break }
  }
  return uciMoves
}
```

This helper belongs in `chess-puzzle-utils.js` (add in Phase 1 or here).

### What Gets Removed (~80 LOC)
- `getLegalMoves()` (L16-23) -- use shared
- `escapeHtml()` (L10-13) -- use shared
- `handleStudentMove()` (L117-153) -- shared module handles
- `playComputerMoves()` (L156-193) -- shared module handles
- `enableStudentMove()` (L195-206) -- shared module handles
- `updateBoard()` (L208-214) -- shared module handles
- `completePuzzle()` (L216-223) -- via onPuzzleComplete callback
- `resetPuzzle()` board reset logic (L225-243) -- use `puzzleBoard.reset()`

### What Stays (~250 LOC)
- `openLessonPuzzlePlayer()` entry point + params destructuring
- Puzzle data parsing (hints, move sequence construction)
- `buildPlayerHTML()` -- full-screen layout with inline styles
- `showFeedback()`, `clearFeedback()` -- timeline-style feedback entries
- `revealHint()` -- hint display in timeline
- `openVideo()` -- external video link
- `updateProgressBar()` -- challenge progress
- Event wiring (back, hint, video, prev, next, reset)
- Close/cleanup

### Estimated Result
~300 LOC (down from 387). Within 200-400 range.

## Requirements

### Functional
- All existing behavior preserved: solve puzzles, hints, video, progress, navigation
- Per-move explanations displayed on correct/computer moves
- Reset returns to initial state
- Prev/next navigation between challenges

### Non-Functional
- Public API unchanged: `openLessonPuzzlePlayer({ item, courseTitle, ... })`
- Dark theme (chess.com-style) preserved -- all inline styles stay
- Full-screen layout preserved

## Architecture

### Integration Pattern

```javascript
import { InteractivePuzzleBoard } from '../shared/interactive-puzzle-board.js'
import { escapeHtml, sanMovesToUci } from '../shared/chess-puzzle-utils.js'

export function openLessonPuzzlePlayer({ item, courseTitle, ... }) {
  // Parse puzzle data (existing logic)
  let moveSequence = /* ... parse hints/moves ... */

  // Convert SAN moves to UCI for shared module
  const sanMoves = moveSequence.map(m => m.move)
  const uciMoves = sanMovesToUci(item.puzzle_fen, sanMoves)

  // Build overlay HTML (existing buildPlayerHTML)
  // ...

  // Create shared board
  const boardEl = overlay.querySelector('#lpp-board')
  const puzzleBoard = new InteractivePuzzleBoard({
    fen: item.puzzle_fen,
    solutionMoves: uciMoves,
    boardEl,
    opponentMovesFirst: false,  // Player moves first in lesson puzzles
    opponentMoveDelay: 600,
    onCorrectMove: (san, moveIdx) => {
      const moveData = moveSequence[moveIdx]
      showFeedback('correct', moveData?.explanation || 'Correct!')
    },
    onWrongMove: (attemptedSan) => {
      showFeedback('wrong', 'Not quite. Try again!')
    },
    onOpponentMove: (san, moveIdx) => {
      const moveData = moveSequence[moveIdx]
      showFeedback('computer', moveData?.explanation || `Computer plays ${san}`)
    },
    onPuzzleComplete: () => {
      solved = true
      const allDone = (solvedCount + 1) >= totalChallenges
      showFeedback('complete', allDone ? 'All Challenges Complete!' : `Challenge Complete!`)
      updateProgressBar()
      onComplete?.()
    }
  })

  puzzleBoard.init()

  // Reset handler
  overlay.querySelector('#lpp-reset')?.addEventListener('click', () => {
    solved = false
    hintRevealed = false
    clearFeedback()
    puzzleBoard.reset()
  })

  // Close handler
  const close = () => {
    puzzleBoard.destroy()
    document.body.style.overflow = ''
    overlay.remove()
    onClose?.()
  }
}
```

### Hint Integration

```javascript
function revealHint() {
  if (solved || hintRevealed) return
  const boardState = puzzleBoard.getState()
  const moveData = moveSequence[boardState.currentMoveIndex]
  if (!moveData?.hint) return
  hintRevealed = true
  showFeedback('hint', moveData.hint)  // add 'hint' type to showFeedback
}
```

### Move Index Mapping
Shared module's `moveIndex` maps directly to `moveSequence` array index because:
- `opponentMovesFirst: false` means index 0 = student move
- Sequence alternates: student(0), computer(1), student(2), computer(3)...
- Callbacks receive the moveIndex matching the moveSequence position

## Related Code Files

### Modify
- `packages/client/src/lessons/lesson-puzzle-player.js` -- replace board logic with shared module
- `packages/client/src/shared/chess-puzzle-utils.js` -- add `sanMovesToUci()` if not added in Phase 1

### No changes needed
- `packages/client/src/lessons/lesson-player.js` -- call site unchanged

## Implementation Steps

1. Add `sanMovesToUci()` to `chess-puzzle-utils.js` (if not already there from Phase 1)
2. Add import for `InteractivePuzzleBoard`, `escapeHtml`, `sanMovesToUci` from shared modules
3. Remove local `getLegalMoves()`, `escapeHtml()` functions
4. Remove `handleStudentMove()`, `playComputerMoves()`, `enableStudentMove()`, `updateBoard()`, `completePuzzle()` functions
5. Add SAN-to-UCI conversion after move sequence parsing
6. Replace Chessground init (L91-105) with `InteractivePuzzleBoard` construction
7. Wire callbacks for correct/wrong/opponent/complete with existing feedback functions
8. Update `resetPuzzle()` to use `puzzleBoard.reset()` + clear local state
9. Update `revealHint()` to use `puzzleBoard.getState().currentMoveIndex`
10. Update close handler to use `puzzleBoard.destroy()`
11. Add `opponentMovesFirst: false` support to shared module if not done in Phase 1

## Todo
- [ ] Ensure `sanMovesToUci` exists in shared utils
- [ ] Ensure `opponentMovesFirst` option exists in shared module
- [ ] Replace imports
- [ ] Remove duplicated functions
- [ ] Wire InteractivePuzzleBoard with lesson-specific callbacks
- [ ] Update reset/hint/close handlers
- [ ] Test: solve puzzle with hints
- [ ] Test: wrong move, retry
- [ ] Test: reset mid-puzzle
- [ ] Test: prev/next navigation between challenges
- [ ] Test: video button

## Success Criteria
- File under 350 LOC (target ~300)
- No `Chessground` import remaining
- No direct chess.js move handling (only for SAN-to-UCI conversion setup)
- Full-screen dark theme layout unchanged
- All callbacks fire with correct moveSequence data (hints, explanations)
- Puzzle reset works cleanly

## Risk Assessment
- **`opponentMovesFirst: false` in shared module**: This is a new config option. Must be designed carefully in Phase 1 to avoid breaking the default (opponent-first) behavior used by the other two consumers. Low risk -- it's a simple conditional on whether to auto-play move[0].
- **Move index alignment**: With `opponentMovesFirst: false`, the shared module's internal `_moveIndex` should align 1:1 with `moveSequence` indices. Must verify with a puzzle that has 4+ moves.
- **SAN ambiguity in conversion**: Rare edge case where SAN could be ambiguous. chess.js handles this correctly since it plays moves sequentially from the starting FEN. No risk in practice.

## Security Considerations
- No user input reaches server from this module
- `escapeHtml` from shared utils prevents XSS in course title, instructions, hints
- Video URL validated with regex before `window.open()` (existing behavior preserved)
