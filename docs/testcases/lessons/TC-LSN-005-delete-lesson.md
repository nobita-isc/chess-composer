# TC-LSN-005: Delete Lesson

**UC:** [UC-LSN-005](../../usecases/lessons/UC-LSN-005-delete-lesson.md)
**Module:** lessons | **Last Updated:** 2026-05-03

---

## TC-LSN-005-01: Delete lesson with content — happy path

- **Type:** Functional
- **Priority:** High
- **Method:** UI + API
- **Precondition:** Admin; lesson exists with 2 content items
- **Steps:**
  1. Select lesson in middle pane
  2. Click delete icon → confirm in dialog
- **Expected Result:**
  - `DELETE /api/lessons/:id` returns 200 `{ success: true }`
  - Lesson removed from middle pane list
  - Right pane clears
  - DB: lesson row gone; associated `lesson_content` rows cascade-deleted
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-005-02: Cancel delete — no change

- **Type:** Functional
- **Priority:** Medium
- **Method:** UI
- **Precondition:** Admin; lesson exists
- **Steps:**
  1. Click delete icon → cancel in confirmation dialog
- **Expected Result:**
  - No DELETE request fired
  - Lesson still visible in list and DB
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-005-03: Delete non-existent lesson

- **Type:** Negative
- **Priority:** Medium
- **Method:** API
- **Precondition:** Admin JWT
- **Steps:**
  1. `DELETE /api/lessons/nonexistent-id`
- **Expected Result:**
  - Status 404, `{ success: false }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending
