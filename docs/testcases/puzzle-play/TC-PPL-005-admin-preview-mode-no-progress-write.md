# TC-PPL-005: Admin Preview Mode — No Progress Write

**UC:** [UC-PPL-005](../../usecases/puzzle-play/UC-PPL-005-admin-preview-mode-no-progress-write.md)
**Module:** puzzle-play | **Last Updated:** 2026-05-03

---

## TC-PPL-005-01: Admin solves puzzle in preview — no attempt record created

- **Type:** Functional
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §5
- **Precondition:**
  - Admin authenticated; lesson puzzle content item exists (published)
- **Steps:**
  1. Log in as admin; navigate to lesson puzzle
  2. Assert preview mode indicator shown (e.g., "Preview" badge)
  3. Monitor network; solve puzzle completely
  4. Assert NO `POST /api/lesson-puzzle-attempts` fired
  5. Assert success animation shown (preview still provides UX feedback)
- **Expected Result:**
  - Board interactive for admin; completion feedback shown; zero DB writes
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PPL-005-02: Admin can preview draft puzzle — student cannot

- **Type:** Auth
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §5
- **Precondition:**
  - Lesson in draft state with a puzzle content item
- **Steps:**
  1. Log in as admin; navigate to draft lesson puzzle; assert board renders
  2. Log out; log in as student; navigate to same URL
  3. Assert student receives 403 or redirect; board does not render
- **Expected Result:**
  - Admin: board renders in preview. Student: blocked.
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-PPL-005-03: Student JWT cannot spoof admin preview path

- **Type:** Auth
- **Priority:** P0
- **Mode:** Automated
- **Automation:** `e2e/puzzle-play.spec.ts` §5
- **Precondition:**
  - Student authenticated
- **Steps:**
  1. As student, call `POST /api/lesson-puzzle-attempts` with `preview: true` flag in body
  2. Assert server ignores/rejects preview flag; attempt recorded normally OR 403 returned
- **Expected Result:**
  - Server enforces role-based preview via JWT role claim, not client flag
- **Actual Result:** __ fill on execution __
- **Status:** Pending
