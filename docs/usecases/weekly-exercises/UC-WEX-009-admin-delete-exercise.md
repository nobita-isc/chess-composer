# UC-WEX-009: Admin Deletes Exercise

**Module:** weekly-exercises | **Actor:** Admin | **Priority:** P1

## Description
Admin deletes a weekly exercise; associated student_exercise records cascade-deleted.

## Preconditions
- Admin authenticated
- Exercise exists

## Main Flow
1. Admin clicks delete on exercise
2. System shows confirmation
3. Admin confirms
4. System DELETEs `/api/exercises/:id`
5. Returns 200 "Exercise deleted"

## Alternate Flows
- 3a. Admin cancels → no change
- 4a. Exercise not found / already deleted → 400 from repo
- 4b. Note: `requireRole` not applied on this route — any authenticated user can delete (potential gap)

## Postconditions
- `weekly_exercises` row removed
- `student_exercises` rows cascade-deleted

## Related
- API: `DELETE /api/exercises/:id`
- TCs: TC-WEX-009-01..02
