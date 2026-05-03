# TC-WEX-015: Authorization — Student Cannot Grade, Mark-Final, or Reset-Score

**UC:** [UC-WEX-015](../../usecases/weekly-exercises/UC-WEX-015-authorization-student-cannot-grade.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-015-01: Student cannot mark-final

- **Type:** Security
- **Priority:** Critical
- **Method:** API
- **Precondition:** Student JWT; `student_exercise` exists
- **Steps:**
  1. `PUT /api/student-exercises/:id/mark-final` with student JWT
- **Expected Result:**
  - Status 403 Forbidden
  - `is_final` unchanged in DB
  - No sensitive data in response body
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-015-02: Student cannot reset-score

- **Type:** Security
- **Priority:** Critical
- **Method:** API
- **Precondition:** Student JWT; `student_exercise` with `score = 80`
- **Steps:**
  1. `PUT /api/student-exercises/:id/reset-score` with student JWT
- **Expected Result:**
  - Status 403 Forbidden
  - Score remains 80 in DB
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-015-03: Unauthenticated cannot mark-final

- **Type:** Security
- **Priority:** Critical
- **Method:** API
- **Precondition:** No auth token
- **Steps:**
  1. `PUT /api/student-exercises/:id/mark-final` with no Authorization header
- **Expected Result:**
  - Status 401 Unauthorized
  - DB unchanged
- **Actual Result:** __ fill on execution __
- **Status:** Pending
