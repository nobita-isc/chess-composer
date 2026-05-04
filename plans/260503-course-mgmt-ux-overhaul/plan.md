# Course Management UX Overhaul

**Date:** 2026-05-03
**Branch:** feature/chess-lessons-platform
**Scope:** Reduce clicks-to-edit for lessons / exercises / videos in admin Course Management.
**Driver:** User feedback — "too many clicks to edit a specific lesson and its inside exercises/videos."

## Status

**Status:** ✅ COMPLETED 2026-05-03

All 4 phases implemented. 3-pane workspace with inline editing, deep links, and selection persistence live. Tests 407/407 pass; client builds clean.

## Problem (from scout)

Current flow stacks 3–4 full-screen modals (`pv-overlay`, z-index 50000–60000+):

| Action | Current clicks | Critical gaps |
|---|---|---|
| Edit lesson title | 4 | Description not editable; uses `showAppPrompt` (no rich edit) |
| Add exercise | 5–6 | Modal stacks; scroll lost on save |
| Edit exercise | 6–7 | Same as above + must re-traverse on each item |
| Edit video | 5 | URL immutable — must delete + recreate |

No breadcrumbs, no state persistence, no skip-level navigation. Splitter widget already exists in `lesson-player.js:22-53` (drag + localStorage) — proven, reusable.

## Target

| Action | Target clicks |
|---|---|
| Edit lesson (any field) | 2 (course → lesson → inline) |
| Add/Edit exercise | 3 |
| Edit video (URL + meta) | 2 |

Goal: single-page 3-pane workspace (Courses | Lessons | Content/Editor) using splitters; deep-linkable; localStorage-persisted selection.

## Phases

| # | Phase | Status | Effort |
|---|---|---|---|
| 1 | [Shell: 3-pane workspace + splitters + breadcrumb](phase-01-shell-3pane-layout.md) | completed | M |
| 2 | [Inline lesson edit (title + description, no prompt)](phase-02-inline-lesson-edit.md) | completed | S |
| 3 | [Inline content edit (video URL editable, edit-in-place where possible)](phase-03-inline-content-edit.md) | completed | M |
| 4 | [Selection persistence + deep links](phase-04-state-persistence.md) | completed | S |

## Key Dependencies

- Reuse splitter logic from `packages/client/src/lessons/lesson-player.js:22-53,296-321`.
- No backend schema changes (existing fields support all edits — see `lesson_content` columns: `title`, `description`, `video_url`).
- API: `PATCH /api/courses/:id/lessons/:lessonId` and `PATCH .../content/:id` endpoints in `packages/server/src/routes/courses.js` and `routes/lesson-content.js` — verify in Phase 1; add field if missing.

## Out of Scope

- Modules layer (course → module → lesson). Not requested; flat hierarchy stays.
- Drag-to-reorder lessons / content (separate enhancement).
- Multi-challenge puzzle composer redesign (already complex — keep current full-screen for puzzle composer; only collapse the navigation *to* it).
- Mobile responsive 3-pane (keep current modal flow on narrow viewport — Phase 1 includes breakpoint fallback).

## Success Criteria

- All target click counts met, measured by walking through edit flows.
- No regression in Lesson Player or Student Courses Page (shared modules).
- Refresh during edit restores selection within ±1 lesson.
- Splitter sizes persisted across sessions.
- File sizes: each new module ≤ 200 lines (per dev rules); split if larger.
