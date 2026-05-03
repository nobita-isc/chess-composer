# TC-PPL-008: Board Flip When Puzzle Is Black-to-Move

**UC:** [UC-PPL-008](../../usecases/puzzle-play/UC-PPL-008-board-flip-black-to-move.md)
**Module:** puzzle-play | **Last Updated:** 2026-05-03

---

## TC-PPL-008-01: Black-to-move puzzle — board renders flipped

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §8
- **Precondition:**
  - Lesson puzzle FEN active color = 'b' (Black to move)
- **Steps:**
  1. Open lesson puzzle
  2. Assert board orientation: Black pieces at bottom (rank 1 at top of DOM)
  3. Assert side-to-move indicator = "Black to move"
  4. Make correct Black move
  5. Assert engine (White) reply animates from top of board
- **Expected Result:**
  - Board flipped; Black at bottom; moves work correctly from flipped perspective
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PPL-008-02: White-to-move puzzle — board renders normal orientation

- **Type:** Functional
- **Priority:** P2
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §8
- **Precondition:**
  - Lesson puzzle FEN active color = 'w' (White to move)
- **Steps:**
  1. Open lesson puzzle
  2. Assert board orientation: White pieces at bottom (standard)
  3. Assert side-to-move indicator = "White to move"
- **Expected Result:**
  - Board in standard orientation; no flip applied
- **Actual Result:** __ fill on execution __
- **Status:** Pending
