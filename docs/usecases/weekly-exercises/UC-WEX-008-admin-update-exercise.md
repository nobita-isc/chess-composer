# UC-WEX-008: Admin Updates Exercise Name

**Module:** weekly-exercises | **Actor:** Admin | **Priority:** P2

## Description
Admin renames an existing weekly exercise. Max 200 characters.

## Preconditions
- Admin authenticated
- Exercise exists

## Main Flow
1. Admin edits exercise name field
2. System PUTs `/api/exercises/:id` with `{ name }`
3. Server trims, validates length ≤ 200
4. Updates `weekly_exercises.name`
5. Returns 200

## Alternate Flows
- 3a. `name` empty/whitespace → 400 "Name is required"
- 3b. `name` > 200 chars → 400 "Name must be 200 characters or less"
- 3c. Exercise not found → 404
- 3d. Non-admin → 403

## Postconditions
- `weekly_exercises.name` updated

## Related
- API: `PUT /api/exercises/:id`
- Middleware: `requireRole('admin')`
- TCs: TC-WEX-008-01..03
