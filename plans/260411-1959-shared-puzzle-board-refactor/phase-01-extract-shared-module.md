# Phase 1: Extract Shared Interactive Puzzle Board Module

## Context
- [ExercisePuzzleViewer.js](../../packages/client/src/exercises/ExercisePuzzleViewer.js) - lines 22-76, 379-470
- [PuzzlePlayer.js](../../packages/client/src/exercises/PuzzlePlayer.js) - lines 13-37, 687-931
- [lesson-puzzle-player.js](../../packages/client/src/lessons/lesson-puzzle-player.js) - lines 16-23, 117-243
- [Chessground API](https://github.com/lichess-org/chessground)

## Overview
- **Priority**: P1 (blocks all other phases)
- **Status**: pending
- **Effort**: 3h

Extract duplicated board interaction logic into two new files:
1. `packages/client/src/shared/chess-puzzle-utils.js` - pure utility functions
2. `packages/client/src/shared/interactive-puzzle-board.js` - Chessground lifecycle + puzzle interaction

## Key Insights

### Chessground `set()` Corruption Bug
- After multiple `set()` calls, Chessground's internal DOM event handlers lose track of piece elements
- Pieces become visually correct but unselectable/undraggable
- **PuzzlePlayer** avoids this by using minimal `set()` calls + `boardInstance.move()` for animation
- **ExercisePuzzleViewer** works around it with `_recreateBoard()` (full destroy+recreate)
- **lesson-puzzle-player** uses `dests: new Map()` to disable, then full `set()` to re-enable

### Recommended Strategy for Shared Module
Use PuzzlePlayer's pattern as the foundation (minimal `set()` + `move()` for animation) because:
- It's the cleanest approach (no destroy/recreate overhead)
- `boardInstance.move(from, to)` provides smooth animation
- After opponent move, only update `fen`, `lastMove`, `check`, `movable.dests`, `movable.color`
- For wrong moves: undo in chess.js, then `set({ fen, turnColor, movable: { color, dests } })`

If the minimal `set()` pattern still causes corruption in ExercisePuzzleViewer's modal context (due to rapid open/close cycles), add a `recreateBoard()` escape hatch method.

### Three Different Move Validation Approaches
| File | Validation | Format |
|------|-----------|--------|
| ExercisePuzzleViewer | Compare `move.san === expectedSAN` | SAN (pre-converted from UCI) |
| PuzzlePlayer | Compare `move.from === expected.from && move.to === expected.to` | UCI directly |
| lesson-puzzle-player | Compare `result.san === moveData.move` | SAN (from hints structure) |

**Decision**: Shared module validates via UCI comparison (from/to/promotion). This is the most reliable -- SAN can be ambiguous with promotion. Consumers that need SAN comparison (lesson-puzzle-player's hints) can convert.

## Requirements

### Functional
- Initialize Chessground with puzzle FEN and correct orientation
- Play opponent's first move (auto-play with configurable delay)
- Accept player moves, validate against solution line
- On correct move: advance index, play opponent response
- On wrong move: undo, restore board, notify consumer
- On puzzle complete: disable board, notify consumer
- Support puzzle reset
- Support board flip

### Non-Functional
- No UI rendering (consumers own their DOM)
- No inline styles or CSS
- Pure board interaction logic
- Immutable state updates (per coding standards)
- Under 200 LOC per file

## Architecture

### chess-puzzle-utils.js (~60 LOC)
Pure functions, no Chessground dependency:

```javascript
/**
 * Parse UCI move string to {from, to, promotion}
 * @param {string} uci - e.g. "e2e4", "e7e8q"
 * @returns {{from: string, to: string, promotion?: string} | null}
 */
export function parseUciMove(uci) { ... }

/**
 * Get legal moves as Map<from, to[]> for Chessground dests config
 * @param {Chess} chess - chess.js instance
 * @returns {Map<string, string[]>}
 */
export function getLegalMoves(chess) { ... }

/**
 * Convert UCI move array to SAN array using chess.js
 * @param {string} fen - starting FEN
 * @param {string[]} uciMoves - array of UCI strings
 * @returns {string[]} SAN moves
 */
export function uciMovesToSan(fen, uciMoves) { ... }

/**
 * Escape HTML special characters
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) { ... }
```

### interactive-puzzle-board.js (~180 LOC)
Class that manages Chessground + chess.js interaction:

```javascript
import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import { parseUciMove, getLegalMoves } from './chess-puzzle-utils.js'

/**
 * @typedef {Object} PuzzleBoardConfig
 * @property {string} fen - Starting FEN
 * @property {string[]} solutionMoves - UCI move strings (full solution line)
 * @property {HTMLElement} boardEl - DOM element for Chessground
 * @property {number} [opponentMoveDelay=500] - ms delay before auto-play
 * @property {number} [animationDuration=200] - ms for move animation
 * @property {Function} [onCorrectMove] - (moveSan, moveIndex) => void
 * @property {Function} [onWrongMove] - (attemptedSan, expectedUci) => void
 * @property {Function} [onOpponentMove] - (moveSan, moveIndex) => void
 * @property {Function} [onPuzzleComplete] - () => void
 * @property {Function} [onBoardUpdate] - (fen, chess) => void
 */

export class InteractivePuzzleBoard {
  constructor(config) { ... }

  /** Initialize board and auto-play opponent's first move */
  init() { ... }

  /** Destroy Chessground instance and clean up */
  destroy() { ... }

  /** Reset puzzle to initial state */
  reset() { ... }

  /** Flip board orientation */
  flip() { ... }

  /** Get current state (read-only snapshot) */
  getState() {
    return {
      fen: this._chess.fen(),
      currentMoveIndex: this._moveIndex,
      isComplete: this._isComplete,
      playerColor: this._playerColor,
      orientation: this._orientation,
      totalMoves: this._solutionMoves.length
    }
  }

  /** Get the expected next move (for hints) */
  getExpectedMove() { ... }

  /** Get the Chessground instance (for setAutoShapes, etc.) */
  getBoard() { return this._board }

  // Private methods
  _createBoard() { ... }
  _handlePlayerMove(from, to) { ... }
  _playOpponentMove() { ... }
  _enablePlayerMoves() { ... }
  _disableBoard() { ... }
}
```

### Internal State (immutable pattern via getState())
```javascript
// Internal mutable state (encapsulated)
this._chess = new Chess(config.fen)
this._board = null           // Chessground instance
this._boardEl = config.boardEl
this._solutionMoves = config.solutionMoves
this._moveIndex = 0
this._isComplete = false
this._playerColor = null     // 'w' or 'b' (after opponent first move)
this._orientation = null     // 'white' or 'black'
this._config = config

// External access only via getState() (immutable snapshot)
```

### Move Flow
```
init()
  -> play opponent's first move (solutionMoves[0])
  -> _moveIndex = 1
  -> _enablePlayerMoves()
  -> onOpponentMove(san, 0)

_handlePlayerMove(from, to)
  -> chess.move({from, to, promotion: 'q'})
  -> compare from/to against solutionMoves[_moveIndex]
  -> IF correct:
      -> _moveIndex++
      -> update board (fen, lastMove, check)
      -> onCorrectMove(san, index)
      -> IF _moveIndex >= solutionMoves.length:
          -> _isComplete = true, _disableBoard(), onPuzzleComplete()
      -> ELSE:
          -> setTimeout(_playOpponentMove, delay)
  -> IF wrong:
      -> chess.undo()
      -> restore board state
      -> onWrongMove(attemptedSan, expectedUci)

_playOpponentMove()
  -> parse solutionMoves[_moveIndex]
  -> chess.move(parsed)
  -> _moveIndex++
  -> board.move(from, to)  // animate
  -> board.set({fen, lastMove, check, movable})
  -> onOpponentMove(san, index)
  -> IF _moveIndex >= solutionMoves.length:
      -> _isComplete = true, _disableBoard(), onPuzzleComplete()
  -> ELSE:
      -> _enablePlayerMoves()
```

## Related Code Files

### Create
- `packages/client/src/shared/chess-puzzle-utils.js` (NEW, ~60 LOC)
- `packages/client/src/shared/interactive-puzzle-board.js` (NEW, ~180 LOC)

### No modifications in this phase
Consumers are refactored in phases 2-4.

## Implementation Steps

1. Create `chess-puzzle-utils.js` with `parseUciMove`, `getLegalMoves`, `uciMovesToSan`, `escapeHtml`
2. Write unit tests for all utility functions (pure functions, easy to test)
3. Create `InteractivePuzzleBoard` class skeleton with constructor + `init()` + `destroy()`
4. Implement `_createBoard()` -- Chessground initialization with proper config
5. Implement `_handlePlayerMove()` -- move validation using UCI comparison
6. Implement `_playOpponentMove()` -- auto-play with `board.move()` animation + `set()` update
7. Implement `_enablePlayerMoves()` and `_disableBoard()` helper methods
8. Implement `reset()` and `flip()` public methods
9. Implement `getState()` and `getExpectedMove()` accessors
10. Add JSDoc for all public methods

## Todo
- [ ] Create `chess-puzzle-utils.js`
- [ ] Create `interactive-puzzle-board.js`
- [ ] Unit tests for utility functions
- [ ] Verify `board.move()` + minimal `set()` pattern works cleanly
- [ ] Verify promotion handling (auto-queen `'q'` vs explicit)
- [ ] Document callback signatures

## Success Criteria
- Both files under 200 LOC
- Zero Chessground-specific code remains to duplicate in consumers
- All callbacks fire at correct times with correct arguments
- Board interaction works without corruption after 10+ sequential puzzles
- `getState()` returns immutable snapshot

## Risk Assessment
- **Chessground `set()` corruption in modal context**: Mitigate by testing in ExercisePuzzleViewer's rapid open/close scenario. If needed, expose `recreateBoard()` method.
- **Promotion handling**: Currently all 3 files auto-promote to queen. Shared module does the same. If explicit promotion UI is needed later, add optional `promotionHandler` callback.
- **lesson-puzzle-player uses SAN-based solution**: Its `moveSequence` array has `{move: SAN, role, hint, explanation}`. Phase 4 must handle SAN-to-UCI conversion or the shared module needs a SAN validation mode. **Decision**: lesson-puzzle-player will pre-convert its SAN moves to UCI in a wrapper, keeping the shared module UCI-only.

## Security Considerations
- No user input reaches the database from these modules
- FEN strings are parsed by chess.js (validated internally)
- escapeHtml prevents XSS in any consumer that renders move text
