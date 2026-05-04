# Phase 2 — Admin Video Manager Page

**Status:** ✅ COMPLETED 2026-05-04

## Context Links
- Depends on Phase 1 API.
- Reference page layouts: `packages/client/src/lessons/CourseManagementPage.js`, `course-list-pane.js`.
- Existing client router: search for nav registration in client entry.

## Overview
- Priority: P2
- Status: ✅ completed
- Effort: 4h actual
- Dedicated admin page to upload, browse, edit, delete videos.

## Key Insights
- Single page, dropdown folder filter — KISS over 2-pane sidebar.
- Inline rename via prompt; folder edit via prompt with autocomplete from `GET /folders` (datalist).
- Generic icon now; thumbnail generation deferred.
- Multi-file upload = parallel POSTs; per-row status badge.

## Requirements
**Functional**
- Upload area: drag-drop + file picker (`<input type=file multiple accept="video/*">`).
- Per upload: progress, success/fail badge.
- List: title, folder, size, duration (if known), copy-URL, edit, delete.
- Folder filter dropdown (datalist or `<select>` populated from `/folders`).
- Search input (title `q`).
- Edit: title (prompt), folder (prompt + datalist), description (textarea modal).
- Delete confirmation.

**Non-functional**
- Files ≤200 lines each. Split into row component if needed.
- Reuse fetch helper / auth header pattern from existing pages.

## Architecture
```
video-manager-page.js
  ├─ upload zone (multi-file POST → /api/videos/upload)
  ├─ filter bar (folder dropdown + search)
  └─ video list
       └─ video-manager-row.js (action buttons)
```

## Related Code Files
**Create**
- `packages/client/src/lessons/video-manager-page.js`
- `packages/client/src/lessons/video-manager-row.js` (if main file approaches 200 lines)

**Modify**
- Client router/nav registration (locate via Grep on existing routes)
- Add nav link "Videos" admin-only

## Implementation Steps
1. Locate router registration; add `/admin/videos` route + admin gate.
2. Add nav entry (admin-only visible).
3. Build `video-manager-page.js`:
   - On mount: fetch `/api/videos` + `/api/videos/folders`.
   - Render filter bar, upload zone, list.
   - Upload handler: per file `fetch POST /api/videos/upload` (FormData), append result on success, show error on fail.
   - Search/filter: debounced refetch.
4. Row component: title, meta line, action buttons.
5. Edit handlers: PUT `/api/videos/:id` with changed fields; refresh row.
6. Delete handler: confirm, DELETE, remove row.
7. Wire copy-URL to clipboard with `navigator.clipboard.writeText(absoluteUrl)`.
8. Add `pickerMode` flag (used in Phase 3): when true, render `Select` button per row; emit `onSelect(video)` instead of inline edits.

## Todo List
- [x] Route + nav added (admin-only)
- [x] Page module created, ≤200 lines
- [x] Upload (multi-file) functional
- [x] List + filter + search functional
- [x] Inline edit (title/folder/description)
- [x] Delete with confirmation
- [x] `pickerMode` supported (used by Phase 3)
- [x] Manual smoke test on local server

## Success Criteria
- ✅ Admin can fully manage video library without DB tooling.
- ✅ Non-admin cannot access route or call APIs.
- ✅ 500MB upload completes; 600MB upload rejected with clear error.

## Risk Assessment
- Large file upload UX — no progress without XHR upload event listener; if `fetch` lacks progress, swap to `XMLHttpRequest` for upload progress (acceptable scope).
- Concurrent edits not handled — last-write-wins acceptable for admin-only.

## Security Considerations
- Admin gate enforced both client-side (route guard) AND server-side.
- Sanitize displayed filenames/titles (text node, never `innerHTML`).
- Folder input length-limited client-side; server re-validates.

## Next Steps
- Phase 3 reuses this page in `pickerMode` for content editor integration.
