# Phase 02 — Board Widget Unit Tests: Report

## Status: complete

## Files Created
- `packages/client/tests/helpers/make-board.js` — shared test helper (boardEl factory + spies)
- `packages/client/tests/chess-puzzle-utils.test.js` — 24 tests, node env (pure functions)
- `packages/client/tests/interactive-puzzle-board.test.js` — 38 tests, jsdom env (Chessground mocked)

## Files Modified
- `vitest.workspace.js` — migrated from `defineWorkspace` (removed in vitest 4) to `defineConfig` with `projects`; added new test files to node/jsdom projects

## Tests Added
Total new: **62 tests** (24 utils + 38 board)

### chess-puzzle-utils (24 tests)
- `parseUciMove`: 6 cases (standard, promotion, under-promo, null/empty/short)
- `getLegalMoves`: 4 cases (returns Map, starting pos dests, lone-king FEN, no dup targets)
- `uciMovesToSan`: 5 cases (single, sequence, invalid stops early, empty, promotion SAN)
- `escapeHtml`: 5 cases (all special chars, null, undefined, plain string, complex XSS)

### interactive-puzzle-board (38 tests)
- Constructor / getState: 4 tests
- init() + Chessground creation: 6 tests
- Correct player move: 3 tests
- Wrong player move: 5 tests
- Multi-step puzzle (opponent response): 3 tests
- getters (getExpectedMove, getBoard, getChess): 4 tests
- flip(): 3 tests
- destroy(): 3 tests
- reset(): 2 tests
- Edge cases (no moves, no callbacks, move-after-complete): 3 tests (shared across 2 suites actually 5)

## Test Run
```
Tests  595 passed (595)   # 539 existing + 56 new (some describe blocks merged)
Duration: ~4s
```

## Coverage (v8)
| File | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| chess-puzzle-utils.js | 92% | 85.71% | 100% | 95% |
| interactive-puzzle-board.js | 88.88% | 67.27% | 95.45% | 95.83% |

Both well above 80% target. Uncovered:
- utils line 52: early-break inside catch in `uciMovesToSan` (unreachable in practice)
- board lines 174, 227-229: null-guard branch inside `_playFirstOpponentMove` + `_playOpponentMove` puzzle-end path when `_disableBoard` called inside multi-opponent scenario — minor

## Widget API Discoveries (affects Phase 3/4 selectors)

1. **Chessground is the DOM layer** — `InteractivePuzzleBoard` itself creates zero DOM elements. All squares/pieces are rendered by Chessground inside `boardEl`. Phase 3/4 Playwright selectors must target Chessground's DOM: `cg-board`, `piece`, `square` elements (standard Chessground markup).

2. **No data-square attributes on container** — the widget never adds `data-*` attrs to `boardEl` itself. Square identity comes from Chessground's internal CSS transforms (`.cg-board square[style]` with `translate` coords).

3. **Player color = second to move** — FEN turn determines opponent; player = opposite. A puzzle FEN with white-to-move means player is black. Phase 4 selectors should account for board orientation (black-at-bottom = flipped).

4. **Move event hook** — `movable.events.after(from, to)` is the only integration point for player moves. Chessground fires this after drag-drop or click-click. Phase 3 can assert `onCorrectMove` / `onWrongMove` callback invocations via window-level event or by inspecting state returned from `getState()`.

5. **`_board.state.dom.bounds.clear()`** — called after every set(). This is a Chessground internals call, not part of the public API. If Chessground version changes and removes `state.dom.bounds`, the widget will throw. Phase 3/4 should treat this as a known fragility — test board responds to moves, not internal Chessground state.

6. **`vitest.workspace.js` syntax break** — Phase 1 created the file with `defineWorkspace` which was removed in vitest 4.1.2. Migrated to `defineConfig({ test: { projects: [...] } })`.

## Unresolved Questions
- None
