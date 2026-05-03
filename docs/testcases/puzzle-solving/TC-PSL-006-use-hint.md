# TC-PSL-006: Use Hint

**UC:** [UC-PSL-006](../../usecases/puzzle-solving/UC-PSL-006-use-hint.md)
**Module:** puzzle-solving | **Last Updated:** 2026-05-03

---

## TC-PSL-006-01: Hint highlights correct move squares

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §6
- **Precondition:**
  - Puzzle open; student has not yet moved
- **Steps:**
  1. Click "Hint" button
  2. Assert source square of correct move highlighted (distinct hint color)
  3. Assert target square of correct move highlighted
  4. Assert hint counter incremented to 1 (UI badge or hidden attribute)
- **Expected Result:**
  - Correct source + target squares visually highlighted; hint count = 1
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-006-02: Multiple hints — counter accumulates, persisted on solve

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §6
- **Precondition:**
  - Multi-move puzzle open
- **Steps:**
  1. Click Hint on move 1; assert count = 1
  2. Make correct move (hint-guided)
  3. Click Hint on move 2; assert count = 2
  4. Complete puzzle
  5. Assert API payload `hints: 2`
- **Expected Result:**
  - Hint count accumulates across moves; persisted in completion record
- **Actual Result:** __ fill on execution __
- **Status:** Pending
