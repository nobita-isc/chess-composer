# TC-LSN-007: Edit Video URL Inline

**UC:** [UC-LSN-007](../../usecases/lessons/UC-LSN-007-edit-video-url.md)
**Module:** lessons | **Last Updated:** 2026-05-03

---

## TC-LSN-007-01: Valid https URL saved

- **Type:** Functional
- **Priority:** High
- **Method:** API
- **Precondition:** Admin JWT; video content item exists
- **Test Data:** `{ video_url: "https://www.youtube.com/watch?v=abc123" }`
- **Steps:**
  1. `PUT /api/content/:id` with `{ video_url: "https://www.youtube.com/watch?v=abc123" }`
- **Expected Result:**
  - Status 200, `{ success: true }`
  - `lesson_content.video_url` updated in DB
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-007-02: javascript: scheme rejected

- **Type:** Security
- **Priority:** Critical
- **Method:** API
- **Precondition:** Admin JWT; video content item exists
- **Test Data:** `{ video_url: "javascript:alert(1)" }`
- **Steps:**
  1. `PUT /api/content/:id` with `{ video_url: "javascript:alert(1)" }`
- **Expected Result:**
  - Status 400, `{ error: "video_url must be a valid http or https URL" }`
  - DB unchanged
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-007-03: Malformed URL rejected

- **Type:** Negative
- **Priority:** High
- **Method:** API
- **Precondition:** Admin JWT; video content item exists
- **Test Data:** `{ video_url: "not a url at all" }`
- **Steps:**
  1. `PUT /api/content/:id` with `{ video_url: "not a url at all" }`
- **Expected Result:**
  - Status 400, `{ error: "video_url must be a valid http or https URL" }`
- **Actual Result:** __ fill on execution __
- **Status:** Pending
