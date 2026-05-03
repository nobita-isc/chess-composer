# TC-PSL-005: Wrong-but-Legal Move Handling

**UC:** [UC-PSL-005](../../usecases/puzzle-solving/UC-PSL-005-wrong-but-legal-move-handling.md)
**Module:** puzzle-solving | **Last Updated:** 2026-05-03

---

## TC-PSL-005-01: Wrong legal move — feedback shown, piece snaps back

- **Type:** Functional
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §5
- **Precondition:**
  - Puzzle open; solution = e2-e4; student plays e2-e3 (legal but wrong)
- **Steps:**
  1. Click e2; click e3
  2. Assert wrong-move visual feedback (red highlight or shake class present)
  3. Wait for snapback animation (~600ms)
  4. Assert piece back on e2
  5. Assert board position unchanged
- **Expected Result:**
  - Wrong feedback shown; piece snaps back; board at original position
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-005-02: Wrong-attempt counter increments

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §5
- **Precondition:**
  - Puzzle open; attempt counter initially 0
- **Steps:**
  1. Make two distinct wrong legal moves
  2. Assert attempt counter shows 2 (if displayed in UI)
  3. Complete puzzle correctly
  4. Assert persisted attempt record has `attempts: 2`
- **Expected Result:**
  - Each wrong move increments counter; final API payload reflects correct count
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-005-03: Board accepts input only after snapback completes

- **Type:** Boundary
- **Priority:** P2
- **Mode:** Manual
- **Precondition:**
  - Puzzle open; student makes wrong move
- **Steps:**
  1. Make a wrong move
  2. Immediately (within 100ms) attempt another move during snapback animation
  3. Observe whether second input is accepted
- **Expected Result:**
  - Second input ignored while snapback in progress; board only accepts input after animation complete
- **Actual Result:** __ fill on execution __
- **Status:** Pending
