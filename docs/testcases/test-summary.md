# Test Summary

**Last Updated:** 2026-05-03
**Modules:** lessons (LSN), weekly-exercises (WEX)

---

## Module / UC / TC Count

| Module           | Use Cases | TC Files | Total TCs |
|------------------|-----------|----------|-----------|
| lessons          | 10        | 10       | 27        |
| weekly-exercises | 15        | 15       | 40        |
| **Total**        | **25**    | **25**   | **67**    |

---

## Priority Distribution

| Priority | LSN | WEX | Total |
|----------|-----|-----|-------|
| Critical | 8   | 12  | 20    |
| High     | 13  | 20  | 33    |
| Medium   | 5   | 5   | 10    |
| Low      | 1   | 3   | 4     |

---

## Type Distribution

| Type         | LSN | WEX | Total |
|--------------|-----|-----|-------|
| Functional   | 14  | 19  | 33    |
| Negative     | 7   | 10  | 17    |
| Boundary     | 2   | 6   | 8     |
| Security     | 4   | 5   | 9     |

---

## Coverage Matrix — Lessons (LSN)

| UC | Title | TC IDs | Count |
|----|-------|--------|-------|
| UC-LSN-001 | Create Lesson | TC-LSN-001-01, 02, 03 | 3 |
| UC-LSN-002 | View Lessons List | TC-LSN-002-01, 02 | 2 |
| UC-LSN-003 | Inline Edit Title | TC-LSN-003-01, 02, 03 | 3 |
| UC-LSN-004 | Inline Edit Description | TC-LSN-004-01, 02, 03 | 3 |
| UC-LSN-005 | Delete Lesson | TC-LSN-005-01, 02, 03 | 3 |
| UC-LSN-006 | Add Content Item | TC-LSN-006-01, 02, 03 | 3 |
| UC-LSN-007 | Edit Video URL | TC-LSN-007-01, 02, 03 | 3 |
| UC-LSN-008 | Delete Content Item | TC-LSN-008-01, 02 | 2 |
| UC-LSN-009 | Selection Persistence | TC-LSN-009-01, 02 | 2 |
| UC-LSN-010 | Auth: Non-Admin Blocked | TC-LSN-010-01, 02, 03 | 3 |

---

## Coverage Matrix — Weekly Exercises (WEX)

| UC | Title | TC IDs | Count |
|----|-------|--------|-------|
| UC-WEX-001 | Admin Creates Exercise | TC-WEX-001-01, 02, 03 | 3 |
| UC-WEX-002 | Admin Lists Exercises | TC-WEX-002-01, 02 | 2 |
| UC-WEX-003 | Admin Assigns Exercise | TC-WEX-003-01, 02, 03 | 3 |
| UC-WEX-004 | Admin Views Assignments | TC-WEX-004-01, 02 | 2 |
| UC-WEX-005 | Admin Grades Attempt | TC-WEX-005-01, 02, 03 | 3 |
| UC-WEX-006 | Admin Marks Final | TC-WEX-006-01, 02 | 2 |
| UC-WEX-007 | Admin Resets Score | TC-WEX-007-01, 02 | 2 |
| UC-WEX-008 | Admin Updates Exercise | TC-WEX-008-01, 02, 03 | 3 |
| UC-WEX-009 | Admin Deletes Exercise | TC-WEX-009-01, 02 | 2 |
| UC-WEX-010 | Student View + Download | TC-WEX-010-01, 02 | 2 |
| UC-WEX-011 | Student Records Attempt | TC-WEX-011-01, 02, 03 | 3 |
| UC-WEX-012 | Student Uploads Work | TC-WEX-012-01, 02, 03, 04 | 4 |
| UC-WEX-013 | Student Adds Notes | TC-WEX-013-01, 02 | 2 |
| UC-WEX-014 | Student Views Grade | TC-WEX-014-01, 02 | 2 |
| UC-WEX-015 | Auth: Student Blocked | TC-WEX-015-01, 02, 03 | 3 |

---

## Notable Gaps / Risks

### Resolved 2026-05-03
- ✅ `POST /api/exercises` — now requires `admin` role.
- ✅ `POST /api/exercises/:id/assign` — now requires `admin` role.
- ✅ `DELETE /api/exercises/:id` — now requires `admin` role.
- ✅ `PUT /api/student-exercises/:id/grade` — now requires `admin` role.

### Open
- `GET /api/exercises/:id/pdf` is gated by global `authRequired()` (any authenticated user can download). Intentional: students must be able to download/print their assigned exercise. If admin-only download is later required, add `requireRole('admin')` and update TC-WEX-001 / TC-WEX-010 expectations.
