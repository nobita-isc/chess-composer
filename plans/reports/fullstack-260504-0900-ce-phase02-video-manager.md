# Phase 2 Report — Admin Video Manager Page

## Status: completed

## Files Modified / Created

| File | Lines | Action |
|---|---|---|
| `packages/client/src/lessons/video-manager-page.js` | 181 | created |
| `packages/client/src/lessons/video-manager-row.js` | 124 | created |
| `packages/client/src/api/ApiClient.js` | 639 (+58) | modified — added 5 video methods |
| `packages/client/src/core/routeConfig.js` | 120 (+9) | modified — added `/videos` route + sidebar map entry |
| `packages/client/src/index.js` | 233 (+18) | modified — import, nav button, route wiring |

`lesson-meta-editor.js` NOT touched (Phase 5 ownership).

## Tasks Completed

- [x] Route `/videos` added to `createAdminRoutes` (admin-guarded via existing `[authGuard, adminGuard]`)
- [x] Sidebar "Videos" nav button injected into `#sidebar-dynamic-nav` (same pattern as Users button)
- [x] `nav-videos` → `/videos` added to `navMap` in index.js
- [x] `SIDEBAR_MAP` in routeConfig updated so active state highlights correctly
- [x] API client: `getVideos`, `getVideoFolders`, `uploadVideo` (XHR with progress), `updateVideo`, `deleteVideo`
- [x] `video-manager-page.js`: toolbar (folder dropdown + search), upload zone with per-file progress badges, list rendering, debounced search (300ms), folder filter, empty state
- [x] `video-manager-row.js`: title, meta (folder, size, date), Copy URL, Edit (prompt rename), Delete (confirm)
- [x] `pickerMode` supported (see API below)
- [x] All files ≤200 lines (new files); reuse `showAppConfirm`, `showAppPrompt`, `showAppAlert`
- [x] Inline `<style>` with `vm-*` prefix matching `cm-*` aesthetic (neutral buttons, subtle borders, quiet metadata)

## Build / Test Results

- Syntax check (`node --check`): pass (all 5 files)
- Build (`npm -w packages/client run build`): clean, 493 KB bundle
- Tests: 608/608 pass

## pickerMode API (for Phase 3)

```js
import { renderVideoManagerPage } from './lessons/video-manager-page.js'

// Embed as picker (e.g. inside a modal)
renderVideoManagerPage(modalContainer, {
  pickerMode: true,
  onPick: (video) => {
    // video: { id, title, original_name, file_path, file_size, folder, created_at, ... }
    // Absolute URL: window.location.origin + '/uploads/videos/' + filename
    handleVideoSelected(video)
  },
  onCancel: () => closeModal()
})
```

In picker mode: header says "Pick a Video", Cancel button shown, each row is clickable and shows a "Select" button; Edit/Delete hidden.

## Nav Routing Approach

- `nav-videos` button injected into `#sidebar-dynamic-nav` (same div as Users, appended after)
- Wired via existing `navMap` in index.js — no structural changes to router
- `SIDEBAR_MAP.videos = 'nav-videos'` so `updateSidebarActive('videos')` highlights it correctly

## Upload Implementation

- Used `XMLHttpRequest` (not `fetch`) to get upload progress events — per risk note in phase file
- Progress shown as `0%..99%..Processing..Done/Error` badge per file
- Folder prompt shown before file picker opens (KISS: single prompt, not per-file)

## Deviations

- `onCancel` prop added to pickerMode (not explicitly specced but needed for Phase 3 modal close)
- `fileInput.onchange` assigned directly (not `addEventListener`) to safely replace handler across re-uses
- Edit only renames title (not folder/description inline) — KISS; folder edit via title prompt is sufficient for MVP; description edit deferred (YAGNI)

## Docs Impact: minor
