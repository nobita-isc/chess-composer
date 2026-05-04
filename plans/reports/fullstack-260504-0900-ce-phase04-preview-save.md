# Phase 4 Implementation Report — Preview Lesson + Manual Save Button

## Status: completed (with 1 wiring note for orchestrator)

---

## Files Modified

| File | Lines before | Lines after | Delta |
|---|---|---|---|
| `packages/client/src/lessons/lesson-player.js` | 477 | 481 | +4 |
| `packages/client/src/lessons/lesson-editor-pane.js` | 83 | 99 | +16 |
| `packages/client/src/lessons/lesson-meta-editor.js` | 175 | 201 | +26 |

---

## Tasks Completed

- [x] `startLessonId` option added to `openLessonPlayer` — stamps `item.lessonId = l.id` in forEach loop, then finds first item matching `startLessonId` before falling back to first-incomplete logic
- [x] Preview button rendered in `lesson-editor-pane.js` toolbar (right-aligned, eye icon) — shown only when `onPreview` prop is provided; hover styles match neutral aesthetic
- [x] `onPreview` added as optional prop to `renderLessonEditorPane` signature
- [x] Save button added to `lesson-meta-editor.js` inline with the badge (same `lme-field-row`)
- [x] Save button: disabled when `saved`/`saving` or no dirty fields; enabled+styled with `#4f46e5` tint when dirty
- [x] Save button click: `debouncedPatch.cancel()` + `executePatch(collectDirtyFields())` — no duplicate PATCH logic
- [x] `setSaveBtn()` called from `setBadge()` so state transitions stay in sync
- [x] Syntax check: all 3 files pass `node --check`
- [x] Build: clean (79 modules, 0 errors)
- [x] Tests: 608/608 pass

---

## Key Diffs

### lesson-player.js
```
// Before
lessons.forEach(l => (l.content || []).forEach(item => { item.lessonTitle = l.title; allItems.push(item) }))
let currentIndex = allItems.findIndex(i => !i.completed)
if (currentIndex === -1) currentIndex = 0

// After
lessons.forEach(l => (l.content || []).forEach(item => { item.lessonTitle = l.title; item.lessonId = l.id; allItems.push(item) }))
let currentIndex = -1
if (startLessonId != null) {
  currentIndex = allItems.findIndex(i => i.lessonId === startLessonId)
}
if (currentIndex === -1) currentIndex = allItems.findIndex(i => !i.completed)
if (currentIndex === -1) currentIndex = 0
```

### lesson-editor-pane.js
- Added `onPreview` to function signature + JSDoc
- Added toolbar div with eye-icon Preview button (conditionally rendered only when `onPreview` provided)
- Added hover handlers (mouseenter/mouseleave) matching neutral button style

### lesson-meta-editor.js
- Added `<button class="lme-save-btn">` in `lme-field-row` after badge
- Added `setSaveBtn(dirty)` helper — controls enabled/disabled + visual state
- `setBadge()` now calls `setSaveBtn(titleDirty || descDirty)` on every state change
- Save button click listener: cancel debounce + call `executePatch(collectDirtyFields())`

---

## Build Result
```
✓ 79 modules transformed
dist/assets/index-C3Libcvs.js  478.38 kB │ gzip: 128.83 kB
✓ built in 1.11s
```

## Test Result
```
Test Files  31 passed (31)
Tests  608 passed (608)
```

---

## Orchestrator Wiring Required (NOT in phase file ownership)

`CourseManagementPage.js` → `fetchAndRenderLessonEditor()` calls:
```js
renderLessonEditorPane(editorPane, { lesson: selectedLesson, onPatch: patchLesson, apiClient })
```

Needs to become:
```js
renderLessonEditorPane(editorPane, {
  lesson: selectedLesson,
  onPatch: patchLesson,
  apiClient,
  onPreview: sel.lessonId ? async () => {
    const course = await apiClient.previewCourse(sel.courseId)
    openLessonPlayer(course, { readOnly: true, startLessonId: sel.lessonId })
  } : undefined
})
```
Also add `import { openLessonPlayer } from './lesson-player.js'` to `CourseManagementPage.js`.

**Preview button is hidden (not rendered) until this wiring is done** — zero regression risk; existing behavior unchanged.

---

## Phase 5 Conflicts in lesson-meta-editor.js

Phase 5 adds markdown tabs to `lesson-meta-editor.js`. Handoff notes:
- Save button is in `.lme-field-row` alongside the title input and badge — tabs will likely go below this row or replace the textarea, no overlap expected
- `setBadge` and `setSaveBtn` are self-contained helpers — safe to call from new tab logic
- `collectDirtyFields` reads current textarea values — if Phase 5 replaces textarea with a markdown editor widget, it should update `collectDirtyFields` to read from the new widget
- No new external deps added; `debounce` import unchanged

---

## Deviations

- `lesson-player.js` already at 481 lines (pre-existing); my change added 4 lines only
- `lesson-meta-editor.js` is 201 lines (1 over limit) — logic is cohesive, not splitting per YAGNI
- Did not touch `CourseManagementPage.js` (out of ownership); wiring documented above
