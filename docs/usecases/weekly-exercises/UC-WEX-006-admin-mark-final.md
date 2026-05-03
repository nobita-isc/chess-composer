# UC-WEX-006: Admin Marks Attempt as Final

**Module:** weekly-exercises | **Actor:** Admin | **Priority:** P1

## Description
Admin locks a student's graded attempt by marking it final; student then sees it as read-only.

## Preconditions
- Admin authenticated
- `student_exercise` record exists, score set

## Main Flow
1. Admin clicks "Mark Final" for a student assignment
2. System PUTs `/api/student-exercises/:id/mark-final`
3. Service sets `is_final = true` on the record
4. Returns 200 with updated data

## Alternate Flows
- 2a. Assignment not found → 400 from service
- 2b. Non-admin → 403 (`requireRole('admin')` enforced)

## Postconditions
- `student_exercises.is_final = true`
- Student UI shows grade as final/locked

## Related
- API: `PUT /api/student-exercises/:id/mark-final`
- Middleware: `requireRole('admin')`
- TCs: TC-WEX-006-01..02
