# Code Review: UI Modernization, Grading System & Bug Fixes

**Reviewer:** code-reviewer
**Date:** 2026-03-28
**Commits:** bfc12db, ce29e7e, b68cd14
**Base:** fa5af61

---

## Scope

- **Files reviewed:** 17 source files (excluding docs/logs)
- **LOC changed:** ~1,964 added / ~472 removed
- **Focus areas:** Grading logic, dropdown positioning, XSS, input validation, DRY, event listener leaks, timezone fix

### Scout Findings (Edge Cases)

1. `formatWeekLabel` still uses `new Date(weekStart)` which parses YYYY-MM-DD as UTC midnight -- potential off-by-one day in negative UTC offsets
2. `updateExerciseName` has no existence check -- silent no-op if ID doesn't exist
3. Cancel button selector `.btn-outline` in CreateExerciseDialog is fragile -- will bind to wrong element if another `.btn-outline` is added
4. Dropdown close listeners attached via `setTimeout(() => document.addEventListener(...), 0)` -- race condition if two dropdowns open in rapid succession
5. `navigateTo` in ExercisePuzzleViewer destroys and recreates entire DOM on every puzzle switch -- recursive pattern with potential stack growth for very long exercise sets
6. `gradeAndSave` fires API call on every click with no debounce -- rapid clicking sends duplicate requests

---

## Overall Assessment

Solid batch of work. The dropdown fix (absolute -> fixed positioning) is a good pattern. The grading mode in ExercisePuzzleViewer is well-structured with keyboard shortcuts and auto-advance. The timezone fix in ExerciseService is correct. Main concerns: significant DRY violations across dropdown/table patterns, missing server-side validation on the new PUT endpoint, and some UI patterns that could cause subtle bugs.

**Build status:** Passes cleanly.

---

## Critical Issues

### C1. No Auth Role Check on PUT /api/exercises/:id

**File:** `packages/server/src/routes/exercises.js:144`

The exercises routes are behind `authRequired()` middleware (line 86 of index.js), so unauthenticated access is blocked. However, the PUT endpoint has no `requireRole('admin')` check -- any authenticated student can rename exercises.

Other mutating endpoints (POST, DELETE, POST /:id/assign) also lack role checks in this file, so this may be a pre-existing pattern. But the new PUT endpoint should be consistent with what's expected.

**Impact:** A student with a valid JWT could rename any exercise.

**Fix:**
```js
import { requireRole } from '../middleware/roleMiddleware.js';
exercises.put('/:id', requireRole('admin'), async (c) => { ... });
```

**Recommendation:** Add role guards to all mutating exercise endpoints (POST, PUT, DELETE, assign). This is a pre-existing gap, not introduced by this diff, but worth addressing alongside the new endpoint.

---

### C2. No Existence Verification in updateExerciseName

**File:** `packages/server/src/exercises/ExerciseRepository.js:127-129`

```js
updateExerciseName(id, name) {
  database.run('UPDATE weekly_exercises SET name = ? WHERE id = ?', [name, id]);
}
```

If `id` doesn't exist, this silently succeeds with 0 rows affected. The PUT route returns `{ success: true }` regardless.

**Impact:** Client gets success response for non-existent exercise IDs. No data corruption, but misleading API behavior.

**Fix:**
```js
updateExerciseName(id, name) {
  const result = database.run('UPDATE weekly_exercises SET name = ? WHERE id = ?', [name, id]);
  if (result.changes === 0) {
    throw new Error('Exercise not found');
  }
}
```

---

## High Priority

### H1. Grading Auto-Save Race Condition

**File:** `packages/client/src/exercises/ExercisePuzzleViewer.js:313-346`

`gradeAndSave` is async and fires on every button click/keyboard press with no guard. If user rapidly hits C-C-C:
1. Multiple concurrent API calls to `gradeExercise`
2. `navigateTo` fires while previous save is still in-flight
3. Previous overlay is removed, `_showStatus` call on line 332 targets removed DOM element

**Impact:** Duplicate API calls, potential UI glitch where status banner targets destroyed element.

**Fix:** Add a saving guard:
```js
let isSaving = false;
const gradeAndSave = async (result) => {
  if (isSaving) return;
  isSaving = true;
  try {
    // ... existing logic
  } finally {
    isSaving = false;
  }
};
```

### H2. Missing Name Length Validation on PUT Endpoint

**File:** `packages/server/src/routes/exercises.js:149`

Only checks `!name || !name.trim()`. No upper bound on name length. A malicious request could send a multi-MB name string.

**Fix:** Add `if (name.trim().length > 200) return c.json({ ... }, 400);`

### H3. formatWeekLabel Still Uses UTC-parsed Dates

**File:** `packages/server/src/exercises/ExerciseService.js:53-58`

`getWeekStart` and `getWeekEnd` were correctly fixed to use local time. But `formatWeekLabel` still does:
```js
const start = new Date(weekStart); // "2026-03-23" parsed as UTC midnight
```

In timezone UTC-X (e.g., UTC-5), `new Date("2026-03-23")` is March 22 at 19:00 local. `toLocaleDateString` would show "Mar 22" instead of "Mar 23".

**Impact:** Week labels could display wrong dates for users in negative UTC offsets.

**Fix:**
```js
formatWeekLabel(weekStart, weekEnd) {
  const [sy, sm, sd] = weekStart.split('-').map(Number);
  const [ey, em, ed] = weekEnd.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  // ...
}
```

---

## Medium Priority

### M1. Massive DRY Violation: Dropdown Pattern Duplicated ~8 Times

**Files:** ExercisePanel.js (4x), UserManagementPanel.js (2x), AdminPanel.js (2x)

The dropdown creation pattern (create element, set fixed position from getBoundingClientRect, append to body, setTimeout listener, closeDd) is copy-pasted identically. Each is ~15 lines.

**Impact:** Maintenance burden. Any fix (e.g., viewport boundary check) must be applied 8 times.

**Recommendation:** Extract utility function:
```js
function showDropdown(triggerBtn, items, container = document.body) { ... }
```

### M2. DRY Violation: Students Tab Rendered Twice with Nearly Identical Code

**File:** `packages/client/src/exercises/ExercisePanel.js`

`renderStudentsTab` appears at lines ~486 and ~1346 with virtually identical HTML and event binding. The file is 1,631 lines -- well over the 200-line guideline.

**Recommendation:** Extract shared `renderStudentsTab(content, apiClient, callbacks)` into a separate module.

### M3. DRY Violation: Badge Functions Redefined in Every Render

`skillBadgeFn`, `roleBadge`, `reasonBadge`, `statusBadge` are defined as closures inside render functions across 3 files. They are pure functions with no closure dependencies.

**Recommendation:** Move to shared utility module.

### M4. ExercisePanel.js Exceeds 200-Line Guideline by 8x

At 1,631 lines, this file violates the project's modularization rule. Logical separation boundaries:
- Students tab rendering -> `students-tab-renderer.js`
- Exercise details dialog -> `exercise-details-dialog.js`
- Dropdown utility -> `dropdown-utils.js`
- Badge utilities -> `badge-utils.js`

### M5. Fragile Cancel Button Selector in CreateExerciseDialog

**File:** `packages/client/src/exercises/CreateExerciseDialog.js:219`

```js
innerEl.querySelector('.btn-outline').addEventListener('click', () => closeDialog(null));
```

Selects first `.btn-outline` in the dialog. If "Generate New Puzzles" button (also `.btn-outline`, line 121) is still in DOM, this binds to the wrong element.

**Fix:** Use a data attribute: `data-action="cancel"` and select by that.

### M6. UserManagementPanel Delete Still Uses confirm()/alert()

**File:** `packages/client/src/auth/UserManagementPanel.js:131, 276`

The students tab in ExercisePanel was upgraded to use `showConfirmDialog` with styled modals. But user deletion in UserManagementPanel still uses native `confirm()` and chains `.then()/.catch()` instead of async/await.

**Impact:** Inconsistent UX between panels. The `confirm()` blocks the main thread.

**Fix:** Use `showConfirmDialog` pattern matching ExercisePanel.

### M7. Exercise Rename Uses prompt()

**File:** `packages/client/src/exercises/ExercisePanel.js:950`

```js
const newName = prompt('Enter new exercise name:', currentName);
```

Native `prompt()` looks jarring compared to the styled dialogs used elsewhere. Also blocks the thread.

---

## Low Priority

### L1. Password Toggle Logic Duplicated Between LoginView and UserManagementPanel

**File:** `packages/client/src/auth/LoginView.js:68-78` vs `UserManagementPanel.js:566-585`

LoginView has inline toggle logic; UserManagementPanel has a reusable `setupPasswordToggles`. LoginView should use the same utility.

### L2. Unused Variable `monday` in getWeekEnd

**File:** `packages/server/src/exercises/ExerciseService.js:42`

```js
const monday = new Date(y, m - 1, d);  // never used
const sunday = new Date(y, m - 1, d + 6);
```

### L3. Keyboard Shortcut C/X May Conflict with Chess Board

In grading mode, pressing C or X triggers grading. If a text input or the chess board itself processes keyboard events, there could be conflict. The guard only checks `INPUT`/`TEXTAREA` tags, not contenteditable elements or the chessground board.

### L4. Fixed Dropdown Doesn't Check Viewport Boundaries

All dropdowns position using `top: rect.bottom + 4px`. If the trigger button is near the bottom of the viewport, the dropdown will overflow below the screen.

---

## Positive Observations

1. **Timezone fix is correct** -- `new Date(y, m-1, d)` properly avoids UTC parsing issues for getWeekStart/getWeekEnd
2. **Grading context design is clean** -- shared mutable `gradingCtx` passed through navigation is an elegant approach for maintaining state across puzzle switches
3. **Keyboard shortcuts (C/X)** -- good UX for rapid grading workflow
4. **Fixed positioning for dropdowns** -- correct solution for escaping overflow:hidden ancestors
5. **escapeHtml used consistently** -- all user-provided data in HTML templates is escaped, no XSS vectors found
6. **onGraded callback only fires on close, not navigation** -- proper separation prevents premature dialog refresh
7. **GradeDialog z-index fix** (55000 > 50000) solves stacking correctly
8. **Password toggle with eye/eye-off SVG swap** -- polished UX detail
9. **Multiple exercises per week** -- removing the artificial duplicate check is a good product decision

---

## Recommended Actions (Prioritized)

1. **[Critical]** Add `requireRole('admin')` to PUT /api/exercises/:id (and audit other mutating endpoints)
2. **[Critical]** Add existence check in `updateExerciseName` -- return 404 if not found
3. **[High]** Add saving guard to `gradeAndSave` to prevent race conditions
4. **[High]** Fix `formatWeekLabel` to parse dates as local time, not UTC
5. **[High]** Add name length validation (max 200 chars) on PUT endpoint
6. **[Medium]** Extract dropdown utility to reduce ~120 lines of duplication
7. **[Medium]** Modularize ExercisePanel.js (1,631 lines -> multiple focused modules)
8. **[Medium]** Use data-action attribute instead of class selector for cancel button
9. **[Medium]** Replace remaining confirm()/prompt()/alert() calls with styled dialogs
10. **[Low]** Unify password toggle logic -- have LoginView use setupPasswordToggles
11. **[Low]** Remove unused `monday` variable in getWeekEnd
12. **[Low]** Add viewport boundary check for dropdown positioning

---

## Metrics

| Metric | Value |
|--------|-------|
| Build | Passes |
| Type Coverage | N/A (vanilla JS, no TS) |
| Test Coverage | Not measured (no tests in diff) |
| Linting Issues | Not run |
| Critical Issues | 2 |
| High Issues | 3 |
| Medium Issues | 7 |
| Low Issues | 4 |
| Files > 200 lines | ExercisePanel.js (1631), AdminPanel.js (724), UserManagementPanel.js (600), ExercisePuzzleViewer.js (495) |

---

## Unresolved Questions

1. Are exercise routes intentionally left without role guards? All mutating endpoints in `/api/exercises` (POST, PUT, DELETE, assign) lack `requireRole('admin')`. Compare with `student-exercises.js` where `mark-final` and `reset-score` DO have `requireRole('admin')`. Inconsistent policy.
2. The grading endpoint (`PUT /api/student-exercises/:id/grade`) also lacks `requireRole('admin')` -- any authenticated student can grade any assignment. Is this intentional for self-grading workflows, or should teacher grading require admin role?
3. `findExerciseByWeek` (singular) in ExerciseRepository.js is now dead code -- no callers remain after the switch to `findExercisesByWeek` (plural). Safe to remove.
