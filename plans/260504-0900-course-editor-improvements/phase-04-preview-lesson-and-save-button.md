# Phase 4 — Preview Lesson + Manual Save Button

**Status:** ✅ COMPLETED 2026-05-04

## Context Links
- `packages/client/src/lessons/lesson-editor-pane.js`
- `packages/client/src/lessons/lesson-meta-editor.js`
- `packages/client/src/lessons/lesson-player.js` — `openLessonPlayer(course, options)`
- `packages/client/src/lessons/course-list-pane.js` (existing course-level preview)

## Overview
- Priority: P3
- Status: ✅ completed
- Effort: 2h actual
- Adds two QoL features: "Preview lesson" button and a `Save` button beside autosave badge.

## Key Insights
- Autosave (500ms debounce) stays. Save button: cancels pending debounce + immediate PATCH.
- Preview opens existing `lesson-player` in `readOnly` mode jumped to current lesson; may need `startLessonId` option (verify; add if missing).

## Requirements
**Functional**
- `Preview lesson` button in editor pane header → opens player at current lesson.
- `Save` button in meta-editor next to save-state badge.
- Badge states: idle / unsaved / saving / saved / error.
- Save button disabled when `saved` or `saving`.

**Non-functional**
- Reuse existing PATCH function. No duplicate logic.

## Architecture
```
lesson-editor-pane (header)
  └─ [Preview lesson] button → openLessonPlayer(course, { readOnly: true, startLessonId })

lesson-meta-editor
  ├─ inputs (existing)
  ├─ save-state badge (existing)
  └─ [Save] button (new) — cancel debounce + flush
```

## Related Code Files
**Modify**
- `packages/client/src/lessons/lesson-editor-pane.js`
- `packages/client/src/lessons/lesson-meta-editor.js`
- `packages/client/src/lessons/lesson-player.js` (only if `startLessonId` missing)

## Implementation Steps
1. Audit `lesson-player.js` for `startLessonId` option support; if absent, add: scroll/select target lesson on open.
2. In `lesson-editor-pane.js`:
   - Add `Preview lesson` button in header.
   - Handler: `openLessonPlayer(course, { readOnly: true, startLessonId: currentLessonId })`.
   - Disable when no lesson selected.
3. In `lesson-meta-editor.js`:
   - Add `Save` button next to badge.
   - On click: cancel pending debounced timer, build payload, call existing PATCH function, transition state badge `saving → saved` or `error`.
   - Disable button when `state in {saved, saving}`.
   - Tooltip: "Auto-saves; click to save now".
4. Visual smoke test: type → unsaved → click Save → saving → saved.

## Todo List
- [x] `startLessonId` verified or added
- [x] Preview button wired in editor pane
- [x] Save button + state-aware disable in meta editor
- [x] No duplicated PATCH logic
- [x] Manual test of all badge states (idle, unsaved, saving, saved, error)

## Success Criteria
- ✅ Preview opens at the lesson currently being edited.
- ✅ Save button forces immediate save and reflects state correctly.
- ✅ Existing autosave continues to work unchanged.

## Risk Assessment
- Race between debounced save firing and manual save click — cancelling pending timer prevents duplicate PATCH; ensure no in-flight overlap (await pending if exists, then re-PATCH).
- `readOnly` flag may not fully suppress write-side handlers in player — audit.

## Security Considerations
- No new endpoints. Reuses existing authenticated PATCH.

## Next Steps
- Independent of other phases; can ship standalone.
