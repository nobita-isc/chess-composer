# TC-WEX-004: Admin Views Student Assignments

**UC:** [UC-WEX-004](../../usecases/weekly-exercises/UC-WEX-004-admin-view-assignments.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-004-01: View assignments — exercise with assigned students

- **Type:** Functional
- **Priority:** High
- **Method:** API
- **Precondition:** Exercise exists with 3 student assignments, 1 graded
- **Steps:**
  1. `GET /api/exercises/:id/assignments`
- **Expected Result:**
  - Status 200, `success: true`
  - Array length = 3
  - Each record has `student_id`, `score` (null or number), `is_final`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-004-02: View assignments — no assignments yet

- **Type:** Edge
- **Priority:** Low
- **Method:** API
- **Precondition:** Exercise exists, no students assigned
- **Steps:**
  1. `GET /api/exercises/:id/assignments`
- **Expected Result:**
  - Status 200, `data: []`
- **Actual Result:** __ fill on execution __
- **Status:** Pending
