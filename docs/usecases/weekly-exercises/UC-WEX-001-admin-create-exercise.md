# UC-WEX-001: Admin Creates Weekly Exercise

**Module:** weekly-exercises | **Actor:** Admin | **Priority:** P0

## Description
Admin creates a weekly exercise by selecting puzzle IDs and optionally a name and week start date.

## Preconditions
- Admin authenticated
- At least one puzzle exists in the system

## Main Flow
1. Admin navigates to weekly exercises admin UI
2. Admin selects puzzle IDs and optionally provides name, weekStart
3. System POSTs `/api/exercises` with `{ puzzleIds, name, weekStart }`
4. System creates exercise record + generates PDF
5. Returns 201 with exercise object

## Alternate Flows
- 3a. `puzzleIds` missing or empty array → 400 "At least one puzzle ID is required"
- 4a. Service error (invalid puzzle IDs) → 400 with error message

## Postconditions
- `weekly_exercises` row created
- PDF available at `/api/exercises/:id/pdf`

## Related
- API: `POST /api/exercises`
- TCs: TC-WEX-001-01..03
