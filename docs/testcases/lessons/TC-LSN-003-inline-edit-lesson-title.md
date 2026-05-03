# TC-LSN-003: Inline Edit Lesson Title

**UC:** [UC-LSN-003](../../usecases/lessons/UC-LSN-003-inline-edit-lesson-title.md)
**Module:** lessons | **Last Updated:** 2026-05-03

---

## TC-LSN-003-01: Auto-save title after 500ms debounce

- **Type:** Functional
- **Priority:** High
- **Method:** UI
- **Precondition:** Admin logged in; lesson selected
- **Test Data:** new title = "Rook Endgames"
- **Steps:**
  1. Click lesson title field in right pane
  2. Clear existing value, type "Rook Endgames"
  3. Wait 600ms without further input
- **Expected Result:**
  - `PUT /api/lessons/:id` fired automatically with `{ title: "Rook Endgames" }`
  - Response 200; title persists on reload
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-003-02: Save on blur

- **Type:** Functional
- **Priority:** High
- **Method:** UI
- **Precondition:** Admin logged in; lesson selected
- **Test Data:** new title = "Bishop Tactics"
- **Steps:**
  1. Click title field, type "Bishop Tactics"
  2. Immediately click outside (blur) without waiting 500ms
- **Expected Result:**
  - `PUT /api/lessons/:id` fired on blur
  - Title saved; no duplicate save request after 500ms
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-003-03: Empty title blocked client-side

- **Type:** Negative
- **Priority:** Medium
- **Method:** UI
- **Precondition:** Admin logged in; lesson selected; existing title = "Original"
- **Steps:**
  1. Click title field, clear all text
  2. Blur field
- **Expected Result:**
  - No `PUT` request sent
  - Field shows validation hint; title remains "Original" in DB
- **Actual Result:** __ fill on execution __
- **Status:** Pending
