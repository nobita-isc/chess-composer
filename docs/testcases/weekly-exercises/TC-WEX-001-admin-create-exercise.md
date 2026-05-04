# TC-WEX-001: Admin Creates Weekly Exercise

**UC:** [UC-WEX-001](../../usecases/weekly-exercises/UC-WEX-001-admin-create-exercise.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-001-01: Create exercise — happy path

- **Type:** Functional
- **Priority:** Critical
- **Method:** API
- **Precondition:** At least one puzzle exists; no auth required on this route
- **Test Data:** `{ puzzleIds: ["p1","p2"], name: "Week 18 Tactics", weekStart: "2026-05-04" }`
- **Steps:**
  1. `POST /api/exercises` with `{ puzzleIds: ["p1","p2"], name: "Week 18 Tactics", weekStart: "2026-05-04" }`
- **Expected Result:**
  - Status 201, `success: true`
  - Returned object has `id`, `name`, `week_start`
  - DB row in `weekly_exercises`
  - PDF available at `GET /api/exercises/:id/pdf`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-001-02: Create exercise — missing puzzleIds rejected

- **Type:** Negative
- **Priority:** High
- **Method:** API
- **Precondition:** none
- **Test Data:** `{ name: "No Puzzles" }`
- **Steps:**
  1. `POST /api/exercises` with `{ name: "No Puzzles" }`
- **Expected Result:**
  - Status 400, `{ error: "At least one puzzle ID is required" }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-001-03: Create exercise — empty puzzleIds array rejected

- **Type:** Boundary
- **Priority:** High
- **Method:** API
- **Test Data:** `{ puzzleIds: [] }`
- **Steps:**
  1. `POST /api/exercises` with `{ puzzleIds: [] }`
- **Expected Result:**
  - Status 400, `{ error: "At least one puzzle ID is required" }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending
