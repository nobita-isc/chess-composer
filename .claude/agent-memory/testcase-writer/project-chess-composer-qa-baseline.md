---
name: chess_composer QA baseline — LSN + WEX + PSL + PPL modules
description: QA documentation covering 4 modules: lessons, weekly-exercises, puzzle-solving, puzzle-play — UCs, TCs, and test-summary all bootstrapped
type: project
---

UC and TC baseline written 2026-05-03 for four modules.

**Why:** Bootstrap QA docs from scratch; no prior usecases/ or testcases/ existed. PSL/PPL added in Phase 5 for puzzle board coverage.

**How to apply:** When adding new features, extend existing UC/TC files rather than creating new modules. Check Notable Gaps section in test-summary.md before writing auth-related TCs.

## Module inventory (as of 2026-05-03)
- LSN (lessons): 10 UCs, 10 TC files, 27 TCs
- WEX (weekly-exercises): 15 UCs, 15 TC files, 40 TCs
- PSL (puzzle-solving): 10 UCs, 10 TC files, 26 TCs
- PPL (puzzle-play): 8 UCs, 8 TC files, 21 TCs
- Total: 43 UCs, 43 TC files, 114 TCs

## TC automation split
- PSL: `e2e/puzzle-solving.spec.ts` covers most; manual-only = snapback timing, promotion dismiss, token-expiry UX
- PPL: `e2e/puzzle-play.spec.ts` covers most; manual-only = animation timing, board flip visual verification

## Open questions in PSL/PPL
- Score aggregation formula for multi-challenge puzzles (PPL-003-03) not confirmed — assumed average
- Snapback duration threshold for input-blocking (PSL-005-03) not spec'd — baseline 500ms
- Server-side preview flag enforcement (PPL-005-03) — assumed JWT role claim authoritative

## Auth gaps found in WEX (resolved 2026-05-03)
- `POST /api/exercises` — now requires admin role
- `POST /api/exercises/:id/assign` — now requires admin role
- `DELETE /api/exercises/:id` — now requires admin role
- `PUT /api/student-exercises/:id/grade` — now requires admin role
- `GET /api/exercises/:id/pdf` — gated by authRequired() only (intentional; students need download access)
