# TC-PSL-008: Promotion Picker

**UC:** [UC-PSL-008](../../usecases/puzzle-solving/UC-PSL-008-promotion-picker.md)
**Module:** puzzle-solving | **Last Updated:** 2026-05-03

---

## TC-PSL-008-01: Correct promotion piece selected — move accepted

- **Type:** Functional
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §8
- **Precondition:**
  - Puzzle position: White pawn on e7; solution = e7-e8=Q
- **Steps:**
  1. Click pawn on e7; click e8
  2. Assert promotion picker dialog appears with Q/R/B/N options
  3. Click Queen
  4. Assert pawn replaced by Queen on e8
  5. Assert move accepted; engine reply plays
- **Expected Result:**
  - Promotion picker shown; correct piece selected; move proceeds as correct
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-008-02: Wrong promotion piece — treated as wrong move

- **Type:** Negative
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §8
- **Precondition:**
  - Same as TC-PSL-008-01; solution = e8=Q
- **Steps:**
  1. Move pawn to e8
  2. Select Rook in picker
  3. Assert wrong-move feedback shown
  4. Assert board snaps back to pre-promotion position
  5. Assert wrong-attempt counter +1
- **Expected Result:**
  - Wrong promotion treated as wrong-but-legal; snapback; counter incremented
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-008-03: Dismiss promotion picker — move cancelled

- **Type:** Boundary
- **Priority:** P2
- **Mode:** Manual
- **Precondition:**
  - Pawn drag/click to 8th rank triggers picker
- **Steps:**
  1. Move pawn to 8th rank
  2. Dismiss picker (press Escape or click outside)
  3. Assert pawn returns to origin square
  4. Assert board accepts next input
- **Expected Result:**
  - Picker dismissed; pawn snaps back; no move recorded; board interactive
- **Actual Result:** __ fill on execution __
- **Status:** Pending
