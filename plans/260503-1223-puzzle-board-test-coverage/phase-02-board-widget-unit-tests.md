# Phase 02 — Board Widget Unit Tests (jsdom)

## Context Links
- Widget: `packages/client/src/shared/interactive-puzzle-board.js` (258 lines)
- Helpers: `packages/client/src/shared/chess-puzzle-utils.js`
- Phase 1 (jsdom env): `./phase-01-test-infra-setup.md`

## Overview
- **Priority:** P2
- **Status:** completed
- **Effort:** 3h
- **Description:** Vitest+jsdom tests for `InteractivePuzzleBoard` and helpers — fast feedback layer below Playwright.

## Key Insights
- Board widget is vanilla JS, attaches to a DOM container, uses chess.js for legality.
- Click flow: square1 (own piece) → highlights + dots; square2 (legal target) → invokes `onMove`. Second click on same piece deselects.
- Drag flow may be HTML5 drag OR pointer-based — inspect before testing (jsdom has limited drag support; for drag use pointer events; reserve full drag testing for Playwright Phase 3/4).

## Requirements
**Functional**
- Cover: instantiate, render, click selection, legal move highlight, click move dispatch, illegal click reject, deselect, board flip when black-to-move, FEN re-render after `setPosition`.
- Cover all exported helpers in `chess-puzzle-utils.js`: FEN parse, side-to-move detect, SAN/UCI conversion.

**Non-functional**
- Each test file ≤200 lines (split if needed). Run in <5s.

## Architecture
```
packages/client/tests/
├─ interactive-puzzle-board.test.js
├─ chess-puzzle-utils.test.js
└─ helpers/
   └─ make-board.js           # builds DOM container + instantiates widget
```
Use `// @vitest-environment jsdom` header per file.

## Related Code Files
**Modify:** none (read-only of widget)
**Create**
- `packages/client/tests/interactive-puzzle-board.test.js`
- `packages/client/tests/chess-puzzle-utils.test.js`
- `packages/client/tests/helpers/make-board.js`

**Delete:** none

## Implementation Steps
1. Read `interactive-puzzle-board.js` end-to-end; catalog exports + DOM contract (container class, square data attrs).
2. Write `helpers/make-board.js`: builds `<div id="board">`, instantiates widget with FEN + `onMove` spy.
3. Cover helpers: each pure function in `chess-puzzle-utils.js` with happy + edge cases.
4. Cover widget:
   - renders 64 squares with correct colors
   - click own piece → CSS class for selection added; legal-target dots rendered with count = chess.js move count
   - click legal target → `onMove({ from, to })` called once with correct UCI
   - click illegal target → `onMove` not called; selection cleared
   - click own piece twice → deselected
   - black-to-move FEN → board orientation flipped (assert square[0,0] = a8)
   - `setPosition(newFen)` → board re-renders
5. Run `npm test` (Vitest); confirm jsdom project picks these up.

## Todo List
- [x] `helpers/make-board.js`
- [x] `chess-puzzle-utils.test.js` covers all exports
- [x] `interactive-puzzle-board.test.js`: render
- [x] click selection / player move dispatch
- [x] legal move dispatch (correct + onPuzzleComplete)
- [x] illegal rejection (onWrongMove + no side effects)
- [x] multi-step: opponent response + final completion
- [x] flip() orientation toggle
- [x] destroy() / reset() lifecycle
- [x] All green via `npm test` (595+ tests; 62 new unit tests added, 95% widget coverage achieved)

## Success Criteria
- ≥15 unit tests passing in <5s.
- ≥80% line coverage of `interactive-puzzle-board.js` and `chess-puzzle-utils.js` (verify via `vitest --coverage`).

## Risk Assessment
- jsdom no real layout — any pixel/drag-by-coords logic untestable here; defer to Playwright.
- Widget may rely on `requestAnimationFrame` — jsdom polyfills it; verify.

## Security Considerations
- N/A (pure DOM unit tests).

## Next Steps
- Findings (e.g., undocumented widget API) feed Phase 3/4 e2e selectors.
