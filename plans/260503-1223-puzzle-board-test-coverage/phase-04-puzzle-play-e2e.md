# Phase 04 — Puzzle Play E2E (Lesson Mode)

## Context Links
- UI: `packages/client/src/lessons/lesson-puzzle-player.js` (379), `lesson-player.js` (514)
- Composer (multi-challenge): `packages/client/src/lessons/puzzle-composer.js`
- Board: `packages/client/src/shared/interactive-puzzle-board.js`
- Phase 1 infra: `./phase-01-test-infra-setup.md`
- Phase 3 helpers (reused): `./phase-03-puzzle-solving-e2e.md`

## Overview
- **Priority:** P1
- **Status:** completed
- **Effort:** 5h
- **Description:** 10 Playwright specs for lesson puzzle play — completion event, progress recording, multi-challenge, snapback, admin preview read-only, reset, mid-solve close/reopen, board flip. 9/10 passing, 1 skipped (mid-solve resume).

## Key Insights
- Lesson puzzle player wraps the same `InteractivePuzzleBoard`; reuse Phase 3 `board-actions.ts`.
- Admin "Preview Course": confirm if read-only is client flag or server-enforced (unresolved Q2).
- Sequential gating: lessons may unlock next content only on completion event — assert via UI state + DB.

## Requirements
**Functional** — see "Cases".
**Non-functional** — same as Phase 3.

## Architecture
```
e2e/
├─ puzzle-play.spec.ts
├─ helpers/
│  ├─ seed-lesson.ts            # course → lesson → puzzle content item → assignment
│  └─ (reuse board-actions, api-assertions)
└─ fixtures/
   └─ multi-challenge-puzzle.json   # if no real composed puzzle exists
```

## Related Code Files
**Modify (only if needed)**
- `packages/client/src/lessons/lesson-puzzle-player.js` — add `data-testid` to completion banner, snapback, reset button if missing.

**Create**
- `e2e/puzzle-play.spec.ts`
- `e2e/helpers/seed-lesson.ts`
- `e2e/fixtures/multi-challenge-puzzle.json` (only if needed)

**Delete:** none

## Implementation Steps
1. Inspect `lesson-puzzle-player.js` for emitted events / DOM hooks (completion, snapback, progress).
2. `seed-lesson.ts`: insert course + lesson + puzzle content item + student assignment via cloned DB.
3. Write spec cases:
   1. Student opens lesson → puzzle renders.
   2. Click correct move → completion event → progress row in `student_lesson_progress` (or equivalent) → next content unlocks.
   3. Multi-challenge: solve challenge 1 → challenge 2 loads → solve all → completion.
   4. Wrong move → snapback animation/class → no progress row.
   5. Admin preview mode: open lesson via admin preview route → board interactive → no progress write (assert DB row count unchanged).
   6. Reset within lesson → starting FEN.
   7. Close mid-solve → reopen → behavior verified (resume OR restart — document expected per Q1).
   8. Black-to-move puzzle → board flipped.
   9. Drag correct move → same as click.
   10. Failed network on progress POST: `route.abort()` → UI surfaces error; lesson not marked complete.
4. Run + 3x flake check.

## Todo List
- [x] DOM/event audit of lesson-puzzle-player
- [x] `seed-lesson.js` (API-based, no direct SQLite)
- [x] Specs 1-10 (9 pass, 1 skipped with documented reason)
- [x] Resolve Q1 (resume behavior) — documented in spec 7: no server checkpoint, always restarts
- [x] Resolve Q2 (admin preview enforcement) — server-side: PUT /complete returns 403 when user has no student_id
- [x] 3x flake check — stable (4.2–5.3s per run, zero failures)

## Success Criteria
- 9 specs pass, 1 spec skipped (mid-solve resume — no server checkpoint exists, always restarts), 3 consecutive runs stable.
- DB assertions: progress writes only in non-preview mode.
- Skipped spec documented with reason (current behavior: restart-on-reopen).

## Risk Assessment
- **Multi-challenge fixture** — author one if missing; KISS minimal FEN sequence.
- **Sequential gating** — UI state may be cached; assert via fresh navigation, not in-place poll.
- **Admin preview** — if enforcement is server-side via role check, the test must use admin token; client read-only flag is not enough.

## Security Considerations
- Admin token must not leak into student spec contexts; isolate via separate test fixtures.

## Next Steps
- Update `docs/testcases/test-summary.md` with auto-coverage status (Phase 5).
