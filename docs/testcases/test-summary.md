# Test Summary

**Last Updated:** 2026-05-03
**Modules:** lessons (LSN), weekly-exercises (WEX), puzzle-solving (PSL), puzzle-play (PPL)

---

## Module / UC / TC Count

| Module           | Use Cases | TC Files | Total TCs | Automated | Manual |
|------------------|-----------|----------|-----------|-----------|--------|
| lessons          | 10        | 10       | 27        | 20        | 7      |
| weekly-exercises | 15        | 15       | 40        | 30        | 10     |
| puzzle-solving   | 10        | 10       | 26        | 20        | 6      |
| puzzle-play      | 8         | 8        | 21        | 17        | 4      |
| **Total**        | **43**    | **43**   | **114**   | **87**    | **27** |

---

## Priority Distribution

| Priority | LSN | WEX | PSL | PPL | Total |
|----------|-----|-----|-----|-----|-------|
| P0       | 8   | 12  | 9   | 8   | 37    |
| P1       | 13  | 20  | 11  | 9   | 53    |
| P2       | 5   | 5   | 6   | 4   | 20    |
| Low      | 1   | 3   | 0   | 0   | 4     |

---

## Type Distribution

| Type         | LSN | WEX | PSL | PPL | Total |
|--------------|-----|-----|-----|-----|-------|
| Functional   | 14  | 19  | 16  | 13  | 62    |
| Negative     | 7   | 10  | 6   | 4   | 27    |
| Boundary     | 2   | 6   | 3   | 2   | 13    |
| Auth         | 0   | 0   | 0   | 3   | 3     |
| Security     | 4   | 5   | 1   | 0   | 10    |
| Manual-only  | 0   | 0   | 0   | 0   | 0     |

---

## Automation Status

| Module           | Spec File                        | Automated TCs | Manual-only TCs                        |
|------------------|----------------------------------|---------------|----------------------------------------|
| lessons          | `e2e/lessons.spec.ts`            | 20            | Visual, a11y                           |
| weekly-exercises | `e2e/weekly-exercises.spec.ts`   | 30            | Visual, a11y, mobile                   |
| puzzle-solving   | `e2e/puzzle-solving.spec.ts`     | 20            | Snapback timing, promotion dismiss, token expiry |
| puzzle-play      | `e2e/puzzle-play.spec.ts`        | 17            | Snapback timing, board flip visual     |

Manual-only criteria: animation smoothness, keyboard-only nav, screen-reader announcements, mobile touch gestures, performance perception, token-expiry UX.

---

## Coverage Matrix — Lessons (LSN)

| UC | Title | TC IDs | Count | Automation |
|----|-------|--------|-------|------------|
| UC-LSN-001 | Create Lesson | TC-LSN-001-01, 02, 03 | 3 | Mixed |
| UC-LSN-002 | View Lessons List | TC-LSN-002-01, 02 | 2 | Mixed |
| UC-LSN-003 | Inline Edit Title | TC-LSN-003-01, 02, 03 | 3 | Mixed |
| UC-LSN-004 | Inline Edit Description | TC-LSN-004-01, 02, 03 | 3 | Mixed |
| UC-LSN-005 | Delete Lesson | TC-LSN-005-01, 02, 03 | 3 | Mixed |
| UC-LSN-006 | Add Content Item | TC-LSN-006-01, 02, 03 | 3 | Mixed |
| UC-LSN-007 | Edit Video URL | TC-LSN-007-01, 02, 03 | 3 | Mixed |
| UC-LSN-008 | Delete Content Item | TC-LSN-008-01, 02 | 2 | Mixed |
| UC-LSN-009 | Selection Persistence | TC-LSN-009-01, 02 | 2 | Mixed |
| UC-LSN-010 | Auth: Non-Admin Blocked | TC-LSN-010-01, 02, 03 | 3 | Mixed |

---

## Coverage Matrix — Weekly Exercises (WEX)

| UC | Title | TC IDs | Count | Automation |
|----|-------|--------|-------|------------|
| UC-WEX-001 | Admin Creates Exercise | TC-WEX-001-01, 02, 03 | 3 | Mixed |
| UC-WEX-002 | Admin Lists Exercises | TC-WEX-002-01, 02 | 2 | Mixed |
| UC-WEX-003 | Admin Assigns Exercise | TC-WEX-003-01, 02, 03 | 3 | Mixed |
| UC-WEX-004 | Admin Views Assignments | TC-WEX-004-01, 02 | 2 | Mixed |
| UC-WEX-005 | Admin Grades Attempt | TC-WEX-005-01, 02, 03 | 3 | Mixed |
| UC-WEX-006 | Admin Marks Final | TC-WEX-006-01, 02 | 2 | Mixed |
| UC-WEX-007 | Admin Resets Score | TC-WEX-007-01, 02 | 2 | Mixed |
| UC-WEX-008 | Admin Updates Exercise | TC-WEX-008-01, 02, 03 | 3 | Mixed |
| UC-WEX-009 | Admin Deletes Exercise | TC-WEX-009-01, 02 | 2 | Mixed |
| UC-WEX-010 | Student View + Download | TC-WEX-010-01, 02 | 2 | Mixed |
| UC-WEX-011 | Student Records Attempt | TC-WEX-011-01, 02, 03 | 3 | Mixed |
| UC-WEX-012 | Student Uploads Work | TC-WEX-012-01, 02, 03, 04 | 4 | Mixed |
| UC-WEX-013 | Student Adds Notes | TC-WEX-013-01, 02 | 2 | Mixed |
| UC-WEX-014 | Student Views Grade | TC-WEX-014-01, 02 | 2 | Mixed |
| UC-WEX-015 | Auth: Student Blocked | TC-WEX-015-01, 02, 03 | 3 | Mixed |

---

## Coverage Matrix — Puzzle Solving (PSL)

| UC | Title | TC IDs | Count | Automation |
|----|-------|--------|-------|------------|
| UC-PSL-001 | Open Assigned Exercise Puzzle | TC-PSL-001-01, 02, 03 | 3 | Automated |
| UC-PSL-002 | Correct Move (Click) | TC-PSL-002-01, 02 | 2 | Automated |
| UC-PSL-003 | Correct Move (Drag) | TC-PSL-003-01, 02 | 2 | Automated |
| UC-PSL-004 | Reject Illegal Move | TC-PSL-004-01, 02 | 2 | Automated |
| UC-PSL-005 | Wrong-but-Legal Move | TC-PSL-005-01, 02, 03 | 3 | Mixed |
| UC-PSL-006 | Use Hint | TC-PSL-006-01, 02 | 2 | Automated |
| UC-PSL-007 | Reset Puzzle | TC-PSL-007-01, 02 | 2 | Automated |
| UC-PSL-008 | Promotion Picker | TC-PSL-008-01, 02, 03 | 3 | Mixed |
| UC-PSL-009 | Multi-Puzzle Navigation | TC-PSL-009-01, 02, 03 | 3 | Automated |
| UC-PSL-010 | Solve Full Puzzle → Persist Score | TC-PSL-010-01, 02, 03 | 3 | Mixed |

---

## Coverage Matrix — Puzzle Play (PPL)

| UC | Title | TC IDs | Count | Automation |
|----|-------|--------|-------|------------|
| UC-PPL-001 | Student Opens Lesson Puzzle | TC-PPL-001-01, 02, 03 | 3 | Automated |
| UC-PPL-002 | Solve Single-Challenge Puzzle | TC-PPL-002-01, 02 | 2 | Automated |
| UC-PPL-003 | Solve Multi-Challenge Puzzle | TC-PPL-003-01, 02, 03 | 3 | Automated |
| UC-PPL-004 | Wrong Move Snapback | TC-PPL-004-01, 02 | 2 | Automated |
| UC-PPL-005 | Admin Preview Mode | TC-PPL-005-01, 02, 03 | 3 | Automated |
| UC-PPL-006 | Reset Within Lesson | TC-PPL-006-01, 02 | 2 | Automated |
| UC-PPL-007 | Close Mid-Solve → Reopen | TC-PPL-007-01, 02 | 2 | Automated |
| UC-PPL-008 | Board Flip Black-to-Move | TC-PPL-008-01, 02 | 2 | Automated |

---

## Notable Gaps / Risks

### Resolved 2026-05-03
- ✅ `POST /api/exercises` — now requires `admin` role.
- ✅ `POST /api/exercises/:id/assign` — now requires `admin` role.
- ✅ `DELETE /api/exercises/:id` — now requires `admin` role.
- ✅ `PUT /api/student-exercises/:id/grade` — now requires `admin` role.

### Open
- `GET /api/exercises/:id/pdf` is gated by global `authRequired()` (any authenticated user can download). Intentional: students must be able to download/print their assigned exercise. If admin-only download is later required, add `requireRole('admin')` and update TC-WEX-001 / TC-WEX-010 expectations.
- PSL/PPL: Score aggregation formula for multi-challenge puzzles (PPL-003-03) not yet confirmed — assumed average; verify with product.
- PSL/PPL: Exact snapback duration threshold for input-blocking (PSL-005-03) not spec'd — manual tester to use 500ms as baseline.
- PPL-005-03: Server-side preview flag enforcement mechanism not confirmed in API spec; TC assumes JWT role claim is authoritative.
