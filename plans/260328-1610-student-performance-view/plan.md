# Student Performance View Enhancement

**Goal:** Show students their own theme analytics in the Performance tab, similar to admin's stats dialog.

## Current State
- Performance tab exists with: 3 stat cards (Completed, Avg Score, Solved) + Score History table
- Theme analytics API exists: `GET /api/students/:id/theme-analytics`
- Student dashboard has `studentId` available via auth

## Plan: Single Phase

**Add theme breakdown section** between the stats cards and score history.

### Layout (top to bottom)
1. **Summary cards** (existing: Completed, Avg Score, Solved) + **2 new cards**: Strongest Theme, Weakest Theme
2. **Theme Breakdown table** (new): Theme | Tried | Correct | Accuracy bar — sorted weakest first, color-coded
3. **Score History** (existing)

### Implementation Steps
- [ ] Call `apiClient.getStudentThemeAnalytics(studentId)` alongside existing performance API
- [ ] Add Strongest/Weakest cards to stats row
- [ ] Add theme breakdown table with accuracy bars (reuse same HTML pattern from admin dialog)
- [ ] Handle empty state (no theme data)
- [ ] Ensure student can only see their own data (already enforced by studentId from auth)

### Files to Modify
- `packages/client/src/auth/StudentDashboard.js` — update `renderPerformanceTab()`

### Security
- No new API needed — reuses existing authenticated endpoint
- Student ID comes from JWT token, not URL — safe

### Effort: Small (1 file, ~40 lines)
