# TC-WEX-002: Admin Lists Exercises

**UC:** [UC-WEX-002](../../usecases/weekly-exercises/UC-WEX-002-admin-list-exercises.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-002-01: List exercises — returns all with stats

- **Type:** Functional
- **Priority:** High
- **Method:** API
- **Precondition:** 2+ exercises exist, some with assignments
- **Steps:**
  1. `GET /api/exercises`
- **Expected Result:**
  - Status 200, `success: true`
  - Array with exercise objects; each has assignment/completion stats
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-002-02: List exercises — none exist returns empty array

- **Type:** Edge
- **Priority:** Medium
- **Method:** API
- **Precondition:** No exercises in DB
- **Steps:**
  1. `GET /api/exercises`
- **Expected Result:**
  - Status 200, `data: []`
- **Actual Result:** __ fill on execution __
- **Status:** Pending
