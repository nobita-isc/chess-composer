# Code Review — Course Editor Improvements (Phases 1–5)

**Reviewer:** code-reviewer
**Date:** 2026-05-04
**Scope:** 18 files (10 new, 8 modified) across server + client
**Plan:** plans/260504-0900-course-editor-improvements/

---

## Score: 7.5 / 10

Solid, well-scoped delivery. Functionality correct, conventions clean, tests reasonable. Several real security/robustness issues that should be addressed before sign-off — none catastrophic, but the static-file handler path traversal is a real CVE-class bug.

---

## Critical Issues

### C1. Path traversal in `/uploads/videos/:filename` static handler — `packages/server/src/index.js:110-133`

`path.join(__dirname, '../uploads/videos', filename)` does NOT prevent `..`. Hono's `:filename` param is URL-decoded — request to `/uploads/videos/..%2F..%2F..%2Fetc%2Fpasswd` (or with backslashes on Windows) escapes VIDEOS_DIR. No `path.resolve` + prefix check like the DELETE route has.

**Severity:** High. Public, unauthenticated route. Any file the node process can read is exposed.

**Fix:** Mirror the guard from `routes/videos.js:68`:
```js
const VIDEOS_DIR = path.resolve(path.join(__dirname, '../uploads/videos'))
const filePath = path.resolve(path.join(VIDEOS_DIR, filename))
if (!filePath.startsWith(VIDEOS_DIR + path.sep)) return c.json({ error: 'Not found' }, 404)
```
Same bug exists in `/uploads/courses/:filename` (pre-existing — flag for follow-up, not blocking this PR).

### C2. Server trusts client-declared MIME — `packages/server/src/routes/videos.js:54-57`

`file.type` from FormData is browser-supplied. A crafted multipart upload can declare `video/mp4` while body is HTML/JS/EXE. Combined with C1's static handler returning `Content-Type: video/mp4` based on extension, exploitation requires correct extension — but extension is also derived purely from declared MIME (line 64), so an attacker who controls MIME controls extension and effectively writes a `.mp4` containing arbitrary bytes. Limited XSS risk because Content-Type forces video, but worth defense-in-depth.

**Fix:** Magic-byte sniff first 16 bytes of `buffer` against MP4 (`ftyp`), WebM (`1A 45 DF A3`), QuickTime atoms before write. Return 415 on mismatch.

### C3. YouTube ID regex too loose — `packages/client/src/shared/video-url-resolver.js:13`

`/^[A-Za-z0-9_-]{6,15}$/` accepts 6–15 chars. Spec-says canonical YouTube IDs are exactly **11 chars**. The "focus" prompt explicitly asked for 11-char check. Tests at `video-url-resolver.test.js:45-49` only check that a missing `v` param returns null — they do not assert that `?v=foo` (3 chars) is rejected, which it currently would be (passes 6-min). But `?v=ABCDEF` (6 chars) would be incorrectly accepted as a YouTube ID.

**Fix:** Change to `/^[A-Za-z0-9_-]{11}$/`. Add a test: `expect(resolveVideoUrl('https://youtu.be/short').videoId).toBeNull()`.

---

## High-Priority Issues

### H1. Sync FS calls block event loop — `routes/videos.js:71`, `index.js:124,131`

`fs.writeFileSync(diskPath, buffer)` for files up to 500 MB blocks the entire Hono server. Same for `fs.readFileSync` in the non-range static branch and `fs.existsSync`/`statSync` on every request. Single-user dev fine; multi-user prod will stall.

**Fix:** `await fs.promises.writeFile(...)`; for non-range serves, stream via `fs.createReadStream`.

### H2. `lme-tab` buttons inside `<form>`-context have no `type="button"` — `lesson-description-editor.js:65-68`, `lesson-meta-editor.js:47`

If meta editor ends up inside a `<form>` (likely as the editor pane evolves), Edit/Preview/Save buttons will submit the form. Cheap fix.

**Fix:** Add `type="button"` to all `<button>` elements not intended to submit.

### H3. Race in upload progress UI — `video-manager-page.js:160-170`

`uploadVideo` runs in `Promise.all` — fine. But badge text is set imperatively (`badge.textContent = pct < 100 ? ...`) inside the progress callback while concurrent uploads each write to their OWN badge (closures captured `item`), so OK. **However**, if user re-clicks `vm-upload-trigger` mid-upload, the second click runs `uploadQueue.innerHTML = ''` and orphans in-flight progress callbacks writing to detached DOM. No leak but UI confusion.

**Fix:** Disable upload trigger while queue not empty / set `fileInput.disabled = true` until all promises settle.

### H4. Modal cleanup leak — `content-item-video.js:54-85`

`openPickerModal` adds `keydown` listeners nowhere — fine. But `renderVideoManagerPage` is called inside the modal's `panel`. Its internal `_debounceTimer` (module-level in `video-manager-page.js:54`) is **shared across instances** — if user opens picker, types in search, closes modal before debounce fires, debounced `loadList` fires against detached panel. Will throw on `listEl.innerHTML` set against null parent? Actually no — listEl is held by closure even after detach, so write succeeds silently — but if the picker is reopened, both old + new debounce timers race.

**Fix:** Make debounce instance-scoped (move into `renderVideoManagerPage` body) or accept an AbortSignal and clear on close.

### H5. `videos.js` module-level `database` import — `routes/videos.js:10,39`

`new VideoLibraryRepository(database)` is created at module load. If `database` is not yet initialized when this module is imported, `repo` holds a reference to undefined-state DB. Existing repo pattern in the codebase usually constructs lazily inside handlers. Verify import order in `index.js` puts DB init before route imports.

---

## Medium-Priority Issues

### M1. `content-item-video.js` is 259 lines — exceeds 200-line cap (`development-rules.md`)

Flagged in prompt. Logical split:
- Extract `openPickerModal` → `video-picker-modal.js` (~40 lines)
- Extract `renderVideoPreview` + `validateVideoUrl` → `video-url-helpers.js` (~25 lines)
- Extract HTML template strings (`renderHeader`, `renderBody`) → `content-item-video-template.js`
After extraction, main file ~150 lines.

### M2. DRY: URL preview rendering split — `content-item-video.js:32-47` vs `video-manager-row.js`

`renderVideoPreview` (inline editor) and the manager row both display video metadata. Different needs (thumbnail vs. metadata), so not strict duplication, but both compute `filename = file_path.split('/').pop()` and prepend `/uploads/videos/`. Extract `videoFilePathToUrl(file_path)` helper to a shared util. Currently in `content-item-video.js:78-79`, `video-manager-row.js:25-28`, `lesson-player.js` (implicit via resolver), and `ApiClient` upload response.

### M3. Filename collision risk — `routes/videos.js:65`

`${Date.now()}_${Math.random().toString(36).substring(2, 8)}` → 6 chars of base36 = ~2B combos. With concurrent uploads sharing the same `Date.now()` ms, collision probability is small but non-zero. `crypto.randomUUID()` or `crypto.randomBytes(8).toString('hex')` is stronger and length-comparable.

### M4. `safeMarkdown` DOMPurify default config

Default DOMPurify config strips `javascript:` URLs and event handlers — confirmed safe. **However**, default config does NOT add `target="_blank"` `rel="noopener"`, which the consuming code at `lesson-description-editor.js:103-106` and `lesson-player.js:227-230` adds post-hoc. Fragile — if a future caller forgets, links open in same tab. Consider adding a DOMPurify hook in `safe-markdown.js` to set this once globally.

### M5. `validateVideoUrl` rejects relative paths — `content-item-video.js:20-24`

`new URL('/uploads/videos/x.mp4')` throws → returns 'Invalid URL format'. But picker fills `urlEl.value` with exactly `/uploads/videos/...` (line 79). After picking, the field shows as error-bordered until next render? Actually `render()` is called at line 236, which re-evaluates `validateVideoUrl(item.video_url)`. So picker URL → red border on render. **Bug.**

**Fix:** Allow relative paths starting with `/uploads/`:
```js
function validateVideoUrl(v) {
  if (!v) return null
  if (v.startsWith('/uploads/')) return null
  try { ... }
}
```

### M6. `escapeHtml` inconsistency

`content-item-video.js:15` escapes `& < > "` (no `'`).
`video-manager-row.js:9` escapes `& " ' < >`.
`lesson-player.js:14` escapes `& " ' < >`.
Centralize in a shared util — already proliferating across new files.

### M7. `apiClient.uploadVideo` does not pass `description` field — `ApiClient.js:569-596`

Server route accepts `body['description']` (`routes/videos.js:79`) but client never sends it. Not used in any UI, but spec seems incomplete or field is dead-code on server.

---

## Low-Priority Issues

- L1. `routes/videos.js:65` — magic substring `2, 8`. Constant.
- L2. `videos.js` route file uses `fs` sync APIs and `path.join` per call; cache `VIDEOS_DIR_RESOLVED` once.
- L3. `lesson-description-editor.js` — global `_stylesInjected` module flag works but breaks if module re-evaluated in test isolation (vitest); minor.
- L4. `video-manager-page.js:54-58` — module-level `_debounceTimer` (see H4). KISS: a `let timer` inside the function.
- L5. Phase reports note no integration tests for the upload route. Acceptable per phase report's reasoning, but a single happy-path test using a small fixture buffer would be cheap and catch C2 + filename collisions.
- L6. `content-item-video.js:181` — `executePatch` has unused `prevServerFields` param (acknowledged in JSDoc). Remove.
- L7. `video-manager-row.js:8-12` — escape order differs from other escapeHtml impls (escapes `"` before `<`/`>`); functionally equivalent but inconsistent.

---

## Edge Cases Found by Scout

- Existing video content items with external `video_url` (YouTube, Vimeo) → resolver returns `kind: 'video'` for Vimeo → `<video src="https://vimeo.com/123">` renders broken. **Backwards compat partial fail.** Pre-existing items pointing to YouTube watch URLs work; pointing to Vimeo or `.mp4` HTTP URLs work; pointing to anything that needs an `<iframe>` other than YouTube fails silently.
- Esc on title input reverts but does NOT cancel ongoing in-flight `executePatch` from previous `input` → blur sequence. Race: server may persist value Esc tried to revert.
- `lesson-meta-editor.js:65` — `debouncedPatch({ description, title })` includes `title` only when `titleDirty`. If user edits title, then edits description, then waits for debounce: payload contains both. If title patch fails, `serverTitle` is rolled back BUT `titleInput.value = serverTitle` happens (line 126). Description rollback also fires for the same patch (line 127). User's in-progress description edit is lost. Either field's failure rolls back the other.
- Upload of file >500 MB: `await file.arrayBuffer()` already loaded entire file into memory before size check (line 59 → 60). For a 4 GB upload, server OOMs before rejecting. Check `c.req.header('Content-Length')` first; reject early.

---

## API Contract Verification

Orchestrator → editor pane → meta editor → description editor wiring confirmed clean:

- `CourseManagementPage.js:164-170`: `onPreview` constructed with `startLessonId`, passed to `renderLessonEditorPane`.
- `lesson-editor-pane.js:34,75-82`: receives `onPreview`, mounts button conditionally, wires click.
- `lesson-meta-editor.js:60-73`: instantiates `createDescriptionEditor` with `onChange`/`onBlur` propagating to `debouncedPatch`/`executePatch`.
- `lesson-description-editor.js:58`: clean API, no leaks (`destroy()` is no-op but documented).
- `lesson-player.js:43-56`: `startLessonId` correctly resolves index, falls through to first-incomplete then index 0.

All contracts wired correctly.

---

## Positive Observations

- Static handler at index.js:110 properly supports HTTP Range requests for video seeking.
- Excellent `requireRole('admin')` wildcard guard at `videos.js:43` — no per-route reapplication.
- `UPDATABLE_FIELDS` whitelist in repo is the right pattern; tested explicitly (line 129-135).
- Test coverage on resolver (`video-url-resolver.test.js`) is genuinely thorough — null/empty/Vimeo/embed/shorts all tested.
- Clean async-shim pattern in `video-library-repository.test.js` for in-memory testing.
- `lesson-description-editor.js` properly opens preview links in new tab with `noopener noreferrer`.
- `safeMarkdown` is correctly used (no manual HTML concat with markdown).
- `resolveVideoUrl` consolidates URL handling; lesson-player and content-item-video share it.

---

## Recommended Actions (Pre-Sign-Off)

**Must fix:**
1. **C1** — Add path-traversal guard to `/uploads/videos/:filename` handler (3 lines).
2. **C3** — Tighten YouTube regex to exactly 11 chars + add reject test.
3. **M5** — Allow `/uploads/` paths in `validateVideoUrl` (visual bug after picker).

**Should fix:**
4. **C2** — Magic-byte MIME validation on upload.
5. **H1** — Switch to async fs APIs.
6. **H4** — Instance-scope the debounce timer in video-manager-page.
7. **M1** — Split content-item-video.js to ≤200 lines.

**Nice to have:**
8. M2 (URL helper), M6 (escapeHtml dedup), L5 (one upload integration test).

---

## Sign-Off Recommendation

**Conditional approve.** Merge after addressing C1, C3, M5 (all small, surgical fixes — together <30 lines of changes). Defer C2 and H1 to a follow-up if release-pressured but track them. The remaining Highs/Mediums are quality issues, not blockers.

---

## Unresolved Questions

1. Is `description` field on video upload (server accepts, client never sends) intentional dead code or a missed feature?
2. Should pre-existing Vimeo `video_url` items be migrated/handled, or accepted as broken-on-display (silent backwards-compat regression)?
3. Should `/uploads/videos/*` static serving require auth? Current state: anyone with the URL can view. Acceptable for educational content but worth confirming policy.
4. Phase 03 report (`fullstack-260504-0900-ce-phase03-picker-youtube.md`) is missing from `plans/reports/`. Was it generated?
