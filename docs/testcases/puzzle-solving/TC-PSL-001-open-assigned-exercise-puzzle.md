# TC-PSL-001: Open Assigned Exercise Puzzle

**UC:** [UC-PSL-001](../../usecases/puzzle-solving/UC-PSL-001-open-assigned-exercise-puzzle.md)
**Module:** puzzle-solving | **Last Updated:** 2026-05-03

---

## TC-PSL-001-01: Open assigned puzzle — happy path

- **Type:** Functional
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §1
- **Precondition:**
  - Student logged in
  - Exercise with 1 puzzle assigned to student; exercise status = open
- **Test Data:** `exerciseId: "ex-001"`, `puzzleId: "pzl-001"`, FEN = starting puzzle position
- **Steps:**
  1. Navigate to `/exercises/ex-001`
  2. Assert board renders with correct FEN position
  3. Assert side-to-move indicator visible
  4. Assert board is interactive (click a piece → legal squares highlight)
- **Expected Result:**
  - Board displays puzzle FEN; correct side highlighted; attempt record created or resumed
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-001-02: Open exercise — not assigned to student

- **Type:** Negative
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §1
- **Precondition:**
  - Student logged in
  - Exercise exists but is NOT assigned to this student
- **Steps:**
  1. Navigate to `/exercises/ex-unassigned`
  2. Observe response
- **Expected Result:**
  - 403 or redirect to exercises list; board does not render
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-001-03: Open completed exercise — read-only board

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §1
- **Precondition:**
  - Student has already completed all puzzles in the exercise
- **Steps:**
  1. Navigate to `/exercises/ex-completed`
  2. Assert board renders
  3. Attempt to click/drag a piece
- **Expected Result:**
  - Board visible but non-interactive; solved state indicator shown; no new attempt created
- **Actual Result:** __ fill on execution __
- **Status:** Pending
