# TC-PSL-009: Multi-Puzzle Exercise Navigation

**UC:** [UC-PSL-009](../../usecases/puzzle-solving/UC-PSL-009-multi-puzzle-exercise-navigation.md)
**Module:** puzzle-solving | **Last Updated:** 2026-05-03

---

## TC-PSL-009-01: Next puzzle loads after completing current

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §9
- **Precondition:**
  - Exercise with 3 puzzles; student on puzzle 1
- **Steps:**
  1. Complete puzzle 1 correctly
  2. Assert "Next Puzzle" button active
  3. Click Next
  4. Assert board loads puzzle 2 FEN
  5. Assert progress indicator shows "2 of 3"
- **Expected Result:**
  - Puzzle 2 board rendered; indicator updated; puzzle 1 marked solved
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-009-02: Previous puzzle shown read-only after solve

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §9
- **Precondition:**
  - Student has completed puzzle 1, now on puzzle 2
- **Steps:**
  1. Click "Previous" button
  2. Assert board loads puzzle 1 position (solved state)
  3. Attempt to click a piece
  4. Assert board non-interactive
- **Expected Result:**
  - Solved puzzle shown read-only; no new moves accepted
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-009-03: Skip unsolved puzzle — allowed, stays unsolved

- **Type:** Boundary
- **Priority:** P2
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §9
- **Precondition:**
  - Exercise with 2 puzzles; puzzle 1 unsolved
- **Steps:**
  1. Without solving puzzle 1, click "Next" (if available) or navigate directly to puzzle 2
  2. Assert puzzle 2 loads and is interactive
  3. Return to puzzle 1; assert it remains unsolved and interactive
- **Expected Result:**
  - Navigation between puzzles allowed; unsolved puzzles remain interactive
- **Actual Result:** __ fill on execution __
- **Status:** Pending
