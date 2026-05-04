# Phase 1: Database Migration + Repository Update

## Context Links
- [CourseRepository.js](../../packages/server/src/lessons/CourseRepository.js)
- [Migration 010](../../packages/server/src/database/migrations/010_add_avg_rating.js)
- [lesson-content routes](../../packages/server/src/routes/lesson-content.js)

## Overview
- **Priority**: P1 (blocking — all other phases depend on this)
- **Status**: ✅ complete
- **Description**: Add `description` TEXT column to `lesson_content` table and update the repository layer to handle it in create/update flows.

## Key Insights
- Column is nullable TEXT — zero risk to existing rows, no backfill needed
- `CourseRepository.updateContent()` uses an explicit `allowedColumns` Set — must add `description` there
- `CourseRepository.createContent()` uses positional INSERT — must add `description` to the column list and values array
- Migration pattern follows existing convention: check `PRAGMA table_info`, ALTER TABLE if missing

## Requirements

### Functional
- `description` column exists on `lesson_content` after migration
- `createContent()` accepts and stores `description`
- `updateContent()` accepts and stores `description`
- Existing content items get `NULL` for description (no backfill needed)

### Non-functional
- Migration is idempotent (safe to re-run)
- No breaking changes to existing API contracts

## Related Code Files

### Modify
1. **`packages/server/src/lessons/CourseRepository.js`**
   - `createContent()`: add `description` to INSERT columns + values (line ~111)
   - `updateContent()`: add `'description'` to `allowedColumns` Set (line ~131)

### Create
1. **`packages/server/src/database/migrations/011_add_content_description.js`**

## Implementation Steps

1. Create migration file `011_add_content_description.js`:
   ```javascript
   export function migrate(db) {
     const tableInfo = db.prepare('PRAGMA table_info(lesson_content)').all()
     const hasColumn = tableInfo.some(col => col.name === 'description')
     if (!hasColumn) {
       db.exec('ALTER TABLE lesson_content ADD COLUMN description TEXT')
       console.log('   Added description column to lesson_content')
     } else {
       console.log('   description column already exists')
     }
   }

   export function rollback(db) {
     // SQLite doesn't support DROP COLUMN directly
   }
   ```

2. Update `CourseRepository.createContent()`:
   - Add `description` to the INSERT column list (after `puzzle_challenges`)
   - Add `data.description || null` to the values array
   - Update the positional parameters count

3. Update `CourseRepository.updateContent()`:
   - Add `'description'` to the `allowedColumns` Set

4. Run `npm run dev:server` to verify migration auto-runs on startup

## Todo
- [x] Create migration `011_add_content_description.js`
- [x] Update `createContent()` in CourseRepository
- [x] Update `updateContent()` allowedColumns in CourseRepository
- [x] Verify server starts without errors
- [x] Test: create content with description via API
- [x] Test: update content description via API

## Success Criteria
- Server starts, migration runs, `PRAGMA table_info(lesson_content)` shows `description` column
- `POST /api/lessons/:id/content` with `{ description: "# Hello" }` stores it
- `PUT /api/content/:id` with `{ description: "updated" }` updates it
- `GET /api/lessons/:id/content` returns `description` field in response

## Risk Assessment
- **Risk**: Migration fails on corrupted DB → Mitigation: idempotent check before ALTER
- **Risk**: Positional INSERT mismatch → Mitigation: count columns carefully, run compile check

## Security Considerations
- Description is stored as raw text (markdown). No server-side sanitization needed — sanitization happens at render time on client.
- The `allowedColumns` pattern already prevents injection of unexpected fields.
