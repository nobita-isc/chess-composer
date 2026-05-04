# TC-LSN-002: View Lessons List

**UC:** [UC-LSN-002](../../usecases/lessons/UC-LSN-002-view-lessons-list.md)
**Module:** lessons | **Last Updated:** 2026-05-03

---

## TC-LSN-002-01: View lessons — course with lessons

- **Type:** Functional
- **Priority:** High
- **Method:** API
- **Precondition:** Course exists with 3 lessons
- **Steps:**
  1. `GET /api/courses/:id/lessons`
- **Expected Result:**
  - Status 200, `success: true`
  - `data` array length = 3, ordered by `order_index` ascending
  - Each item has `id`, `title`, `order_index`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-002-02: View lessons — empty course

- **Type:** Edge
- **Priority:** Medium
- **Method:** API + UI
- **Precondition:** Course exists with zero lessons
- **Steps:**
  1. `GET /api/courses/:id/lessons`
  2. Observe middle pane in UI
- **Expected Result:**
  - Status 200, `data: []`
  - UI middle pane shows empty state message
- **Actual Result:** __ fill on execution __
- **Status:** Pending
