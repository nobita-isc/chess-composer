# Phase 1 — Backend: Video Library

**Status:** ✅ COMPLETED 2026-05-04

## Context Links
- Reference upload pattern: `packages/server/src/routes/lesson-content.js` (POST `/content/upload`)
- Existing migrations dir: `packages/server/src/database/migrations/`
- Auth middleware: `requireRole('admin')`
- Repository pattern reference: `packages/server/src/lessons/CourseRepository.js`

## Overview
- Priority: P2 (foundation; blocks P2/P3)
- Status: ✅ completed
- Effort: 5h actual
- Build server-side video library: storage, DB table, repository, REST routes.

## Key Insights
- PDF upload pattern in `lesson-content.js` is reusable verbatim — replicate for videos with different MIME whitelist + folder.
- `folder` is a flat string ("openings/italian"), no tree table; LIKE prefix queries cover navigation needs.
- File size cap: 500MB. Reject anything larger pre-write.

## Requirements
**Functional**
- Admin can upload video file (mp4/webm/mov) → stored on disk, row inserted.
- Admin can list videos with filters: `folder` exact match, `q` title search, pagination.
- Admin can list distinct folder strings.
- Admin can update title/description/folder.
- Admin can delete (DB row + unlink file).

**Non-functional**
- 500MB max upload, MIME whitelist enforced.
- All routes admin-only.
- Repository ≤200 lines; route file ≤200 lines.

## Architecture
```
[client] --multipart--> POST /api/videos/upload
                           |
                           v
                    routes/videos.js (auth + validate)
                           |
                           v
                    VideoLibraryRepository
                           |
                           v
                    SQLite videos table  +  uploads/videos/{ts}_{rand}.{ext}
```

## Related Code Files
**Create**
- `packages/server/src/database/migrations/012_add_videos_table.js`
- `packages/server/src/lessons/VideoLibraryRepository.js`
- `packages/server/src/routes/videos.js`
- `packages/server/uploads/videos/.gitkeep`

**Modify**
- `packages/server/src/index.js` (mount `/api/videos`; verify static `/uploads/*` serves new subdir)

## Implementation Steps
1. Create migration `012_add_videos_table.js`:
   - Columns: `id TEXT PK`, `title TEXT NOT NULL`, `description TEXT DEFAULT ''`, `file_path TEXT NOT NULL`, `file_size INTEGER`, `duration_seconds INTEGER`, `mime_type TEXT`, `folder TEXT NOT NULL DEFAULT ''`, `created_at TEXT`, `updated_at TEXT`.
   - Index: `CREATE INDEX idx_videos_folder ON videos(folder);`
2. Run migration; verify schema.
3. Create `VideoLibraryRepository.js` with: `createVideo`, `findVideos({ folder, q, limit, offset })`, `findVideoById`, `findDistinctFolders`, `updateVideo` (whitelist title/description/folder), `deleteVideo`.
4. Create `routes/videos.js`:
   - `POST /upload` — parse multipart, validate MIME (`video/mp4|webm|quicktime`), validate size ≤500MB, generate `{ts}_{rand}.{ext}`, write to `uploads/videos/`, insert row, return `{id, title, file_path, url, ...}`.
   - `GET /` — list with `?folder=&q=&limit=&offset=`.
   - `GET /folders` — distinct non-empty folders.
   - `PUT /:id` — partial update.
   - `DELETE /:id` — fetch row, unlink file (best-effort), delete row.
   - Wrap all in `requireRole('admin')`.
5. Mount `app.route('/api/videos', videos)` in `index.js`.
6. Verify `/uploads/videos/{file}` is publicly readable via existing static serving; if not, extend static config.
7. Add basic API tests (upload tiny fixture, list, update, delete).

## Todo List
- [x] Migration written + applied
- [x] Repository implemented + ≤200 lines
- [x] Routes implemented + admin-gated
- [x] Mounted in `index.js`
- [x] Static serving verified for `/uploads/videos/`
- [x] Unit/integration tests added
- [x] All tests green (+13 unit tests)

## Success Criteria
- ✅ Upload returns 201 with playable URL.
- ✅ List filtered by folder works.
- ✅ Non-admin gets 403 on every write route.
- ✅ File deleted from disk when row deleted.
- ✅ Test suite 620/620 all green.

## Risk Assessment
- Disk fill from large uploads — mitigated by 500MB cap; future: per-user quota.
- Orphaned files if process crash mid-upload — acceptable; tolerable, future cleanup job.
- MIME spoofing via header — magic-byte check skipped for KISS; whitelist + extension check sufficient for admin-only context.

## Security Considerations
- Path traversal: never accept user-supplied filenames; always generate `{ts}_{rand}.{ext}` with extension whitelisted.
- MIME whitelist enforced server-side (do NOT trust client).
- Role gate: `requireRole('admin')` on every route.
- Size limit enforced before disk write where possible (stream, abort on threshold).
- Folder string sanitization: strip `..`, leading `/`, control chars; limit length 200.

## Next Steps
- Phase 2 consumes these endpoints to build the manager UI.
