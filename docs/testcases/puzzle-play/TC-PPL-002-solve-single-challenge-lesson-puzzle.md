# TC-PPL-002: Solve Single-Challenge Lesson Puzzle

**UC:** [UC-PPL-002](../../usecases/puzzle-play/UC-PPL-002-solve-single-challenge-lesson-puzzle.md)
**Module:** puzzle-play | **Last Updated:** 2026-05-03

---

## TC-PPL-002-01: Complete single-challenge puzzle — completion persisted

- **Type:** Functional
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §2
- **Precondition:**
  - Student authenticated; single-challenge lesson puzzle open; 0 prior attempts
- **Steps:**
  1. Play all correct moves in solution line
  2. Assert success banner shown
  3. Intercept `POST /api/lesson-puzzle-attempts`
  4. Assert payload: `{ completed: true, score: 100, attempts: 0, hints: 0 }`
  5. Revisit puzzle; assert solved state shown
- **Expected Result:**
  - Completion record created; puzzle shows solved on revisit
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PPL-002-02: Revisit solved puzzle — read-only, score not overwritten

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §2
- **Precondition:**
  - Puzzle already solved with score=80
- **Steps:**
  1. Navigate to the solved puzzle
  2. Assert board shown in read-only/review mode
  3. Assert no interactive input accepted
  4. Assert no API write call made
  5. Assert stored score remains 80
- **Expected Result:**
  - Read-only board; original score preserved; no re-submission possible
- **Actual Result:** __ fill on execution __
- **Status:** Pending
