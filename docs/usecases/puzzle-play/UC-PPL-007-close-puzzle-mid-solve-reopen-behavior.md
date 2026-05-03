# UC-PPL-007: Close Puzzle Mid-Solve → Reopen Behavior

**Module:** puzzle-play
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student navigates away from a lesson puzzle before completing it, then returns. System restores the puzzle to starting position (no partial state persisted).

## Preconditions
- Student has opened a lesson puzzle and made ≥1 move without completing

## Main Flow
1. Student navigates away (clicks another lesson item or closes browser tab)
2. No partial attempt written to backend
3. Student returns to the same puzzle content item
4. Board renders at starting position (not mid-solve state)
5. Student begins solving from scratch; previous wrong/hint counts lost

## Postconditions
- Board at starting FEN on reopen
- Client state cleared
- No dangling partial attempt in DB

## Business Rules
- Partial state is intentionally not persisted (simplicity + no resume complexity)
- If puzzle was previously completed, reopen shows solved/read-only state
- Wrong/hint counters from abandoned attempt are discarded

## Related TCs
TC-PPL-007-01, TC-PPL-007-02
