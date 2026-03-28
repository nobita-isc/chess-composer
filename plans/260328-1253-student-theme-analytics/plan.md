# Student Theme Analytics

**Goal:** Analyze per-student theme performance to identify weak areas.

**Design:** `design/student-analytics.pen` (Screen 1)

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | Backend API | Pending | Medium |
| 2 | Student Theme Dialog | Pending | Small |

## Data Available

- `student_exercises.puzzle_results` → `"1,0,1,1,0"` per-puzzle correct/wrong
- `weekly_exercises.puzzle_ids` → comma-separated, maps to `puzzles` table
- `puzzles.themes` → comma-separated theme tags per puzzle
- Cross-referencing these gives per-theme accuracy per student

## Architecture

```
Client clicks "Stats" on student
  → GET /api/students/:id/theme-analytics
  → Server joins student_exercises + weekly_exercises + puzzles
  → Computes per-theme: { theme, attempted, correct, accuracy }
  → Returns sorted by accuracy ascending (weakest first)
```

## Phase Details

See individual phase files for implementation steps.
