# UC-PPL-003: Solve Multi-Challenge Composed Puzzle (Composer-Built)

**Module:** puzzle-play
**Actor:** Student
**Last Updated:** 2026-05-03

## Description
Student solves a lesson puzzle composed of multiple sequential challenges built by admin in the puzzle composer.

## Preconditions
- Puzzle content item open (UC-PPL-001)
- Puzzle has ≥2 challenges in sequence

## Main Flow
1. Student solves challenge 1 (correct move sequence)
2. Success feedback shown; board transitions to challenge 2 position
3. Repeat for each challenge
4. After final challenge solved → overall completion recorded
5. Progress indicator updates between challenges (e.g., "Challenge 2 of 3")

## Postconditions
- All challenge completions persisted atomically or per-challenge
- Overall puzzle marked complete
- Score aggregated across all challenges

## Business Rules
- Each challenge is an independent FEN + solution line
- Failing challenge N does not reset challenges 1..N-1
- Student must complete all challenges to earn completion credit

## Related TCs
TC-PPL-003-01, TC-PPL-003-02, TC-PPL-003-03
