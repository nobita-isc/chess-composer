# TC-LSN-006: Add Content Item

**UC:** [UC-LSN-006](../../usecases/lessons/UC-LSN-006-add-content-item.md)
**Module:** lessons | **Last Updated:** 2026-05-03

---

## TC-LSN-006-01: Add video content — happy path

- **Type:** Functional
- **Priority:** Critical
- **Method:** API
- **Precondition:** Admin JWT; lesson exists
- **Test Data:** `{ content_type: "video", title: "Intro Video" }`
- **Steps:**
  1. `POST /api/lessons/:id/content` with `{ content_type: "video", title: "Intro Video" }`
- **Expected Result:**
  - Status 201, `success: true`, returned object has `id`, `content_type: "video"`, `title: "Intro Video"`
  - DB row in `lesson_content` with correct `lesson_id`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-006-02: Add content — missing title rejected

- **Type:** Negative
- **Priority:** High
- **Method:** API
- **Precondition:** Admin JWT; lesson exists
- **Test Data:** `{ content_type: "pdf", title: "" }`
- **Steps:**
  1. `POST /api/lessons/:id/content` with `{ content_type: "pdf", title: "" }`
- **Expected Result:**
  - Status 400, `{ error: "title required" }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-006-03: Add content — invalid content_type rejected

- **Type:** Negative
- **Priority:** High
- **Method:** API
- **Precondition:** Admin JWT; lesson exists
- **Test Data:** `{ content_type: "audio", title: "Test" }`
- **Steps:**
  1. `POST /api/lessons/:id/content` with `{ content_type: "audio", title: "Test" }`
- **Expected Result:**
  - Status 400, `{ error: "content_type must be: video, pdf, puzzle, quiz" }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending
