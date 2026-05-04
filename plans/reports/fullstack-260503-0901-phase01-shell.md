# Phase 01 Report — Shell: 3-Pane Workspace

**Status:** complete
**Build:** pass (67 modules, 0 errors)

## Files Created

| File | Lines | Purpose |
|---|---|---|
| `packages/client/src/lessons/shared/pane-splitter.js` | 132 | Shared splitter — exports `createSplitter` (high-level) + `attachSplitterRaw` (low-level, used by lesson-player) |
| `packages/client/src/lessons/course-list-pane.js` | 114 | Left pane: course list with select / edit / assign / delete row actions |
| `packages/client/src/lessons/lesson-list-pane.js` | 138 | Middle pane: lessons for selected course, add / rename / delete |
| `packages/client/src/lessons/lesson-editor-pane.js` | 77 | Right pane skeleton — Phase 2/3 placeholder sections |
| `packages/client/src/lessons/course-mgmt-breadcrumb.js` | 42 | Breadcrumb `Courses › Course › Lesson`, clickable segments |
| `packages/client/src/lessons/course-mgmt-dialogs.js` | 145 | Create/edit course dialog + assign-students dialog (extracted for size compliance) |

## Files Modified

| File | Lines | Change |
|---|---|---|
| `packages/client/src/lessons/CourseManagementPage.js` | 149 | Full rewrite as orchestrator; holds `sel` state; wires 3 panes + 2 splitters + breadcrumb |
| `packages/client/src/lessons/lesson-player.js` | ~477 | Removed 32-line inline `attachSplitter`; replaced with `import { attachSplitterRaw as attachSplitter }` — behavior identical |

## Deviations from Phase Spec

- `course-mgmt-dialogs.js` added (not in phase file) — necessary to keep `CourseManagementPage.js` ≤200 lines. Dialogs module is a natural split; no logic changed.
- `lesson-editor-pane.js` skeleton does not attempt a real lesson fetch (Phase 2 will wire courseId through). Static placeholder rendered immediately to avoid an unnecessary API call with wrong courseId.
- `openLessonPlayer` (preview action) removed from `CourseManagementPage.js` orchestrator — preview button was on old flat table. Course-list-pane has edit/assign/delete actions only. Preview can be re-added in Phase 2 from the editor pane.

## Syntax Checks

All 7 files passed `node --check`. No warnings.

## Build

```
✓ 67 modules transformed (was 66 pre-phase)
dist/assets/index-BCFhGQTt.js  418.64 kB │ gzip: 115.09 kB
✓ built in 1.23s
```

## Manual-Test Checklist (for user)

1. Navigate to `/courses` in admin — workspace renders 3 panes side-by-side (not full-screen modal)
2. Click a course row — middle pane loads its lessons, breadcrumb shows `Courses › <Title>`
3. Click a lesson — right pane shows skeleton with Phase 2/3 placeholders, breadcrumb shows all 3 segments
4. Click "Courses" in breadcrumb — resets to no selection, both right panes show empty state
5. Click "+" in lesson pane — prompt dialog appears, new lesson appears in list after save
6. Drag left splitter — course pane width changes; reload page — width restored from localStorage
7. Drag right splitter — lesson pane width changes; reload — restored
8. Double-click either splitter — resets to default width
9. Click Edit icon on a course row — edit course dialog opens pre-filled
10. Click Assign icon on a course row — assign students dialog opens
11. Click Delete icon on a course row — confirm dialog; course removed on confirm
12. Rename/delete lesson via icon buttons — works inline
13. Resize browser to <768px — panes stack vertically, splitters hidden, all content accessible
14. Open lesson player (from elsewhere) — still works (splitter behavior unchanged)

## Unresolved Questions

- Preview action for courses: removed from course-list-pane (was a table action in old shell). Should it live in the editor pane header (Phase 2) or as an icon in course-list-pane? Recommend Phase 2 decision.
- `lesson-editor-pane` currently ignores `courseId` (not passed from orchestrator). Phase 2 must thread it through to enable fetching lesson details.
