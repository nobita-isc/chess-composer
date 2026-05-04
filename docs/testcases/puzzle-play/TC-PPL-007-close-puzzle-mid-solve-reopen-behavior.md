# TC-PPL-007: Close Puzzle Mid-Solve → Reopen Behavior

**UC:** [UC-PPL-007](../../usecases/puzzle-play/UC-PPL-007-close-puzzle-mid-solve-reopen-behavior.md)
**Module:** puzzle-play | **Last Updated:** 2026-05-03

---

## TC-PPL-007-01: Navigate away mid-solve → reopen shows starting position

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §7
- **Precondition:**
  - Lesson puzzle open; student has made 1 correct move (unsolved)
- **Steps:**
  1. Make one correct move
  2. Click a different lesson content item (navigate away)
  3. Navigate back to the puzzle content item
  4. Assert board renders at starting FEN (not mid-solve state)
  5. Assert board is interactive
- **Expected Result:**
  - Puzzle resets to start on reopen; no partial state persisted; student can solve fresh
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PPL-007-02: Reopen already-completed puzzle — shows solved state

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §7
- **Precondition:**
  - Student has previously completed this puzzle
- **Steps:**
  1. Navigate away from lesson
  2. Return to the same puzzle content item
  3. Assert board shows solved/review state
  4. Assert board non-interactive
  5. Assert completion badge/indicator shown
- **Expected Result:**
  - Completed puzzle opens in read-only review mode on reopen
- **Actual Result:** __ fill on execution __
- **Status:** Pending
