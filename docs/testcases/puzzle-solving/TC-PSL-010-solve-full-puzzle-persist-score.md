# TC-PSL-010: Solve Full Puzzle → Backend Persists Score

**UC:** [UC-PSL-010](../../usecases/puzzle-solving/UC-PSL-010-solve-full-puzzle-persist-score.md)
**Module:** puzzle-solving | **Last Updated:** 2026-05-03

---

## TC-PSL-010-01: Clean solve — score 100, completed flag set

- **Type:** Functional
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §10
- **Precondition:**
  - Puzzle open; student authenticated; 0 wrong attempts, 0 hints
- **Steps:**
  1. Solve all moves correctly without wrong attempts or hints
  2. Assert success banner/confetti displayed
  3. Intercept `PATCH /api/student-exercises/:id/puzzles/:puzzleId/attempt`
  4. Assert payload: `{ completed: true, score: 100, attempts: 0, hints: 0 }`
  5. Assert response 200 with updated record
- **Expected Result:**
  - Completion API called with score=100; DB row `completed=true`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-010-02: Solve with wrong attempts and hints — score formula applied

- **Type:** Functional
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-solving.spec.ts` §10
- **Precondition:**
  - Puzzle open; student makes 3 wrong attempts and uses 2 hints before solving
- **Steps:**
  1. Make 3 wrong moves (attempts=3)
  2. Use hint twice (hints=2)
  3. Solve puzzle correctly
  4. Assert API payload: `{ score: 60, attempts: 3, hints: 2 }` (100 - 30 - 10 = 60)
- **Expected Result:**
  - Score = max(0, 100 − (3×10) − (2×5)) = 60; persisted correctly
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PSL-010-03: Token expires mid-solve — completion blocked, user notified

- **Type:** Negative
- **Priority:** P1
- **Mode:** Manual
- **Precondition:**
  - Student JWT set to expire in <5s; puzzle open
- **Steps:**
  1. Wait for JWT to expire
  2. Complete final move of puzzle
  3. Observe system response to failed PATCH call
- **Expected Result:**
  - 401 from API; UI shows session-expired message or redirects to login; solve not lost silently
- **Actual Result:** __ fill on execution __
- **Status:** Pending
