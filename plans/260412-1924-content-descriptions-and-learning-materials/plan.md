---
title: "Rich Content Descriptions & Learning Materials Download"
description: "Add markdown descriptions to lesson content items (video, PDF, puzzle) with student download capability"
status: complete
priority: P2
effort: 6h
branch: feature/chess-lessons-platform
tags: [lessons, markdown, content, download, UX]
created: 2026-04-12
completed: 2026-04-12
---

# Rich Content Descriptions & Learning Materials Download

## Summary

Add a `description` TEXT column to `lesson_content`, integrate `marked` for markdown rendering, enable coaches to write rich descriptions for video/PDF/puzzle items, display them in the lesson player, and let students download descriptions as styled HTML learning materials.

## Phases

| # | Phase | Status | Effort | Files |
|---|-------|--------|--------|-------|
| 1 | [Database migration + repository](./phase-01-database-migration.md) | ✅ complete | 30m | 2 files |
| 2 | [Markdown editor component](./phase-02-markdown-editor-component.md) | ✅ complete | 1h | 1 new file |
| 3 | [Admin content editor integration](./phase-03-admin-content-editor-integration.md) | ✅ complete | 1.5h | 2 files |
| 4 | [Student lesson player — show descriptions](./phase-04-lesson-player-descriptions.md) | ✅ complete | 1h | 1 file |
| 5 | [Download as learning materials](./phase-05-download-learning-materials.md) | ✅ complete | 1h | 1 new file + wire into player |
| 6 | [Learning view UX improvements](./phase-06-learning-view-ux-improvements.md) | ✅ complete | 1h | 1 file |

## Key Dependencies

- `marked` npm package (~5KB gz) — add to `packages/client/`
- Migration 011 must run before any description data flows

## Architecture

```
[Admin Editor] --markdown text--> [API] --description col--> [SQLite]
                                                                |
[Lesson Player] <--fetch content-- [API] <-- SELECT * ----------+
       |
       +-- render markdown via marked()
       +-- "Download Notes" button --> content-download-helper.js --> Blob download
```

## Risks

- **marked XSS**: Use `marked` with `{ breaks: true }` and sanitize output (DOMPurify or escapeHtml wrapper). Low risk since only admin/coach writes descriptions.
- **Large descriptions**: Textarea + preview side-by-side may feel cramped on small screens. Mitigation: make preview collapsible.
- **Migration on existing data**: Column addition is non-destructive (nullable TEXT), zero risk to existing rows.

## Validation Log

### Session 1 — 2026-04-12
**Trigger:** Pre-implementation validation of plan decisions
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** The plan uses a plain textarea + marked preview (split-pane) for the markdown editor. Coaches write long chess opening descriptions. Do you want a richer WYSIWYG editor instead?
   - Options: Textarea + Preview (Recommended) | Tiptap WYSIWYG | EasyMDE
   - **Answer:** Textarea + Preview (Recommended)
   - **Rationale:** KISS winner — <5KB, zero risk, coaches can learn basic markdown. No framework dependency.

2. **[Architecture]** Puzzles already have a `puzzle_instruction` field (short hint). Should the new `description` be a separate field for longer learning content, or should we repurpose/merge with `puzzle_instruction`?
   - Options: Separate description field (Recommended) | Merge into puzzle_instruction
   - **Answer:** Separate description field (Recommended)
   - **Rationale:** Keeps concerns separated — gameplay hints vs educational content. No breaking changes to existing puzzle data.

3. **[Scope]** Phase 6 adds a sidebar 'Notes' tab and collapsible descriptions. This adds ~100 lines of complexity to lesson-player.js. Is this needed for the first release?
   - Options: Include Phase 6 (Recommended) | Defer Phase 6 | Only collapsible panel
   - **Answer:** Include Phase 6 (Recommended)
   - **Rationale:** Full UX polish is worth the effort for better learning experience. All 6 phases ship together.

4. **[Architecture]** For downloading learning materials, the plan proposes styled HTML (self-contained, printable, zero server deps). Is this sufficient?
   - Options: Styled HTML only (Recommended) | HTML + server PDF | HTML + raw .md option
   - **Answer:** Styled HTML only (Recommended)
   - **Rationale:** Zero server impact, self-contained, students can print-to-PDF natively. KISS.

#### Confirmed Decisions
- Editor: textarea + marked split-pane — KISS, <5KB
- Puzzle: separate `description` field alongside existing `puzzle_instruction`
- Scope: all 6 phases ship together including UX improvements
- Download: styled HTML only, no server PDF or raw .md

#### Action Items
- [x] No changes needed — all plan decisions confirmed as-is
