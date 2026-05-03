# UC-WEX-002: Admin Lists Exercises

**Module:** weekly-exercises | **Actor:** Admin | **Priority:** P1

## Description
Admin views all weekly exercises with stats (assignment counts, completion rates).

## Preconditions
- Admin authenticated

## Main Flow
1. Admin navigates to exercises list page
2. System GETs `/api/exercises`
3. Returns array of exercises with stats
4. Admin can also check `/api/exercises/current-week` for current week metadata

## Alternate Flows
- 2a. No exercises exist → returns empty array
- 2b. `/api/exercises/current-week` → returns `has_exercise: false` when none exist this week

## Postconditions
- Read-only; no state change

## Related
- API: `GET /api/exercises`, `GET /api/exercises/current-week`
- TCs: TC-WEX-002-01..02
