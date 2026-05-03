# Critical Fix Report — Course Management UX

**Date:** 2026-05-03
**Scope:** C1, C2, C3, C9 from reviewer-260503-0901-course-mgmt-ux.md

---

## C1 — `findLessonsByCourse` description projection

**File:** `packages/server/src/lessons/CourseRepository.js:72-78`

**Verdict: Already correct — no fix needed.**
Query is `SELECT l.*, (SELECT COUNT(*) ...) FROM lessons l WHERE ...` — `l.*` projects all columns including `description`. Orchestrator at `CourseManagementPage.js:179-180` reads the full lesson object via `apiClient.getCourseLessons()`. No data loss.

---

## C2 — popstate listener cleanup leak

**Files:** `packages/client/src/index.js:154-197` (admin router), `packages/client/src/index.js:92-106` (student router)

**Verdict: Already correct — no fix needed.**
Both routers declare `let currentCleanup = null` and invoke `currentCleanup()` in `onNavigate` before each render. Admin router: lines 173-176. Student router: lines 95-97. `renderCoursesPage` returns `() => { if (unsubPopstate) unsubPopstate() }` and callers store it in `currentCleanup`. No leak.

---

## C3 — Silent `.catch(() => {})` on blur saves

**Files modified:**
- `packages/client/src/lessons/content-item-video.js` — added `executePatch()` helper; replaced 3 blur `.catch(() => {})` calls
- `packages/client/src/lessons/content-item-pdf.js` — added `serverValues` tracking, added `executePatch()`, replaced 2 blur handlers, updated `update()` to sync `serverValues`
- `packages/client/src/lessons/content-item-quiz.js` — added `serverValues` tracking, added `executePatch()`, replaced title/desc/quiz_data blur handlers (3 total), updated `update()` to sync `serverValues`

**Pattern applied (matching `lesson-meta-editor.js:76-92`):**
- On blur: `saveState = 'saving'` → call `onPatch` → on success: update `serverValues` + `item`, badge = `saved`
- On error: `console.error(...)`, badge = `error`, `serverValues` NOT updated (preserves rollback target for next attempt)

Key lines changed:
- `content-item-video.js:122` → calls `executePatch(item.id, { title: item.title }, ...)`
- `content-item-video.js:132` → calls `executePatch(item.id, { video_url: item.video_url }, ...)`
- `content-item-video.js:141` → calls `executePatch(item.id, { description: item.description }, ...)`
- `content-item-pdf.js:110` → calls `executePatch(item.id, { title: item.title })`
- `content-item-pdf.js:116` → calls `executePatch(item.id, { description: item.description })`
- `content-item-quiz.js:125` → calls `executePatch(item.id, { title: item.title })`
- `content-item-quiz.js:131` → calls `executePatch(item.id, { description: item.description })`
- `content-item-quiz.js:154` → calls `executePatch(item.id, { quiz_data: serialized })`

---

## C9 — Ghost selection after 404 fallback

**File modified:** `packages/client/src/lessons/CourseManagementPage.js:186-194`

After clearing `sel` and calling `selectionStore.clear()` on 404, added:
```js
refreshBreadcrumb()
refreshCourseList()
refreshLessonList()
```
This forces the course-list-pane and lesson-list-pane to re-render with `selectedCourseId: null` / `selectedLessonId: null`, removing the `.cm-selected` highlight from stale items.

---

## Verification

```
node --check content-item-video.js  → OK
node --check content-item-pdf.js    → OK
node --check content-item-quiz.js   → OK
node --check CourseManagementPage.js → OK

npm test   → 23 files, 407 tests — all pass
npm -w packages/client run build → ✓ built in 1.05s
```

---

## Unresolved Questions

None.
