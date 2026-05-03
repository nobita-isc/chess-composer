# TC-LSN-009: Selection Persistence

**UC:** [UC-LSN-009](../../usecases/lessons/UC-LSN-009-selection-persistence.md)
**Module:** lessons | **Last Updated:** 2026-05-03

---

## TC-LSN-009-01: Reload restores course and lesson selection

- **Type:** Functional
- **Priority:** Medium
- **Method:** UI
- **Precondition:** Admin; at least one course with one lesson
- **Steps:**
  1. Navigate to Course Management
  2. Select course → select lesson
  3. Note URL hash and localStorage values
  4. Hard reload page (Ctrl+R / Cmd+R)
- **Expected Result:**
  - Same course highlighted in left pane
  - Same lesson highlighted in middle pane
  - Right pane shows lesson editor with correct data
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-009-02: Deleted lesson cleared from persistence

- **Type:** Edge
- **Priority:** Low
- **Method:** UI
- **Precondition:** Admin; lesson previously selected and persisted; lesson then deleted via API
- **Steps:**
  1. Delete the persisted lesson via `DELETE /api/lessons/:id`
  2. Reload the Course Management page
- **Expected Result:**
  - App detects lesson no longer exists
  - Graceful reset: middle pane shows lesson list (no auto-selection)
  - No JS error in console
- **Actual Result:** __ fill on execution __
- **Status:** Pending
