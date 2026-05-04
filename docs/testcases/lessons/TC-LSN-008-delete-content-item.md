# TC-LSN-008: Delete Content Item

**UC:** [UC-LSN-008](../../usecases/lessons/UC-LSN-008-delete-content-item.md)
**Module:** lessons | **Last Updated:** 2026-05-03

---

## TC-LSN-008-01: Delete content item — happy path

- **Type:** Functional
- **Priority:** High
- **Method:** API
- **Precondition:** Admin JWT; content item exists
- **Steps:**
  1. `DELETE /api/content/:id`
- **Expected Result:**
  - Status 200, `{ success: true }`
  - Row removed from `lesson_content`; remaining items unaffected
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-008-02: Delete non-existent content item

- **Type:** Negative
- **Priority:** Medium
- **Method:** API
- **Precondition:** Admin JWT
- **Steps:**
  1. `DELETE /api/content/nonexistent-id`
- **Expected Result:**
  - Status 404, `{ success: false }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending
