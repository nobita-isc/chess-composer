# Phase 03 — Inline Content Edit (Video URL Editable, Edit-in-Place)

## Context Links

- Scout § 2(b)(c): `plans/reports/scout-260503-course-mgmt-ux.md` lines 33-67
- Phase 1 shell, Phase 2 lesson editor pane
- Current content editor: `packages/client/src/lessons/lesson-content-editor.js` (485 lines)
- Edit dialog: `lesson-content-editor.js:364-483` (showEditContentDialog)
- Puzzle composer: `packages/client/src/lessons/puzzle-composer.js` (565 lines)

## Overview

**Priority:** P1
**Status:** completed
**Effort:** Medium (~1 day)
**Depends on:** Phase 1 + 2

Inline the content list and editing inside the right pane. Make video URL editable (currently immutable per scout). Keep Puzzle Composer full-screen (it is genuinely complex), but launch directly from inline list with a single click — no intermediate Content Editor overlay.

## Key Insights

- `lesson-content-editor.js` mixes list rendering + edit dialogs + upload dialog. Split: list goes inline; edit dialogs become inline panels; upload stays modal (file picker is genuinely modal-shaped).
- Video, PDF, quiz items support inline edit (small field set). Puzzle is the only type that warrants its own screen — but reachable in 1 click from the list.
- Reuse `lesson-meta-editor.js` debounced-patch pattern from Phase 2 (DRY).

## Requirements

**Functional**
- Lesson content items render as a list inside `lesson-editor-pane.js`.
- Click an item → expands inline edit form (no overlay) for video/pdf/quiz.
- Click a puzzle item → opens Puzzle Composer (full-screen kept) with breadcrumb back-button preserving selection (Phase 4).
- Video URL editable inline; PATCH persists.
- Add-content actions (`+ Video`, `+ Puzzle`, `+ PDF`, `+ Quiz`) inline at top of list.
- Delete with confirm; reorder out of scope (separate task).

**Non-functional**
- Item-level optimistic update — editing one item never re-renders siblings (avoid scroll loss called out in scout § 4).
- Puzzle Composer return restores list scroll position.

## Architecture

```
lesson-editor-pane.js
├── lesson-meta-editor.js              (Phase 2)
└── lesson-content-list.js             (NEW — orchestrates content items)
    ├── content-item-video.js          (inline edit: title, url, description)
    ├── content-item-pdf.js            (inline edit: title, description; file replace via modal)
    ├── content-item-quiz.js           (inline edit: title, quiz JSON via small editor)
    └── content-item-puzzle.js         (read-only summary; "Open Composer" button)
```

Each content-item module is self-contained, ≤150 lines. Shared API client `lesson-content-api.js` extracted from current `lesson-content-editor.js` calls.

## Related Code Files

**Modify**
- `packages/client/src/lessons/lesson-editor-pane.js` — mount `lesson-content-list.js` below meta editor.
- `packages/client/src/lessons/lesson-content-editor.js` — strip down: keep ONLY upload dialog (rename to `lesson-content-upload-dialog.js`). All list/edit logic moves out.
- `packages/server/src/routes/lesson-content.js` — verify PATCH allows `video_url`, `description`, `title` for video items. Extend whitelist if needed (scout § 2c says URL is immutable — likely server-side restriction).
- `packages/client/src/lessons/CourseManagementPage.js` — orchestrator passes `patchContent`, `deleteContent`, `addContent` to list.

**Create**
- `packages/client/src/lessons/lesson-content-list.js`
- `packages/client/src/lessons/content-item-video.js`
- `packages/client/src/lessons/content-item-pdf.js`
- `packages/client/src/lessons/content-item-quiz.js`
- `packages/client/src/lessons/content-item-puzzle.js`
- `packages/client/src/lessons/lesson-content-upload-dialog.js` (carved from current)
- `packages/client/src/lessons/lesson-content-api.js` (carved from current)

**Delete**
- `lesson-content-editor.js` after carving — confirm no remaining importers.

## Implementation Steps

1. Carve `lesson-content-api.js` (fetch/patch/delete/create) from current `lesson-content-editor.js`. Update lesson-player.js if it uses any of these (per scout it doesn't, but verify with grep).
2. Carve upload dialog into `lesson-content-upload-dialog.js`. Keep z-index stack but only one layer now.
3. Build per-type item modules using Phase 2's debounced-patch pattern. Each item maintains its own local edit state.
4. Build `lesson-content-list.js` — fetches items via API, renders array, handles add/delete actions.
5. Server: open `routes/lesson-content.js`, find PATCH handler, extend allowed fields to include `video_url` (and any other useful field per UX). Add validation: URL format check.
6. Mount list in `lesson-editor-pane.js`.
7. Test: edit video URL inline → persists; click puzzle → opens Composer; close Composer → returns to same scroll position; add new video; delete with confirm.
8. Delete old `lesson-content-editor.js` after verifying no importers.

## Todo List

- [x] lesson-content-api.js
- [x] lesson-content-upload-dialog.js (carve)
- [x] content-item-video.js (URL editable)
- [x] content-item-pdf.js
- [x] content-item-quiz.js
- [x] content-item-puzzle.js
- [x] lesson-content-list.js
- [x] Server PATCH whitelist extension
- [x] URL validation (client + server)
- [x] Wire into editor pane
- [x] Delete old lesson-content-editor.js
- [x] Manual flow test (all 4 content types)

## Success Criteria

- Edit video URL inline in 3 clicks total (course → lesson → URL field).
- Edit/add exercise (puzzle) in 3 clicks (course → lesson → "+ Puzzle" or item).
- Editing one item does not scroll-jump or re-render siblings.
- Puzzle Composer round-trip preserves list scroll.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| URL validation gaps allow malformed video URLs | Use `URL` constructor + protocol whitelist (https/http) on both ends |
| Carving lesson-content-editor breaks lesson-player or student flow | Grep importers BEFORE delete; run student-courses-page.js manually |
| Per-item state desync after add/delete | Re-fetch list on add/delete only; in-place patch on edit |
| Puzzle composer return clobbers selection | Defer to Phase 4 persistence; for now stash in module-level var |

## Security Considerations

- Server must continue auth-gating PATCH (admin role).
- URL validation prevents `javascript:` and other dangerous schemes — whitelist `http`/`https` only.
- File upload path unchanged; existing checks apply.

## Next Steps

→ Phase 4: persist selection + scroll across reloads / Composer round-trips; deep links.
