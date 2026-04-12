---
title: "Shared Puzzle Board Refactor"
description: "Extract duplicated chess board interaction logic from 3 files into shared interactive-puzzle-board module"
status: pending
priority: P1
effort: 8h
branch: feature/chess-lessons-platform
tags: [refactor, DRY, chessground, puzzle-player]
created: 2026-04-11
---

# Shared Puzzle Board Refactor

## Problem
3 files duplicate chess board interaction logic (2402 total LOC):
- `ExercisePuzzleViewer.js` (522 LOC) - modal puzzle viewer/grader
- `PuzzlePlayer.js` (1493 LOC) - multi-student grading + student solving
- `lesson-puzzle-player.js` (387 LOC) - lesson puzzle challenges

All implement: Chessground init, move validation, opponent auto-play, wrong move undo, legal moves calc, UCI parsing. Each has different Chessground `set()` patterns causing subtle bugs.

## Root Cause
Chessground's `set()` corrupts internal interaction state after multiple updates. Each file developed its own workaround independently.

## Solution
Extract shared `InteractivePuzzleBoard` class into `packages/client/src/shared/interactive-puzzle-board.js`. Consumers provide puzzle data + callbacks; shared module owns Chessground lifecycle.

## Phases

| # | Phase | File | Effort | Status |
|---|-------|------|--------|--------|
| 1 | [Extract shared module](phase-01-extract-shared-module.md) | `shared/interactive-puzzle-board.js` + `shared/chess-puzzle-utils.js` | 3h | pending |
| 2 | [Refactor ExercisePuzzleViewer](phase-02-refactor-exercise-puzzle-viewer.md) | `exercises/ExercisePuzzleViewer.js` | 1h | pending |
| 3 | [Refactor PuzzlePlayer](phase-03-refactor-puzzle-player.md) | `exercises/PuzzlePlayer.js` + sub-modules | 2h | pending |
| 4 | [Refactor lesson-puzzle-player](phase-04-refactor-lesson-puzzle-player.md) | `lessons/lesson-puzzle-player.js` | 1h | pending |
| 5 | [Integration testing](phase-05-integration-testing.md) | All flows | 1h | pending |

## Key Design Decisions
1. **UCI-based validation** in shared module (most reliable; SAN consumers convert beforehand)
2. **`opponentMovesFirst` config** -- default `true` for exercise puzzles, `false` for lesson puzzles where player moves first
3. **PuzzlePlayer's `board.move()` pattern** as foundation -- minimal `set()` calls + animation avoids Chessground corruption
4. **`sanMovesToUci()` utility** added to chess-puzzle-utils for lesson-puzzle-player's SAN-based hints

## Key Dependencies
- chess.js (move validation, FEN parsing)
- chessground 9.2.1 (board rendering)
- No new dependencies needed

## New Files Created
- `packages/client/src/shared/chess-puzzle-utils.js` (~70 LOC)
- `packages/client/src/shared/interactive-puzzle-board.js` (~180 LOC)
- `packages/client/src/exercises/puzzle-player-styles.js` (~200 LOC)
- `packages/client/src/exercises/puzzle-player-grading.js` (~200 LOC)
- `packages/client/src/exercises/puzzle-player-student-solve.js` (~150 LOC)

## Risk
- Chessground `set()` vs recreate strategy must be validated per consumer
- PuzzlePlayer uses `boardInstance.move()` for animation (unique); shared module must support this
- 10 call sites across ExercisePanel.js, StudentDashboard.js, lesson-player.js
- lesson-puzzle-player's `opponentMovesFirst: false` mode needs careful index alignment
