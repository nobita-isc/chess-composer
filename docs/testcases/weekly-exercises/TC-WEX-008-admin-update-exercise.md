# TC-WEX-008: Admin Updates Exercise Name

**UC:** [UC-WEX-008](../../usecases/weekly-exercises/UC-WEX-008-admin-update-exercise.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-008-01: Update name — happy path

- **Type:** Functional
- **Priority:** Medium
- **Method:** API
- **Precondition:** Admin JWT; exercise exists
- **Test Data:** `{ name: "Week 18 Advanced Tactics" }`
- **Steps:**
  1. `PUT /api/exercises/:id` with `{ name: "Week 18 Advanced Tactics" }`
- **Expected Result:**
  - Status 200, `{ success: true }`
  - DB: `weekly_exercises.name` updated (trimmed)
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-008-02: Update name — 201-char name rejected

- **Type:** Boundary
- **Priority:** High
- **Method:** API
- **Precondition:** Admin JWT; exercise exists
- **Test Data:** `{ name: "a".repeat(201) }`
- **Steps:**
  1. `PUT /api/exercises/:id` with 201-char name
- **Expected Result:**
  - Status 400, `{ error: "Name must be 200 characters or less" }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-008-03: Update name — 200-char name accepted (boundary)

- **Type:** Boundary
- **Priority:** Medium
- **Method:** API
- **Test Data:** `{ name: "a".repeat(200) }`
- **Steps:**
  1. `PUT /api/exercises/:id` with exactly 200-char name
- **Expected Result:**
  - Status 200, `{ success: true }`
  - Name saved
- **Actual Result:** __ fill on execution __
- **Status:** Pending
