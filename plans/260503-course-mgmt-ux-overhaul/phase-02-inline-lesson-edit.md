# Phase 02 — Inline Lesson Edit (Title + Description)

## Context Links

- Scout § 2(a): `plans/reports/scout-260503-course-mgmt-ux.md` lines 21-31
- Phase 1 shell: `phase-01-shell-3pane-layout.md`
- Current edit path: `CourseManagementPage.js:299` (showAppPrompt — title only)

## Overview

**Priority:** P1
**Status:** pending
**Effort:** Small (~½ day)
**Depends on:** Phase 1 (lesson-editor-pane.js skeleton)

Replace `showAppPrompt`-based title-only edit with inline form in the editor pane. Adds description field (currently un-editable per scout § 2a).

## Key Insights

- DB column `lessons.description` already exists — backend supports it; UI is the only gap.
- Inline `<input>` + `<textarea>` with auto-save on blur is simpler than save buttons (KISS) — match pattern likely used elsewhere; verify in `lesson-content-editor.js` first.
- Debounce save calls (500ms) to avoid hammering API on every keystroke.

## Requirements

**Functional**
- Title and description editable inline in `lesson-editor-pane.js`.
- Auto-save on blur AND on debounced typing (500ms).
- Visual save state: idle / saving / saved / error (small badge near header).
- Keyboard: Tab moves between fields; Esc reverts unsaved changes.

**Non-functional**
- Optimistic UI (update local state immediately; rollback on API error).
- No layout shift between view and edit modes (single editable element, not toggle).

## Architecture

```
lesson-editor-pane.js
└── lesson-meta-editor.js   (title + description form, debounced save)
    └── api: PATCH /api/courses/:courseId/lessons/:lessonId  { title?, description? }
```

`lesson-meta-editor.js` is a pure widget: receives `lesson` + `onPatch(fields)`; no internal API knowledge — orchestrator wires API.

## Related Code Files

**Modify**
- `packages/client/src/lessons/lesson-editor-pane.js` — mount lesson-meta-editor at top.
- `packages/client/src/lessons/CourseManagementPage.js` (orchestrator) — add `patchLesson()` API helper.
- `packages/server/src/routes/courses.js` — verify PATCH endpoint accepts `description`. Add if missing.

**Create**
- `packages/client/src/lessons/lesson-meta-editor.js` (~80 lines)
- `packages/client/src/lessons/shared/debounce.js` (if not already in `core/` or `utils/` — check first; reuse if exists per DRY)

**Delete**
- Lines in `CourseManagementPage.js:299-304` — old `showAppPrompt` edit handler.

## Implementation Steps

1. Search codebase for existing debounce util (`grep -r "debounce" packages/client/src/`). Reuse if found; create `shared/debounce.js` only if absent.
2. Verify backend: `curl -X PATCH /api/courses/X/lessons/Y -d '{"description":"test"}'` — does it persist? If not, update server route handler in `routes/courses.js` to whitelist `description` in update statement.
3. Build `lesson-meta-editor.js` — controlled `<input>` + `<textarea>`, debounced `onPatch` callback, save-state badge.
4. Mount in `lesson-editor-pane.js` above content list area (Phase 3).
5. Add `patchLesson(courseId, lessonId, fields)` helper in orchestrator; pass as `onPatch`.
6. Remove old prompt-based edit button — selection alone enters edit mode.
7. Manual test: edit title, edit description, refresh — confirm persistence; trigger network error (devtools offline) — confirm rollback + error badge.

## Todo List

- [ ] Find/create debounce util
- [ ] Verify/extend backend PATCH for description
- [ ] lesson-meta-editor.js
- [ ] Wire into editor pane
- [ ] Remove old showAppPrompt edit code
- [ ] Manual happy-path + error-path test

## Success Criteria

- Edit lesson title in 2 clicks (course → lesson; field is focused or 1-click focus).
- Description editable and persisted.
- No data loss on rapid edits.
- Network error shows clear feedback; user's text not lost.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Backend does not whitelist `description` | Verify in step 2; small server patch if needed |
| Debounce + blur fire double-save | Cancel pending debounce on blur, send single immediate save |
| Optimistic update inconsistent with server | Use server response as source of truth on save success |

## Security Considerations

- PATCH endpoint already auth-gated (admin role) per existing `routes/courses.js`. Confirm role check still applies after schema whitelist change.
- Sanitize description on render (it's plain text — no markdown rendering here; if added later, escape HTML).

## Next Steps

→ Phase 3: inline content (video/exercise) edit in same pane.
