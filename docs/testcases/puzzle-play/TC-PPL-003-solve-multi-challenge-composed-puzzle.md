# TC-PPL-003: Solve Multi-Challenge Composed Puzzle

**UC:** [UC-PPL-003](../../usecases/puzzle-play/UC-PPL-003-solve-multi-challenge-composed-puzzle.md)
**Module:** puzzle-play | **Last Updated:** 2026-05-03

---

## TC-PPL-003-01: Complete all challenges in sequence — overall completion recorded

- **Type:** Functional
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §3
- **Precondition:**
  - Lesson puzzle with 3 challenges; student on challenge 1
- **Steps:**
  1. Solve challenge 1; assert transition to challenge 2; indicator = "2 of 3"
  2. Solve challenge 2; assert transition to challenge 3; indicator = "3 of 3"
  3. Solve challenge 3; assert overall success banner
  4. Assert `POST /api/lesson-puzzle-attempts` with `completed: true`
- **Expected Result:**
  - All 3 challenges solved; overall completion persisted; progress indicator accurate
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PPL-003-02: Fail challenge N — challenges 1..N-1 not reset

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §3
- **Precondition:**
  - 3-challenge puzzle; challenges 1 and 2 solved; on challenge 3
- **Steps:**
  1. Make a wrong move on challenge 3
  2. Assert snapback on challenge 3 board
  3. Navigate back to challenge 2
  4. Assert challenge 2 shows solved/read-only state (not reset)
- **Expected Result:**
  - Wrong move on challenge 3 does not affect previously solved challenges
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PPL-003-03: Score aggregated across all challenges

- **Type:** Functional
- **Priority:** P2
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §3
- **Precondition:**
  - 2-challenge puzzle; challenge 1 solved clean (score=100), challenge 2 with 2 wrong (score=80)
- **Steps:**
  1. Solve both challenges with above attempt counts
  2. Assert API payload score = aggregate (e.g., average or sum per spec)
- **Expected Result:**
  - Aggregated score reflects combined performance across challenges
- **Actual Result:** __ fill on execution __
- **Status:** Pending
