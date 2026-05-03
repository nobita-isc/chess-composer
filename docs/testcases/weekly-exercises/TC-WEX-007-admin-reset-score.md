# TC-WEX-007: Admin Resets Student Score

**UC:** [UC-WEX-007](../../usecases/weekly-exercises/UC-WEX-007-admin-reset-score.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-007-01: Reset score — happy path

- **Type:** Functional
- **Priority:** High
- **Method:** API
- **Precondition:** Admin JWT; `student_exercise` with `score = 75`, `is_final = true`
- **Steps:**
  1. `PUT /api/student-exercises/:id/reset-score` with admin JWT
- **Expected Result:**
  - Status 200, `success: true`
  - DB: `score = null`, `is_final = false`
  - Student can submit a new attempt
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-007-02: Reset score — non-admin rejected

- **Type:** Security
- **Priority:** Critical
- **Method:** API
- **Precondition:** Student JWT; `student_exercise` with score set
- **Steps:**
  1. `PUT /api/student-exercises/:id/reset-score` with student JWT
- **Expected Result:**
  - Status 403 Forbidden
  - Score unchanged in DB
- **Actual Result:** __ fill on execution __
- **Status:** Pending
