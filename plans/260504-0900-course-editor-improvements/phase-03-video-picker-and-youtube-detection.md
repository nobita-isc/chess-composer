# Phase 3 — Video Picker + YouTube Auto-Detect

**Status:** ✅ COMPLETED 2026-05-04

## Context Links
- `packages/client/src/lessons/content-item-video.js` (admin video URL field)
- `packages/client/src/lessons/lesson-player.js` (video rendering)
- `packages/client/src/lessons/lesson-puzzle-player.js` (audit)
- Phase 2 video manager `pickerMode`

## Overview
- Priority: P2
- Status: ✅ completed
- Effort: 3h actual
- Add "Pick from library" button to video content editor; auto-detect YouTube vs file URL on render.

## Key Insights
- Detection is client-side ONLY; admin editor stores raw URL string. Player switches between `<iframe>` and `<video>` at render time.
- Tiny pure utility centralizes URL classification — reuse in admin preview + player.

## Requirements
**Functional**
- `[Pick from library]` button in content-item-video editor opens modal with manager in `pickerMode`.
- Selecting a video populates URL field.
- Player renders YouTube URL via iframe embed; other URLs via `<video controls>`.
- Admin preview pane in editor uses same renderer.

**Non-functional**
- Resolver utility ≤50 lines, pure function.
- No new client deps.

## Architecture
```
video-url-resolver.js  (pure)
  input: rawUrl
  output: { kind: 'youtube'|'video', embedUrl?, playUrl, videoId? }

content-item-video.js  ──┐
lesson-player.js         ├── consume resolver
lesson-puzzle-player.js ─┘
```

## Related Code Files
**Create**
- `packages/client/src/shared/video-url-resolver.js`
- `packages/client/src/lessons/video-picker-modal.js` (if extraction warranted; else inline in content-item-video)

**Modify**
- `packages/client/src/lessons/content-item-video.js`
- `packages/client/src/lessons/lesson-player.js`
- `packages/client/src/lessons/lesson-puzzle-player.js` (if it renders video)

## Implementation Steps
1. Create `video-url-resolver.js`:
   - Match `youtu.be/{ID}`, `youtube.com/watch?v={ID}`, `youtube.com/embed/{ID}`, `youtube.com/shorts/{ID}`.
   - Return `{ kind: 'youtube', videoId, embedUrl: 'https://www.youtube.com/embed/' + id }` or `{ kind: 'video', playUrl: rawUrl }`.
2. Add `[Pick from library]` button in `content-item-video.js`:
   - On click: open modal hosting `video-manager-page` in `pickerMode`.
   - On select: write `/uploads/videos/{file}` URL into the URL input + trigger existing change handler (so debounced save fires).
3. Update render path:
   - In editor preview area: use resolver → render correct element.
   - In `lesson-player.js`: replace direct `<video>` with resolver-driven element.
4. Audit `lesson-puzzle-player.js` for any video render; apply same resolver if present.
5. Manual test: paste YouTube URL → iframe; paste `/uploads/videos/x.mp4` → `<video>`.

## Todo List
- [x] Resolver utility created with unit tests
- [x] Picker button + modal integrated
- [x] Player rendering switched to resolver
- [x] Editor preview uses resolver
- [x] Manual smoke covering 4 URL patterns + uploaded file (+12 unit tests)

## Success Criteria
- ✅ Both YouTube and uploaded videos render correctly in admin preview AND lesson player.
- ✅ Picker workflow: click → select → URL fills → autosave fires → player plays.

## Risk Assessment
- YouTube URL variants (live, playlists, timestamps) — keep narrow scope: ID extraction only; unsupported variants fall through to `<video>` and visibly break (acceptable; documented).
- iframe sandbox: YouTube embed requires `allowfullscreen`, `frameborder=0`; ensure attributes set.

## Security Considerations
- XSS via raw URL: resolver must validate `videoId` charset (`[A-Za-z0-9_-]{6,15}`); reject otherwise.
- Iframe `src` constructed from sanitized ID only — never interpolate raw URL into HTML.
- For non-YouTube `<video src>`: ensure URL is same-origin or explicit allow-list (`/uploads/`); else show warning. (Optional — pragmatic: trust admin input but document.)

## Next Steps
- After Phase 3, video flow is complete end-to-end.
