# TC-WEX-013: Student Adds Personal Notes

**UC:** [UC-WEX-013](../../usecases/weekly-exercises/UC-WEX-013-student-add-notes.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-013-01: Add notes — happy path

- **Type:** Functional
- **Priority:** Medium
- **Method:** API
- **Precondition:** `student_exercise` assignment exists
- **Test Data:** `{ notes: "Remember to check king safety first." }`
- **Steps:**
  1. `PUT /api/student-exercises/:id/notes` with `{ notes: "Remember to check king safety first." }`
- **Expected Result:**
  - Status 200, `success: true`
  - DB: `student_exercises.notes` updated
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-013-02: Clear notes — empty string accepted

- **Type:** Edge
- **Priority:** Low
- **Method:** API
- **Precondition:** `student_exercise` has existing notes
- **Test Data:** `{ notes: "" }`
- **Steps:**
  1. `PUT /api/student-exercises/:id/notes` with `{ notes: "" }`
- **Expected Result:**
  - Status 200, `success: true`
  - DB: `notes` = empty string or null
- **Actual Result:** __ fill on execution __
- **Status:** Pending
