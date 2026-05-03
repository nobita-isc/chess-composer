# TC-WEX-003: Admin Assigns Exercise to Students

**UC:** [UC-WEX-003](../../usecases/weekly-exercises/UC-WEX-003-admin-assign-exercise.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-003-01: Assign exercise to multiple students — happy path

- **Type:** Functional
- **Priority:** Critical
- **Method:** API
- **Precondition:** Exercise exists; 2 student accounts exist
- **Test Data:** `{ studentIds: ["s1", "s2"] }`
- **Steps:**
  1. `POST /api/exercises/:id/assign` with `{ studentIds: ["s1", "s2"] }`
- **Expected Result:**
  - Status 200, `success: true`
  - 2 rows created in `student_exercises`
  - Each student can now access via `GET /api/student-exercises/:id`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-003-02: Assign — empty studentIds rejected

- **Type:** Negative
- **Priority:** High
- **Method:** API
- **Precondition:** Exercise exists
- **Test Data:** `{ studentIds: [] }`
- **Steps:**
  1. `POST /api/exercises/:id/assign` with `{ studentIds: [] }`
- **Expected Result:**
  - Status 400, `{ error: "At least one student ID is required" }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-003-03: Assign — missing studentIds field rejected

- **Type:** Negative
- **Priority:** Medium
- **Method:** API
- **Test Data:** `{}`
- **Steps:**
  1. `POST /api/exercises/:id/assign` with empty body
- **Expected Result:**
  - Status 400, `{ error: "At least one student ID is required" }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending
