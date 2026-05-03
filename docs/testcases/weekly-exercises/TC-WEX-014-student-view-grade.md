# TC-WEX-014: Student Views Grade and Final-Mark Status

**UC:** [UC-WEX-014](../../usecases/weekly-exercises/UC-WEX-014-student-view-grade.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-014-01: View graded and final assignment

- **Type:** Functional
- **Priority:** High
- **Method:** API
- **Precondition:** `student_exercise` has `score = 90`, `is_final = true`, admin feedback in `notes`
- **Steps:**
  1. `GET /api/student-exercises/:id`
- **Expected Result:**
  - Status 200
  - Response: `score = 90`, `is_final = true`, `notes` = admin feedback text
  - UI: "Final" badge shown, resubmit option hidden
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-014-02: View ungraded assignment

- **Type:** Edge
- **Priority:** Medium
- **Method:** API
- **Precondition:** `student_exercise` exists, `score = null`, `is_final = false`
- **Steps:**
  1. `GET /api/student-exercises/:id`
- **Expected Result:**
  - Status 200, `score: null`, `is_final: false`
  - UI shows "Pending" state; submit attempt available
- **Actual Result:** __ fill on execution __
- **Status:** Pending
