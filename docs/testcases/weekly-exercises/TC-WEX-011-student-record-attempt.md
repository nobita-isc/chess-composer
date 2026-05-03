# TC-WEX-011: Student Records Attempt

**UC:** [UC-WEX-011](../../usecases/weekly-exercises/UC-WEX-011-student-record-attempt.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-011-01: Record attempt — happy path

- **Type:** Functional
- **Priority:** Critical
- **Method:** API
- **Precondition:** Student assigned to exercise; `is_final = false`
- **Test Data:** `{ score: 3, puzzleResults: "1,0,1", puzzleHints: "0,1,0" }`
- **Steps:**
  1. `PUT /api/student-exercises/:id/attempt` with above body
- **Expected Result:**
  - Status 200, `success: true`
  - DB: attempt fields updated on `student_exercises`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-011-02: Attempt — invalid puzzleResults format rejected

- **Type:** Negative
- **Priority:** High
- **Method:** API
- **Test Data:** `{ score: 2, puzzleResults: "1,X,0" }`
- **Steps:**
  1. `PUT /api/student-exercises/:id/attempt` with `puzzleResults: "1,X,0"`
- **Expected Result:**
  - Status 400, `{ error: "Invalid puzzleResults format" }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-011-03: Attempt — score = 0 accepted (boundary)

- **Type:** Boundary
- **Priority:** Medium
- **Method:** API
- **Test Data:** `{ score: 0 }`
- **Steps:**
  1. `PUT /api/student-exercises/:id/attempt` with `{ score: 0 }`
- **Expected Result:**
  - Status 200, `success: true`; `score = 0` saved
- **Actual Result:** __ fill on execution __
- **Status:** Pending
