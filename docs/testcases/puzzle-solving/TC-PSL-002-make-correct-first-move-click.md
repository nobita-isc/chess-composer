# TC-PSL-002: Make Correct First Move (Click)

**UC:** [UC-PSL-002](../../usecases/puzzle-solving/UC-PSL-002-make-correct-first-move-click.md)
**Module:** puzzle-solving | **Last Updated:** 2026-05-03

---

## TC-PSL-002-01: Correct click move accepted — piece advances, engine replies

- **Type:** Functional
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §2
- **Precondition:**
  - Puzzle open; student turn; puzzle solution first move = e2-e4
- **Test Data:** source = e2, target = e4
- **Steps:**
  1. Click source square e2 (piece highlights)
  2. Assert legal target squares highlighted
  3. Click target square e4
  4. Assert piece moves to e4
  5. Assert engine reply plays automatically
  6. Assert next student prompt shown
- **Expected Result:**
  - Move accepted; board updates; engine reply animates; no wrong-attempt increment
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-002-02: Click on opponent's piece — no selection

- **Type:** Negative
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §2
- **Precondition:**
  - Puzzle open; White to move
- **Steps:**
  1. Click a Black piece square
  2. Observe board state
- **Expected Result:**
  - No piece selected; no legal squares highlighted; board unchanged
- **Actual Result:** __ fill on execution __
- **Status:** Pending
