# TC-WEX-006: Admin Marks Attempt as Final

**UC:** [UC-WEX-006](../../usecases/weekly-exercises/UC-WEX-006-admin-mark-final.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-006-01: Mark final — happy path

- **Type:** Functional
- **Priority:** High
- **Method:** API
- **Precondition:** Admin JWT; `student_exercise` exists with score set
- **Steps:**
  1. `PUT /api/student-exercises/:id/mark-final` with admin JWT
- **Expected Result:**
  - Status 200, `success: true`
  - DB: `is_final = true`
  - Student UI shows grade as locked
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-006-02: Mark final — non-admin rejected

- **Type:** Security
- **Priority:** Critical
- **Method:** API
- **Precondition:** Student JWT; `student_exercise` exists
- **Steps:**
  1. `PUT /api/student-exercises/:id/mark-final` with student JWT
- **Expected Result:**
  - Status 403 Forbidden
  - `is_final` unchanged in DB
- **Actual Result:** __ fill on execution __
- **Status:** Pending
