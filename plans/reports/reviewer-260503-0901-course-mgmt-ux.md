# Code Review — Course Management UX Overhaul (Phases 1–4)

**Reviewer:** code-reviewer
**Date:** 2026-05-03
**Scope:** packages/client/src/lessons/ + server video_url validation
**Phase reports referenced:** phase01-shell, phase02-meta-editor, phase04-persistence (phase03 report missing from disk; reviewed via diff)

## Score: 7.5 / 10

Solid implementation. Architecture clean (orchestrator + pure widgets + shared utils). All builds pass. Convention adherence good. Several **critical bugs** must be fixed before sign-off, plus notable DRY violations and one missing API contract.

---

## Critical Issues (MUST FIX)

### C1. `getCourseLessons` does NOT return `description` — meta editor will silently drop description
**File:** `CourseManagementPage.js:179`
Phase 2 report claims `getCourseLessons → l.* includes description`. Need to verify `findLessonsByCourse` SELECT actually projects `description`. If it does not (commonly only `id, title, position, ...`), the editor opens with empty description even when one exists, then user-typed empty save **wipes the field on the server** (since editor sends `description: ''` on first edit due to optimistic state).
**Action:** confirm SQL projection in `CourseRepository.findLessonsByCourse` includes `description`. If not, add it OR add a dedicated `getLesson(id)` endpoint (rejecting YAGNI here was premature).

### C2. Memory leak — popstate listener never unsubscribed
**File:** `CourseManagementPage.js:218`
`renderCoursesPage` returns the unsub fn, but I see no caller in the router/page-mount layer that invokes it on route change. Every navigation away and back to `/courses` adds another `popstate` handler. Within one session, browser back will fire N stale callbacks, each reading store and re-rendering.
**Action:** verify the router consumes the returned cleanup fn. If router does not support cleanup, attach via `AbortController` on a sentinel element or store on `container._cleanup` and run it at next mount.

### C3. Optimistic-update rollback gap in content-item-video on title/desc blur
**File:** `content-item-video.js:122, 136` (also `content-item-pdf.js:110, 113`; `content-item-quiz.js:125, 128`)
Blur handlers do `onPatch(...).catch(() => {})` — swallowing errors silently. If save fails on blur (network, 500), user sees no feedback, no rollback, no badge update. `serverValues` never updated either, so subsequent Esc reverts to a value that diverges from server.
**Action:** route blur saves through the same `executePatch`-style helper that updates `saveState` and rolls back to `serverValues` on error. Pattern from `lesson-meta-editor.js:76-92` is correct — replicate it.

### C4. Race: blur fires while debounce in flight → double request, last-write-wins inverted
**File:** `content-item-video.js:122, 130, 136` and siblings
Sequence: type → debounce armed (600ms) → blur → `debouncedPatch.cancel()` → blur fires `onPatch(...)` immediately. OK in isolation. BUT user can blur, then `setTimeout` from a previous successful save fires and resets badge to 'idle' while new blur-save is in-flight; or two blurs in quick succession (title→tab→url loses focus shortly after) issue overlapping PUTs whose responses arrive out of order. Server is last-write-wins, so older response landing later silently corrupts.
**Action:** use a monotonic request id per field (`reqSeq++`); ignore stale responses. Or serialize per-item via a small in-flight queue.

### C5. XSS via title/description in inline `style="..."` and dataset injection
**File:** `lesson-meta-editor.js:60-61`, `content-item-quiz.js:80`
- Meta editor sets `titleInput.value = serverTitle` — safe (DOM property).
- BUT `content-item-quiz.js:80` interpolates `escapeHtml(getQuizText())` into a `<textarea>` body — `escapeHtml` does not escape `>` inside textarea? It does. OK.
- **Real issue:** `content-item-puzzle.js:25` does `item.puzzle_instruction.substring(0, 60)` then puts result through `escapeHtml(puzzleSummary(item))` at line 50. OK.
- **Real issue:** `course-list-pane.js:41` interpolates `escapeHtml(c.id)` into `data-id="..."` — fine because escapeHtml escapes `"`. OK.
- **Actual risk found:** `content-item-quiz.js:139` selector `'div[style*="dc2626"]'` is fragile but not security. Acceptable.
- **Verdict on XSS:** all user input passed through `escapeHtml`. No `innerHTML` of raw user data found. **No XSS issue confirmed** — downgrading from "critical" to "informational." Keep `escapeHtml` discipline.

### C6. Quiz JSON save bypasses optimistic-state reset of badge
**File:** `content-item-quiz.js:130-150`
On valid JSON blur: cancels debounce, fires `onPatch(...).catch(() => {})` — same gap as C3. Plus: on invalid JSON, `jsonError` is set but `saveState` stays whatever it was (may show "Saved" while error visible). Confusing UX.

### C7. Selection store loop risk on `replaceState` + popstate edge case
**File:** `shared/selection-store.js:80, 100`
Modern browsers do **not** fire `popstate` on `replaceState`, so direct loop is unlikely. However, if a future change converts to `pushState`, the orchestrator's `onChange` callback (line 211) calls `refreshLessonEditor()`, which on 404 calls `selectionStore.clear()` (line 191) — `clear` calls `replaceState`. No popstate fires from replaceState, so no loop today. **Leaving in place but flag**: any future move to `pushState` must guard the `onChange` handler with a "currently writing" flag to prevent feedback.

### C8. `lesson-content-list.js` `destroy()` saves scroll AFTER container may be detached
**File:** `lesson-content-list.js:217-222`
`destroy()` reads `container.scrollTop` — if `lesson-editor-pane.js:36-43` re-renders by overwriting `container.innerHTML` then calls `container._contentList.destroy()` AFTER the inner DOM is already wiped, `scrollTop` is 0. Order in `lesson-editor-pane.js:36-43`: destroy is called BEFORE `container.innerHTML = ...`. Good — confirms the order is correct. **Resolved.**

### C9. Potential infinite refresh on 404
**File:** `CourseManagementPage.js:186-194`
On 404 in `fetchAndRenderLessonEditor`, `selectionStore.clear()` is called, which (per C7) will not trigger popstate. But it does write hash to clean state — orchestrator's local `sel` was already mutated to `{ courseId: null, ... }`. Then `renderLessonEditorPane(editorPane, { lesson: null, ... })`. OK, no loop. **Resolved**.

But: after 404 clears selection, the **lesson-list-pane and course-list-pane are not refreshed** — they still show old selection highlight. Need `refreshAll()` (or at least `refreshCourseList` + `refreshLessonList` + `refreshBreadcrumb`) after 404 fallback.

---

## High Priority

### H1. DRY violation across 3 content-item-* modules
`content-item-video.js`, `content-item-pdf.js`, `content-item-quiz.js` all duplicate:
- `escapeHtml` (3×)
- `SAVE_DELAY_MS` constant
- `debouncedPatch` + `updateBadge` + `saveState` machine (≈40 LOC each)
- header markup, chevron toggle, expand state
- title input + debounce/blur boilerplate
- delete button + confirm dialog

**Action:** extract `shared/content-item-base.js` exporting `createContentItemBase({ icon, badgeColors, type, fields: [...], onPatch, onDelete, renderExtra })`. Each type module shrinks to ~30 LOC. Estimated savings ~250 LOC. Phases done; file as Phase 5 follow-up.

### H2. Quiz JSON editor — losing focus also fires blur on tab switch and Esc
**File:** `content-item-quiz.js:130`
No Esc handler. No way to revert to last server JSON if user accidentally types garbage and blurs. Should mirror `lesson-meta-editor.js:114-120` Esc behaviour.

### H3. `executePatch` early-return logic broken
**File:** `lesson-meta-editor.js:77`
```
if (!fields.title && fields.title !== '' && !fields.description && fields.description !== '') return
```
This bails out when both fields are missing. But because `fields.title` of `''` is falsy, the first half evaluates `!('')` → true, then `'' !== ''` → false, so first conjunct false → first half false. Logic technically correct but unreadable. Replace with:
```
if (fields.title === undefined && fields.description === undefined) return
```

### H4. `serverValues` desync in content-item-pdf after Replace File
**File:** `content-item-pdf.js:115-126`
After file replace, `item.file_path/file_size` updated locally but no `serverValues` tracking exists in PDF (none defined at all). If a subsequent title edit fails and user hits Esc, no rollback target. PDF item module never declares `serverValues` (unlike video). Inconsistent.

### H5. `lesson-list-pane.js` rename action is duplicate UX
Phase 2 report flags this. Title now editable in editor pane AND via list-pane rename prompt. Two sources of truth → easy to confuse.
**Action:** remove rename button from list-pane (phase report agrees).

### H6. `puzzleSummary` substring on raw HTML is unsafe in principle
**File:** `content-item-puzzle.js:25`
`item.puzzle_instruction.substring(0, 60)` — if instruction contains a multi-byte char on the boundary, you slice mid-codepoint. Cosmetic.

---

## Medium Priority

### M1. Files exceeding 200 LOC
- `CourseManagementPage.js` 219 (target 200) — STYLES const inline; extract to a `course-mgmt-styles.js` (or static CSS file).
- `lesson-content-list.js` 229 — STYLES + LRU helpers; LRU could move to `shared/scroll-memory.js`.

### M2. Inline styles everywhere — maintainability hit
`content-item-*.js` all use 200+ char inline `style="..."` strings. Hard to theme, hard to override. Consider one CSS string per file injected at module top (matches `lesson-editor-pane.js` `META_EDITOR_STYLES` pattern).

### M3. `course-mgmt-dialogs.js` zIndex hardcoded `55000` — magic number
Multiple dialogs use 55000 / 60000. Centralize in a constants module.

### M4. `selection-store.js` `read()` has hidden side effect
`parseHash` line 29 calls `history.replaceState` during read — readers expect pure functions. Move side effect to a `validateAndCleanHash()` called once at init.

### M5. `apiClient._authManager?.getAccessToken()` reaches into private member
**File:** `lesson-content-upload-dialog.js:123`
Underscore prefix = private. Either expose `apiClient.getAccessToken()` publicly or have apiClient handle the upload itself (`apiClient.uploadFile(file)`).

### M6. No rate limit on auto-save
500ms debounce is fine, but holding a key down (or paste loop) generates a save per pause. No upper-bound throttle. Low risk for single user; flag for awareness.

### M7. Server video_url validation accepts `javascript:` via URL constructor?
**File:** `lesson-content.js:78-82`
`new URL('javascript:alert(1)')` → protocol = `javascript:`. The `if (!['http:', 'https:'].includes(u.protocol))` check correctly rejects it. **No issue.** Good defensive code.

### M8. Server allows empty `video_url` to bypass check
`if (data.video_url !== undefined && data.video_url !== null && data.video_url !== '')` — empty string skips validation. OK if intent is "clearing field." Document intent.

### M9. `content-item-video.js:119` updates header via fragile DOM walk
`el.querySelector('.ci-header div div:first-child')` — brittle. Add a class like `.ci-header-title`.

### M10. Scroll restore uses `requestAnimationFrame` once
**File:** `lesson-content-list.js:210`
Single rAF may fire before child widgets finish their initial render (some have async content like puzzle previews). Consider `requestAnimationFrame(() => requestAnimationFrame(...))` (double-rAF) or wait for `images.complete`.

---

## Low Priority

- L1. `course-mgmt-breadcrumb.js` does not show count (e.g. `Lessons (3)`). Phase choice; OK.
- L2. `debounce.js` `lastArgs` not cleared after flush — minor memory retention.
- L3. Inconsistent destroy semantics: `content-item-puzzle.js:91` `destroy(){}` no-op (fine, but a comment would help).
- L4. `SCROLL_MAX = 20` magic number; module-level const, OK.
- L5. `lesson-editor-pane.js` mounts content-list even when `lesson.id` falsy — guarded by outer `if (!lesson) return` so OK.
- L6. `content-item-quiz.js:139` removes error via attribute selector substring — replace with class lookup (`.ci-json-err`).

---

## Edge Cases Discovered (Scout)

1. **Stale popstate handlers** (C2) — accumulating across navigation.
2. **Out-of-order PUT responses** (C4) — lacking request-sequence guard.
3. **Description silently wiped** (C1) — if `findLessonsByCourse` does not project `description`.
4. **No refresh after 404 fallback** (C9) — UI shows ghost selection.
5. **Esc on quiz JSON** (H2) — no revert path.
6. **`replaceState` → no popstate** — current behaviour OK; locks in coupling. Documented (C7).
7. **Tab focus loss firing blur during in-flight debounced save** — handled by cancel; but error swallow leaves user blind.
8. **localStorage corruption** — handled gracefully.
9. **Hash with non-numeric IDs** — handled (TEXT IDs supported).
10. **Course deleted from another tab** — would 404 on next refresh; C9 needs full UI reset.

---

## Convention / Standards Adherence

- Kebab-case file names: ✓ (except `CourseManagementPage.js` PascalCase — exception predates phase work).
- ≤200 LOC: 2 files exceed (M1).
- `lesson-player.js` regression: splitter import works (`attachSplitterRaw as attachSplitter`); behaviour preserved per phase01 report.
- `escapeHtml` discipline: consistent across new modules.
- Error handling: present but inconsistent (some swallow with `.catch(() => {})`).
- Try/catch: covered.
- API contracts: orchestrator → editor pane → list → items threading correct.

---

## Positive Observations

- Clean orchestrator pattern (`CourseManagementPage.js`); pure-widget separation excellent.
- `selection-store.js` well-designed minimal API; LS+hash precedence correct.
- Server video_url validation tight (rejects `javascript:`, `file:`, etc).
- LRU scroll cap at 20 prevents sessionStorage bloat.
- Phase 1 dual splitter API (`createSplitter` high-level + `attachSplitterRaw` low-level) is good extension design.
- `debounce.js` proper `cancel()` + `flush()` semantics.
- Consistent destroy pattern across widgets (mostly).

---

## Recommended Actions (Priority Order)

1. **C1** — verify/fix `findLessonsByCourse` SELECT includes `description` column. **BLOCKING.**
2. **C2** — confirm router calls returned cleanup fn; fix if not.
3. **C3 + C6** — replace silent `.catch(() => {})` blur saves with state-machine path; rollback on error.
4. **C4** — add request-sequence guard for out-of-order responses.
5. **C9** — call `refreshAll()` after 404 fallback.
6. **H1** — extract `content-item-base.js` (DRY); apply to 3 modules.
7. **H2** — add Esc revert to quiz JSON editor.
8. **H5** — remove duplicate rename button from lesson-list-pane.
9. **M1, M2** — extract STYLES constants to dedicated style modules.
10. **M5** — expose `apiClient.getAccessToken()` publicly.

---

## Sign-off Recommendation

**CONDITIONAL — fix C1, C2, C3, C9 before merge.**

C4, C6 can ship as follow-up if test coverage is reasonable, but document. H-tier issues are post-merge cleanup. Phase 3 report is missing — request from implementer.

---

## Metrics

- Files reviewed: 14
- LOC reviewed: ~2,400
- Critical issues: 5 active (C1, C2, C3, C4, C9) + 2 resolved (C5, C7, C8)
- High priority: 6
- Medium: 10
- Low: 6
- Build: ✓ pass (per phase reports)
- Lint: not run (no script invoked)
- Test coverage: not assessed — no tests in scope

---

## Unresolved Questions

1. Does `CourseRepository.findLessonsByCourse` SQL projection include `description`? — verify by reading repo file.
2. Does the page router invoke the cleanup fn returned by `renderCoursesPage`? — verify routing layer.
3. Where is the Phase 3 report (`fullstack-260503-0901-phase03-content-list.md`)? Listed in task brief but missing from `plans/reports/`.
4. Should video URLs additionally restrict to YouTube/Vimeo allowlist, or is generic http/https intentional?
5. Is description-clearing-on-empty-string the intended UX, or should empty string be ignored?
