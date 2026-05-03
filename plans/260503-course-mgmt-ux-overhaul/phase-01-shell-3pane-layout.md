# Phase 01 — Shell: 3-Pane Workspace + Splitters + Breadcrumb

## Context Links

- Scout: `plans/reports/scout-260503-course-mgmt-ux.md`
- Splitter reference: `packages/client/src/lessons/lesson-player.js:22-53,296-321`
- Current shell: `packages/client/src/lessons/CourseManagementPage.js` (388 lines)

## Overview

**Priority:** P0 (foundation — Phases 2–4 depend on it)
**Status:** completed
**Effort:** Medium (~1 day)

Replace the modal-stacking flow with a single-page 3-pane workspace:

```
┌──────────┬──────────┬─────────────────────────────┐
│ Courses  │ Lessons  │ Content / Editor            │
│ (list)   │ (list)   │ (lesson meta + content list │
│          │          │  + inline edit)             │
└──────────┴──────────┴─────────────────────────────┘
        ↕ splitter        ↕ splitter
```

Modals only remain for: Puzzle Composer (deep editor — keep full-screen), file upload picker.

## Key Insights

- Splitter widget already battle-tested in `lesson-player.js`; extract into shared util to avoid duplication (DRY).
- Current `CourseManagementPage.js` is 388 lines and renders flat course rows; it must be restructured but not rewritten — keep its existing data fetching helpers.
- Breadcrumb supersedes "Back" buttons: clicking "Course X" returns to lesson list without closing the workspace.

## Requirements

**Functional**
- Three resizable panes; drag splitter updates width; double-click resets.
- Sidebar collapse: click course/lesson header to expand only that one (single-open accordion in narrow widths).
- Breadcrumb: `Courses › <Course Title> › <Lesson Title>` with each segment clickable.
- Mobile fallback (<768px): collapse to single-pane stack with back-button navigation (degrade gracefully — do NOT redesign mobile from scratch).

**Non-functional**
- Splitter sizes per-pane in localStorage (`cm-pane-courses`, `cm-pane-lessons`).
- Initial render under 200ms with 50 courses / 200 lessons (no full DOM rebuild on selection — only inner pane re-renders).

## Architecture

```
course-management-page.js (orchestrator, ≤200 lines)
├── course-list-pane.js          (left — courses)
├── lesson-list-pane.js          (middle — lessons of selected course)
├── lesson-editor-pane.js        (right — meta + content list, calls Phase 2/3 widgets)
├── course-mgmt-breadcrumb.js    (top bar)
└── shared/pane-splitter.js      (extracted from lesson-player.js)
```

State: a single `selection` object `{ courseId, lessonId }` held in the orchestrator; child panes are pure renderers receiving selection + callbacks. Avoids cross-pane coupling.

## Related Code Files

**Modify**
- `packages/client/src/lessons/CourseManagementPage.js` — convert to orchestrator (rename to `course-management-page.js`).
- `packages/client/src/lessons/lesson-player.js` — replace inline splitter with `shared/pane-splitter.js` import (DRY).
- `packages/server/src/routes/courses.js` — verify `GET /api/courses` returns lessons inline OR add lightweight `/api/courses/:id/lessons` (already exists per scout — verify).

**Create**
- `packages/client/src/lessons/shared/pane-splitter.js` — extract splitter (drag handler, localStorage, double-click reset).
- `packages/client/src/lessons/course-list-pane.js`
- `packages/client/src/lessons/lesson-list-pane.js`
- `packages/client/src/lessons/lesson-editor-pane.js` (skeleton; populated in Phase 2/3)
- `packages/client/src/lessons/course-mgmt-breadcrumb.js`

**Delete**
- None in this phase. Old Lesson Manager modal stays until Phase 2 replaces its callsites.

## Implementation Steps

1. Extract `shared/pane-splitter.js` from `lesson-player.js:22-53`. API: `createSplitter({ axis, target, lsKey, min, max, defaultPx })`. Verify lesson-player still works after refactor (run `npm run dev`).
2. Build `course-list-pane.js` — render courses, emit `onSelectCourse(id)`. Reuse existing course-fetch helper from `CourseManagementPage.js`.
3. Build `lesson-list-pane.js` — render lessons of selected course; emit `onSelectLesson(id)`. Empty state when no course selected.
4. Build `lesson-editor-pane.js` skeleton — show lesson title + placeholder for meta editor (Phase 2) and content list (Phase 3). Empty state when no lesson selected.
5. Build `course-mgmt-breadcrumb.js` — pure render from `selection`; click handlers call orchestrator setters.
6. Rewrite `CourseManagementPage.js` as orchestrator: holds `selection` state, renders 3 panes + 2 splitters + breadcrumb.
7. Wire up in `packages/client/src/index.js` (no route changes — same entry).
8. Add CSS in same module files (style isolation by class prefix `cm-`).
9. Mobile breakpoint: media query collapses splitters to `display:none`, panes become full-width stack with breadcrumb-driven navigation.
10. Run dev server, manually verify click count: Course → Lesson selectable in 2 clicks, no modal opens.

## Todo List

- [x] Extract pane-splitter; verify lesson-player regression-free
- [x] course-list-pane.js
- [x] lesson-list-pane.js
- [x] lesson-editor-pane.js skeleton
- [x] course-mgmt-breadcrumb.js
- [x] Orchestrator rewrite of CourseManagementPage.js
- [x] CSS for `cm-*` classes
- [x] Mobile fallback CSS
- [x] Manual click-count verification (user)

## Success Criteria

- Selecting a course shows its lessons in middle pane (no modal).
- Selecting a lesson shows editor pane (no modal).
- Splitter drag persists across reloads.
- Breadcrumb navigates without losing pane state.
- lesson-player.js still functions with extracted splitter.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Breaking lesson-player after splitter extraction | Manual smoke test before committing each file |
| File size creep (>200 lines) | Split CSS into `course-management.css` if any module exceeds limit |
| Mobile UX regression | Keep old modal flow as fallback on narrow viewport |

## Security Considerations

- No new endpoints. Reuses existing auth-gated routes.

## Next Steps

→ Phase 2 fills `lesson-editor-pane.js` with inline lesson meta editor.
