# TC-PSL-004: Reject Illegal Move

**UC:** [UC-PSL-004](../../usecases/puzzle-solving/UC-PSL-004-reject-illegal-move.md)
**Module:** puzzle-solving | **Last Updated:** 2026-05-03

---

## TC-PSL-004-01: Move into check silently rejected

- **Type:** Negative
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §4
- **Precondition:**
  - Puzzle position where moving King to a attacked square is possible to attempt
- **Test Data:** King move to square covered by opponent piece
- **Steps:**
  1. Click King
  2. Attempt to click attacked target square (should not be in legal highlights)
  3. Observe board
- **Expected Result:**
  - Target square not highlighted as legal; click has no effect; board unchanged; no attempt counted
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-004-02: Move pinned piece off pin line — rejected

- **Type:** Negative
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §4
- **Precondition:**
  - Puzzle position has a pinned piece
- **Steps:**
  1. Click pinned piece
  2. Assert legal squares shown exclude off-pin destinations
  3. Attempt drag to off-pin square; release
  4. Assert snap-back
- **Expected Result:**
  - Illegal move blocked; piece returns to origin; no wrong-attempt increment
- **Actual Result:** __ fill on execution __
- **Status:** Pending
