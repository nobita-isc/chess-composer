# TC-PPL-004: Wrong Move Snapback / No Progress Recorded

**UC:** [UC-PPL-004](../../usecases/puzzle-play/UC-PPL-004-wrong-move-snapback-no-progress-recorded.md)
**Module:** puzzle-play | **Last Updated:** 2026-05-03

---

## TC-PPL-004-01: Wrong legal move — snapback, no API call fired

- **Type:** Functional
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §4
- **Precondition:**
  - Lesson puzzle open; solution = Nf3; student plays Nc3 (legal, wrong)
- **Steps:**
  1. Monitor network requests
  2. Play Nc3
  3. Assert wrong-move visual feedback shown
  4. Wait for snapback (~600ms)
  5. Assert piece back on origin square
  6. Assert no `POST /api/lesson-puzzle-attempts` fired
- **Expected Result:**
  - Snapback completes; board unchanged; no backend write on wrong move
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PPL-004-02: Multiple wrong moves — all snap back, counter held client-side

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §4
- **Precondition:**
  - Lesson puzzle open; student makes 3 wrong moves before solving
- **Steps:**
  1. Make 3 distinct wrong legal moves (each snaps back)
  2. Assert no API calls between wrong moves
  3. Solve puzzle correctly
  4. Assert completion API payload: `attempts: 3`
- **Expected Result:**
  - Wrong attempts held client-side; only written on completion
- **Actual Result:** __ fill on execution __
- **Status:** Pending
