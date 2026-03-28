# Phase 2: Student Theme Analytics Dialog

## Overview
- Priority: High
- Status: Pending
- Effort: Small
- Depends on: Phase 1

## Design Reference
- Screen 1 in `design/student-analytics.pen`

## Modified Files
- `packages/client/src/auth/UserManagementPanel.js` — replace current performance dialog

## UI Components

### Enhanced Performance Dialog (replaces current)
Uses `pv-overlay` + `gd-dialog` pattern (consistent with app).

**Layout:**
1. Header: "Performance: {name}" + close button
2. Summary cards row (4 cards):
   - Total Exercises
   - Avg Score (brand color)
   - Strongest Theme (green)
   - Weakest Theme (red)
3. Theme Breakdown table:
   - Columns: Theme | Attempted | Correct | Accuracy (bar)
   - Sorted weakest first
   - Color-coded bars: <50% red, 50-75% yellow, >75% green
4. Footer: Close button

### Accuracy Bar Component
- Background: light tint (red/yellow/green based on %)
- Fill: solid color, width proportional to accuracy %
- Text: percentage label overlaid

## Implementation Steps

- [ ] Update showStudentPerformance() to call theme-analytics API
- [ ] Render 4 summary cards (gd-stats pattern)
- [ ] Render theme breakdown table with accuracy bars
- [ ] Color logic: <50% red (#dc2626), 50-75% yellow (#f59e0b), >75% green (#059669)
- [ ] Handle empty state (no graded exercises)
- [ ] Keep existing history table below theme breakdown

## Success Criteria
- Dialog shows per-theme accuracy with visual bars
- Weakest themes prominently visible at top
- Consistent with app's existing dialog styling
