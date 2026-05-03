# TC-LSN-001: Create Lesson

**UC:** [UC-LSN-001](../../usecases/lessons/UC-LSN-001-create-lesson.md)
**Module:** lessons | **Last Updated:** 2026-05-03

---

## TC-LSN-001-01: Create lesson — happy path

- **Type:** Functional
- **Priority:** Critical
- **Method:** UI + API
- **Precondition:**
  - Logged in as admin
  - At least one course exists
- **Test Data:** title = "Pawn Endgames"
- **Steps:**
  1. Navigate to Course Management → select a course in left pane
  2. Click "+ Add Lesson" in middle pane
  3. Enter title "Pawn Endgames" in prompt dialog
  4. Confirm
- **Expected Result:**
  - `POST /api/courses/:id/lessons` returns 201 with lesson object
  - New lesson appears in middle pane list
  - Lesson auto-selected; right pane shows empty editor
  - DB: row in `lessons` with correct `course_id`, `order_index` = previous max + 1
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-001-02: Create lesson — empty title rejected

- **Type:** Negative
- **Priority:** High
- **Method:** API
- **Precondition:** Admin JWT; course exists
- **Test Data:** `{ "title": "   " }`
- **Steps:**
  1. `POST /api/courses/:id/lessons` with body `{ "title": "   " }`
- **Expected Result:**
  - Status 400, body `{ "success": false, "error": "Title is required" }`
  - No row created in `lessons`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-001-03: Create lesson — course not found

- **Type:** Negative
- **Priority:** Medium
- **Method:** API
- **Precondition:** Admin JWT
- **Test Data:** non-existent course ID
- **Steps:**
  1. `POST /api/courses/nonexistent-id/lessons` with `{ "title": "Test" }`
- **Expected Result:**
  - Status 404 or 500 (repo throws); `success: false`
  - No lesson created
- **Actual Result:** __ fill on execution __
- **Status:** Pending
