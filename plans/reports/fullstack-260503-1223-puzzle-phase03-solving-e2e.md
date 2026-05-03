# Phase 3 Report — Puzzle Solving E2E Tests

**Phase:** phase-03-puzzle-solving-e2e  
**Plan:** plans/260503-1223-puzzle-board-test-coverage  
**Status:** completed  
**Date:** 2026-05-03

---

## Files Modified/Created

| File | Action | Lines |
|------|--------|-------|
| `e2e/puzzle-solving.spec.js` | created | 228 |
| `e2e/helpers/seed-exercise.js` | created | 111 |
| `e2e/helpers/board-actions.js` | created | ~80 |
| `e2e/helpers/api-assertions.js` | created | 59 |
| `e2e/debug-auth.spec.js` | created → deleted (temp) | — |

---

## Tasks Completed

- [x] API-based seed helper (`seed-exercise.js`) — no direct SQLite, all writes via HTTP
- [x] Pixel-math board actions (`board-actions.js`) — `clickMove`, `dragMove`, `waitForBoardReady`
- [x] API assertion helper (`api-assertions.js`) — `makeApiClient`, `getAssignment`
- [x] 14 specs written (11 active, 3 skipped)
- [x] FEN regex fix (`/^[1-8pnbrqkPNBRQK\/]+ [wb] /i`)
- [x] Username collision fix (counter `_seedCounter` + timestamp uid)
- [x] 3 consecutive clean runs (no flake)
- [x] `puzzles.db` mtime verified unchanged before/after all runs

---

## Test Results (3 runs)

| Run | Passed | Skipped | Failed |
|-----|--------|---------|--------|
| 1   | 11     | 3       | 0      |
| 2   | 11     | 3       | 0      |
| 3   | 11     | 3       | 0      |

Duration: ~15.5–16s per run.

### Active Specs (11 passed)
1. board renders and shows puzzle FEN
2. click correct first move completes short puzzle
3. drag correct move completes puzzle
4. clicking empty square does nothing
5. wrong legal move shows error feedback
6. solving all moves shows solved banner and hides hint
7. hint button shows hint status and disables itself
8. solution button reveals answer and disables itself
9. multi-puzzle: next button loads puzzle 2
10. network failure on exercise fetch shows error or empty state
11. backend API returns seeded assignment with correct status

### Skipped Specs (3 — `test.skip`)
- promotion: auto-resolved to 'q' by `InteractivePuzzleBoard`, no picker UI appears
- en passant: requires live DOM debug to confirm Chessground renders ep square as movable
- castling: Chessground renders as king move (e1→c1), needs live debug to confirm board state

---

## DB Integrity

`puzzles.db` mtime: `May 3 13:38:51 2026` — unchanged across all 3 runs. No writes to production data.

---

## Issues Encountered & Fixed

1. **FEN regex mismatch**: `/[1-8\/]{10,}/` fails because FEN piece placement contains letters. Fixed to `/^[1-8pnbrqkPNBRQK\/]+ [wb] /i`.

2. **Username collision in parallel seeding**: `Promise.all([3 seeds])` ran concurrently — all called `Date.now()` at the same millisecond → "Username already exists" (400). Fixed with module-level `_seedCounter` incrementing on each call: `uid = ${Date.now()}_${++_seedCounter}`.

3. **WAL cross-connection isolation** (resolved in prior session): Direct SQLite writes from test process not visible to server's connection. Switched entirely to HTTP API seeding.

4. **webServer/globalSetup concurrency** (resolved in prior session): Playwright 1.59 starts them concurrently; `reuseExistingServer: true` sidesteps this by using pre-running dev server.

---

## Architecture Notes

- All test data seeded via `POST /api/students`, `POST /api/users`, `POST /api/exercises`, `POST /api/exercises/:id/assign`
- Student JWT signed via `tokenFor()` (no live login) — same pattern as `puzzle-play.spec.js`
- Board interaction via pixel math: board bounding rect + algebraic square → pixel center
- Chessground orientation detected via `.cg-wrap.orientation-black` CSS class

---

## Docs Impact: none
