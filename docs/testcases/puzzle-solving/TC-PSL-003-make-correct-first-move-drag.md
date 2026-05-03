# TC-PSL-003: Make Correct First Move (Drag)

**UC:** [UC-PSL-003](../../usecases/puzzle-solving/UC-PSL-003-make-correct-first-move-drag.md)
**Module:** puzzle-solving | **Last Updated:** 2026-05-03

---

## TC-PSL-003-01: Correct drag move accepted

- **Type:** Functional
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §3
- **Precondition:**
  - Puzzle open; student turn; solution first move = d2-d4
- **Test Data:** drag from d2 → d4
- **Steps:**
  1. Mouse-down on d2
  2. Move mouse to d4
  3. Mouse-up on d4
  4. Assert piece lands on d4
  5. Assert engine reply plays
- **Expected Result:**
  - Move accepted identically to click input; engine replies; progress advances
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-003-02: Drag released on illegal square — piece snaps back

- **Type:** Negative
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §3
- **Precondition:**
  - Puzzle open; student turn
- **Test Data:** drag own piece to occupied-by-own-piece square
- **Steps:**
  1. Mouse-down on piece
  2. Drag to a square occupied by own piece
  3. Mouse-up
  4. Assert piece returns to origin
- **Expected Result:**
  - Piece snaps back; board unchanged; no attempt counter increment
- **Actual Result:** __ fill on execution __
- **Status:** Pending
