# UC-PPL-005: Admin Preview Mode — Board Interactive, NO Progress Write

**Module:** puzzle-play
**Actor:** Admin
**Last Updated:** 2026-05-03

## Description
Admin views a lesson puzzle content item in preview mode. The board is fully interactive but no student progress is written to the backend.

## Preconditions
- Admin is authenticated with `admin` role
- Lesson contains a puzzle content item (published or draft)

## Main Flow
1. Admin opens lesson in admin view and selects puzzle content item
2. System detects admin role → renders board in preview mode
3. Board is fully interactive (admin can play moves to verify solution)
4. No attempt record created; no progress API called
5. Admin can reset and replay freely

## Postconditions
- No `lesson_puzzle_attempts` rows created for admin session
- Board state is ephemeral (resets on navigate away)

## Business Rules
- Role check must be server-side; client-side flag alone is insufficient
- Admin preview applies to both published and draft puzzles
- Student role must never enter admin preview path

## Related TCs
TC-PPL-005-01, TC-PPL-005-02, TC-PPL-005-03
