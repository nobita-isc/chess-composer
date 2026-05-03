# TC-WEX-009: Admin Deletes Exercise

**UC:** [UC-WEX-009](../../usecases/weekly-exercises/UC-WEX-009-admin-delete-exercise.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-009-01: Delete exercise — happy path

- **Type:** Functional
- **Priority:** High
- **Method:** API
- **Precondition:** Exercise exists with 2 student assignments
- **Steps:**
  1. `DELETE /api/exercises/:id`
- **Expected Result:**
  - Status 200, `{ message: "Exercise deleted" }`
  - `weekly_exercises` row removed
  - Associated `student_exercises` rows cascade-deleted
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-009-02: Delete non-existent exercise

- **Type:** Negative
- **Priority:** Medium
- **Method:** API
- **Precondition:** Exercise ID does not exist
- **Steps:**
  1. `DELETE /api/exercises/nonexistent-id`
- **Expected Result:**
  - Status 400, `{ success: false, error: ... }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending
