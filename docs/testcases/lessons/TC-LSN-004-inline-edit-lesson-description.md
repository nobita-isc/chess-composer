# TC-LSN-004: Inline Edit Lesson Description

**UC:** [UC-LSN-004](../../usecases/lessons/UC-LSN-004-inline-edit-lesson-description.md)
**Module:** lessons | **Last Updated:** 2026-05-03

---

## TC-LSN-004-01: Auto-save description after debounce

- **Type:** Functional
- **Priority:** High
- **Method:** UI
- **Precondition:** Admin logged in; lesson selected
- **Test Data:** description = "Covers basic rook vs king endings."
- **Steps:**
  1. Click description textarea in right pane
  2. Type "Covers basic rook vs king endings."
  3. Wait 600ms
- **Expected Result:**
  - `PUT /api/lessons/:id` fired with new description
  - Status 200; persisted on reload
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-004-02: Escape reverts description

- **Type:** Functional
- **Priority:** High
- **Method:** UI
- **Precondition:** Admin; lesson with saved description "Original desc"
- **Steps:**
  1. Click description textarea
  2. Type "New unsaved text"
  3. Press Escape key
- **Expected Result:**
  - Field reverts to "Original desc"
  - No `PUT` request fired
  - DB description unchanged
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-004-03: Description over 10,000 chars rejected

- **Type:** Boundary
- **Priority:** Medium
- **Method:** API
- **Precondition:** Admin JWT; lesson exists
- **Test Data:** `description` = string of 10,001 characters
- **Steps:**
  1. `PUT /api/lessons/:id` with `{ description: "a".repeat(10001) }`
- **Expected Result:**
  - Status 400, `{ "error": "Description too long (max 10,000 characters)" }`
  - DB unchanged
- **Actual Result:** __ fill on execution __
- **Status:** Pending
