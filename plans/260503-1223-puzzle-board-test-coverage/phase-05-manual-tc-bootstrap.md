# Phase 05 — Manual TC Bootstrap + Test Summary Update

## Context Links
- Existing structure: `docs/testcases/`, `docs/usecases/`
- Test summary: `docs/testcases/test-summary.md`
- Plan: `./plan.md`

## Overview
- **Priority:** P2
- **Status:** completed
- **Effort:** 3h
- **Description:** Author use cases + manual test cases for puzzle solving and puzzle play modules; mark which TCs are auto-covered by Playwright (Phases 3/4) vs manual-only.

## Key Insights
- Manual-only TCs cover what Playwright cannot: visual feedback timing, animation smoothness, screen-reader announcement, keyboard nav, mobile-touch responsiveness.
- Use existing TC ID conventions (`UC-{MOD}-{NNN}`, `TC-{MOD}-{NNN}-{NN}`).

## Requirements
**Functional**
- 10 UCs for puzzle-solving, 8 for puzzle-play.
- ~25 TCs for puzzle-solving, ~20 for puzzle-play.
- Test summary updated: coverage matrix, priority/type distribution, automation column.

**Non-functional**
- Each UC/TC file ≤200 lines.

## Architecture
```
docs/
├─ usecases/
│  ├─ puzzle-solving/UC-PSL-001..010.md
│  └─ puzzle-play/UC-PPL-001..008.md
└─ testcases/
   ├─ puzzle-solving/TC-PSL-001..025.md
   ├─ puzzle-play/TC-PPL-001..020.md
   └─ test-summary.md            # updated
```

## Related Code Files
**Modify**
- `docs/testcases/test-summary.md`

**Create**
- 10 + 8 use case files
- ~25 + ~20 test case files

**Delete:** none

## Implementation Steps
1. Read existing UC/TC files to mirror format exactly.
2. Use cases (puzzle-solving): open assigned, click move, drag move, illegal handling, wrong attempt, full solve, hint, reset, promotion, multi-puzzle exercise.
3. Use cases (puzzle-play): open lesson puzzle, complete, multi-challenge, snapback, admin preview, reset, resume, black-to-move flip.
4. Test cases: derive 2-3 TCs per UC covering happy + edge + negative.
5. For each TC, add `Automation: Playwright (puzzle-solving.spec.ts §N)` OR `Automation: Manual`.
6. Update test-summary: append puzzle-solving + puzzle-play modules to coverage matrix.

## Todo List
- [x] 10 puzzle-solving UCs (UC-PSL-001..010)
- [x] 8 puzzle-play UCs (UC-PPL-001..008)
- [x] 25 puzzle-solving TCs (TC-PSL-001..025)
- [x] 20 puzzle-play TCs (TC-PPL-001..020)
- [x] test-summary.md updated with automation column (marked Playwright vs Manual)

## Success Criteria
- All files created (18 UC files + 45 TC files).
- Coverage matrix lists every TC with priority + automation status.
- 47 TCs bootstrapped (PSL 25 + PPL 20 + 2 summary rows).
- test-summary.md updated with puzzle-solving + puzzle-play modules.

## Risk Assessment
- **Drift** — TC IDs collide with existing if numbering shared; check before assigning.
- **Auto vs manual mislabel** — cross-reference Phase 3/4 specs by name.

## Security Considerations
- Document: test student credentials are local-only seeded; never reuse in prod.

## Next Steps
- Maintain TC files alongside spec changes.
