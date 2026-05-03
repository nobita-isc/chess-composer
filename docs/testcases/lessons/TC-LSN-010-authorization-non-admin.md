# TC-LSN-010: Authorization — Non-Admin Cannot Mutate

**UC:** [UC-LSN-010](../../usecases/lessons/UC-LSN-010-authorization-non-admin.md)
**Module:** lessons | **Last Updated:** 2026-05-03

---

## TC-LSN-010-01: Student cannot create lesson

- **Type:** Security
- **Priority:** Critical
- **Method:** API
- **Precondition:** Authenticated as student (role = "student"); course exists
- **Test Data:** `{ title: "Hacked Lesson" }`
- **Steps:**
  1. `POST /api/courses/:id/lessons` with student JWT
- **Expected Result:**
  - Status 403 Forbidden
  - No lesson row created in DB
  - Response body does not expose DB structure
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-010-02: Student cannot delete lesson

- **Type:** Security
- **Priority:** Critical
- **Method:** API
- **Precondition:** Student JWT; lesson exists
- **Steps:**
  1. `DELETE /api/lessons/:id` with student JWT
- **Expected Result:**
  - Status 403; lesson row unchanged in DB
- **Actual Result:** __ fill on execution __
- **Status:** Pending

---

## TC-LSN-010-03: Unauthenticated cannot update content

- **Type:** Security
- **Priority:** Critical
- **Method:** API
- **Precondition:** No auth token; content item exists
- **Steps:**
  1. `PUT /api/content/:id` with no Authorization header
- **Expected Result:**
  - Status 401 Unauthorized
  - DB unchanged
- **Actual Result:** __ fill on execution __
- **Status:** Pending
