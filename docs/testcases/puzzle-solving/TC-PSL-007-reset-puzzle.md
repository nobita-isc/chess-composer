# TC-PSL-007: Reset Puzzle

**UC:** [UC-PSL-007](../../usecases/puzzle-solving/UC-PSL-007-reset-puzzle.md)
**Module:** puzzle-solving | **Last Updated:** 2026-05-03

---

## TC-PSL-007-01: Reset restores starting position

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §7
- **Precondition:**
  - Puzzle open; student has made ≥1 correct move (mid-solve)
- **Steps:**
  1. Make one correct move; assert board advanced
  2. Click "Reset" button
  3. Assert board FEN matches initial puzzle FEN
  4. Assert board is interactive again
- **Expected Result:**
  - Board restored to starting position; student can attempt again
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-007-02: Reset does not erase already-persisted wrong/hint counts

- **Type:** Functional
- **Priority:** P2
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §7
- **Precondition:**
  - Student made 2 wrong moves then clicked Reset
- **Steps:**
  1. Make 2 wrong moves (counters = 2)
  2. Click Reset
  3. Complete puzzle correctly
  4. Assert API payload `attempts` ≥ 2 (not zeroed by reset)
- **Expected Result:**
  - Wrong/hint counts accumulated before reset are preserved in final persistence
- **Actual Result:** __ fill on execution __
- **Status:** Pending
