---
title: "Course/Lesson Editor Improvements"
description: "Video library, markdown descriptions, lesson preview, manual save, YouTube auto-detect"
status: completed
priority: P2
effort: 18h
branch: feature/chess-lessons-platform
tags: [lessons, courses, video, markdown, admin]
created: 2026-05-04
completed: 2026-05-04
---

# Course/Lesson Editor Improvements

Five-phase plan to elevate the course/lesson admin authoring UX.

## Status

**Status:** ✅ COMPLETED 2026-05-04 (5 phases + 4 critical/UX fixes). All phases implemented; 620/620 tests pass; build clean.

## Locked Decisions
- Video storage: local FS `packages/server/uploads/videos/` (mirrors PDF pattern).
- Folder model: single `folder TEXT` column on `videos` (no hierarchy table, no recursive deletes).
- YouTube vs uploaded: client-side auto-detect on render via URL pattern.
- Markdown editor: split tabs `[Edit] [Preview]` inside `lesson-meta-editor.js`; rendered with existing `safe-markdown.js`.
- Preview lesson: button in editor pane → `openLessonPlayer(course, { readOnly, startLessonId })`.
- Manual save coexists with autosave (existing 500ms debounce).
- Admin-only for all new write endpoints.

## Phases

| # | File | Title | Effort | Status | Blocks/Deps |
|---|------|-------|--------|--------|-------------|
| 1 | [phase-01-backend-video-library.md](phase-01-backend-video-library.md) | Backend: video upload + media library | 5h | ✅ completed | — |
| 2 | [phase-02-admin-video-manager-page.md](phase-02-admin-video-manager-page.md) | Admin video manager page | 4h | ✅ completed | needs P1 |
| 3 | [phase-03-video-picker-and-youtube-detection.md](phase-03-video-picker-and-youtube-detection.md) | Video picker + YouTube detection | 3h | ✅ completed | needs P2 |
| 4 | [phase-04-preview-lesson-and-save-button.md](phase-04-preview-lesson-and-save-button.md) | Preview lesson + manual save | 2h | ✅ completed | independent |
| 5 | [phase-05-markdown-description-editor.md](phase-05-markdown-description-editor.md) | Markdown description editor | 4h | ✅ completed | independent |

## Key Dependencies
- Phase 2 blocked by Phase 1 (API contract).
- Phase 3 blocked by Phase 2 (picker reuses list logic).
- Phases 4 + 5 can run parallel anytime.

## Constraints
- YAGNI/KISS/DRY. New files ≤200 lines.
- No new client deps. Server may use already-present `mime-types`.
- Reuse: debounced PATCH, save-state badge, multipart upload, modal stacking.
- Tests: 595/595 must stay green.

## Unresolved / Deferred Questions

**Resolved During Implementation**
- Static `/uploads/...` route registration ✅ verified; serves `videos/` subdir via existing wildcard.
- `openLessonPlayer` `startLessonId` option ✅ added in Phase 4.
- Lesson description rendering ✅ unified to markdown via Phase 5.

**Deferred (non-blocking; future work)**
- MIME magic-byte validation (C2 severity) — white-list + extension check sufficient for admin-only context. Future: magic-byte validation if user-facing.
- Sync FS calls H1 — async consistency; acceptable given admin-only usage. Future: queue + confirm pattern for large batches.
- `content-item-video.js` file >200 lines M1 — filed as technical debt; consider extraction if other video-related logic accrues.
- Vimeo URLs silent break (no auto-detect pattern) — documented in Phase 3 YouTube-only scope. Future: expand resolver if Vimeo support needed.
- Thumbnail generation (deferred; generic icon for now) — future: ffmpeg poster extraction at upload.
- Upload progress feedback (XHR vs fetch) — acceptable scope deferral; can swap to XMLHttpRequest if needed.
