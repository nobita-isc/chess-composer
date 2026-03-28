# Phase 1: Backend API for Theme Analytics

## Overview
- Priority: High
- Status: Pending
- Effort: Medium

## New Files
- `packages/server/src/exercises/ThemeAnalyticsService.js` — computation logic

## Modified Files
- `packages/server/src/routes/students.js` — add GET /:id/theme-analytics
- `packages/client/src/api/ApiClient.js` — add client method

## API Endpoints

### GET /api/students/:id/theme-analytics
Returns per-theme accuracy for a single student across all graded exercises.

**Response:**
```json
{
  "success": true,
  "data": {
    "student": { "id": "...", "name": "Victoria Bui" },
    "summary": {
      "total_exercises": 8,
      "average_score": 72,
      "strongest": { "theme": "pin", "accuracy": 92 },
      "weakest": { "theme": "skewer", "accuracy": 33 }
    },
    "themes": [
      { "theme": "skewer", "label": "Skewer", "attempted": 6, "correct": 2, "accuracy": 33 },
      { "theme": "deflection", "label": "Deflection", "attempted": 8, "correct": 4, "accuracy": 50 },
      { "theme": "fork", "label": "Fork", "attempted": 12, "correct": 8, "accuracy": 67 },
      { "theme": "backrankmate", "label": "Back Rank Mate", "attempted": 8, "correct": 6, "accuracy": 75 },
      { "theme": "pin", "label": "Pin", "attempted": 15, "correct": 14, "accuracy": 92 }
    ]
  }
}
```

## Algorithm (ThemeAnalyticsService)

```javascript
getStudentThemeAnalytics(studentId):
  1. Fetch all graded student_exercises for student
  2. For each exercise:
     a. Get exercise.puzzle_ids → split to array
     b. Get student_exercise.puzzle_results → split to array
     c. Fetch each puzzle from DB → get puzzle.themes
     d. For each puzzle[i]:
        - themes = puzzle.themes.split(',')
        - result = puzzle_results[i] === '1'
        - For each theme: increment attempted, if result increment correct
  3. Compute accuracy = (correct / attempted) * 100
  4. Sort by accuracy ascending (weakest first)
  5. Return with summary stats
```

## Implementation Steps

- [ ] Create ThemeAnalyticsService with getStudentThemeAnalytics()
- [ ] Add GET /api/students/:id/theme-analytics route
- [ ] Add ApiClient.getStudentThemeAnalytics(id)
- [ ] Write tests for ThemeAnalyticsService

## Success Criteria
- API returns correct per-theme accuracy data
- Sorted by weakest theme first
- Handles edge cases: no graded exercises, puzzles with no themes
