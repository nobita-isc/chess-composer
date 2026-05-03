# TC-PPL-006: Reset Within Lesson Context

**UC:** [UC-PPL-006](../../usecases/puzzle-play/UC-PPL-006-reset-within-lesson-context.md)
**Module:** puzzle-play | **Last Updated:** 2026-05-03

---

## TC-PPL-006-01: Reset restores starting position, no API call

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §6
- **Precondition:**
  - Lesson puzzle open; student has made 1 correct move (mid-solve)
- **Steps:**
  1. Make one correct move; assert board advanced
  2. Monitor network
  3. Click "Reset" button
  4. Assert board FEN restored to initial puzzle position
  5. Assert no API call made on reset
  6. Assert board remains interactive
- **Expected Result:**
  - Board at starting position; no backend write; student can retry
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PPL-006-02: Reset on already-solved puzzle — stays in review mode

- **Type:** Boundary
- **Priority:** P2
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §6
- **Precondition:**
  - Puzzle already completed by student
- **Steps:**
  1. Navigate to solved puzzle
  2. Click "Reset" (if button present in review mode)
  3. Assert board shows starting position
  4. Assert board remains non-interactive (review only)
  5. Assert no new attempt API call
- **Expected Result:**
  - Reset in review mode shows starting position but does not re-enable solving
- **Actual Result:** __ fill on execution __
- **Status:** Pending
