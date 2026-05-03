# TC-PPL-001: Student Opens Lesson Puzzle Content Item

**UC:** [UC-PPL-001](../../usecases/puzzle-play/UC-PPL-001-student-opens-lesson-puzzle-content-item.md)
**Module:** puzzle-play | **Last Updated:** 2026-05-03

---

## TC-PPL-001-01: Student opens lesson puzzle — board renders correctly

- **Type:** Functional
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §1
- **Precondition:**
  - Student authenticated; lesson published; contains puzzle content item
- **Steps:**
  1. Navigate to lesson; select puzzle content item in sidebar
  2. Assert board renders with correct FEN
  3. Assert side-to-move indicator shown
  4. Assert board is interactive (piece click shows legal squares)
  5. Assert no attempt record yet written (no API call fired on open)
- **Expected Result:**
  - Board visible and interactive; no premature backend write
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PPL-001-02: Student cannot access unpublished lesson puzzle

- **Type:** Negative
- **Priority:** P1
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §1
- **Precondition:**
  - Lesson is in draft/unpublished state
- **Steps:**
  1. Navigate directly to lesson URL
  2. Observe response
- **Expected Result:**
  - 403 or redirect; puzzle board does not render
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PPL-001-03: Unauthenticated access redirects to login

- **Type:** Negative
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §1
- **Precondition:**
  - No active session
- **Steps:**
  1. Navigate to lesson puzzle URL without authentication
  2. Observe redirect
- **Expected Result:**
  - Redirected to login page; puzzle not accessible
- **Actual Result:** __ fill on execution __
- **Status:** Pending
