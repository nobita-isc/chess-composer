# TC-WEX-005: Admin Grades Student Attempt

**UC:** [UC-WEX-005](../../usecases/weekly-exercises/UC-WEX-005-admin-grade-attempt.md)
**Module:** weekly-exercises | **Last Updated:** 2026-05-03

---

## TC-WEX-005-01: Grade attempt — valid score and notes

- **Type:** Functional
- **Priority:** Critical
- **Method:** API
- **Precondition:** `student_exercise` exists (ungraded)
- **Test Data:** `{ score: 85, notes: "Good work on puzzle 2", puzzleResults: "1,0,1" }`
- **Steps:**
  1. `PUT /api/student-exercises/:id/grade` with above body
- **Expected Result:**
  - Status 200, `success: true`
  - DB: `score = 85`, `notes` updated
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-005-02: Grade — missing score rejected

- **Type:** Negative
- **Priority:** High
- **Method:** API
- **Precondition:** `student_exercise` exists
- **Test Data:** `{ notes: "No score" }`
- **Steps:**
  1. `PUT /api/student-exercises/:id/grade` with `{ notes: "No score" }`
- **Expected Result:**
  - Status 400, `{ error: "Score is required" }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-WEX-005-03: Grade — negative score rejected

- **Type:** Boundary
- **Priority:** High
- **Method:** API
- **Test Data:** `{ score: -1 }`
- **Steps:**
  1. `PUT /api/student-exercises/:id/grade` with `{ score: -1 }`
- **Expected Result:**
  - Status 400, `{ error: "Score must be a non-negative number" }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending
