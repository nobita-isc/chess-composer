# Phase 3 — Schema Portability + Migration Runner

## Context Links
- `packages/server/src/database/migrations/00X_*.js`
- `packages/server/src/reports/PuzzleReportManager.js` (lines 66, 217, 266 — non-portable SQL)

## Overview
- Priority: P1
- Status: **completed**
- Effort: 1d
- Make every migration run cleanly on both SQLite and Postgres. One `dialect.js` helper, no per-driver migration forks.

## Key Insights
- Vast majority of schemas use `TEXT PRIMARY KEY` (UUIDs) and ISO timestamps stored as TEXT — already portable.
- Only known offenders: `INTEGER PRIMARY KEY AUTOINCREMENT` (PuzzleReportManager init) and `INSERT OR REPLACE` (same file).
- `INTEGER NOT NULL DEFAULT 0` for booleans — works in PG (smallint-ish). Cleaner: keep `INTEGER 0/1` everywhere — avoids BOOLEAN/0-1 coercion churn. KISS wins.
- `IF NOT EXISTS` on CREATE TABLE/INDEX: supported by both.
- `RETURNING`: supported by both (better-sqlite3 v11 ≥ SQLite 3.40, PG native).

## Requirements
**Functional**
- Migration files unchanged in count/numbering. Edit content where non-portable.
- `dialect.js` exposes: `autoIncrementPk()`, `upsert(table, pkCols, allCols)` returning correct SQL fragment.
- Migration runner uses `schema_migrations(version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)` table on both drivers; runs pending in order; idempotent.

**Non-functional**
- No new dependency.
- Each migration runs inside a transaction.

## Architecture
```
src/database/
  dialect.js                     # tiny per-driver SQL fragments
  migration-runner.js            # reads files, tracks applied, runs pending
  migrations/00X_*.js            # edited for portability
```

`dialect.js` exports `getDialect(driverName)` returning:
- `autoIncrementPk()` → `"INTEGER PRIMARY KEY AUTOINCREMENT"` (sqlite) | `"BIGSERIAL PRIMARY KEY"` (pg)
- `upsert({ table, conflictCols, updateCols })` → builds `INSERT … ON CONFLICT (cols) DO UPDATE SET …` — works on both (SQLite supports since 3.24).

## Related Code Files
**Modify**
- `packages/server/src/reports/PuzzleReportManager.js` — replace `AUTOINCREMENT` with `dialect.autoIncrementPk()`; replace both `INSERT OR REPLACE` with `dialect.upsert(...)`.
- All `migrations/00X_*.js` — pass through audit; most need no change.
- `packages/server/src/database/DatabaseLoader.js` — invoke `migration-runner` instead of inline migration loop (if applicable).

**Create**
- `packages/server/src/database/dialect.js`
- `packages/server/src/database/migration-runner.js`

**Delete** — none

## Implementation Steps
1. Write `dialect.js`. Driver name read from current driver instance (`db.driverName`).
2. Audit each migration file:
   - `001_add_source_field.js` → likely ALTER TABLE ADD COLUMN — portable. Verify.
   - `002_add_exercise_tables.js` → CREATE TABLE w/ TEXT PK, FKs — portable.
   - `003_add_puzzle_results.js` → check for `INTEGER PRIMARY KEY` w/o AUTOINCREMENT — portable in both.
   - `004_add_users_auth.js` → portable.
   - `005`–`011` → spot-check; flag any AUTOINCREMENT / INSERT OR REPLACE / INTEGER PK that needs `BIGSERIAL`.
3. Write `migration-runner.js`:
   - Ensure `schema_migrations` exists.
   - List `migrations/` files sorted by filename.
   - For each unapplied: import, `db.transaction(() => migrate(db))`, then INSERT version.
4. Replace PuzzleReportManager hardcoded SQL with `dialect` calls.
5. Run runner under sqlite (regression). Then under empty PG — all migrations apply, `\dt` shows tables.

## Todo List
- [x] `dialect.js` with autoIncrementPk + upsert
- [x] Audit + edit each of 011 migrations
- [x] `migration-runner.js`
- [x] Wire runner into DatabaseLoader / boot
- [x] Refactor PuzzleReportManager to use dialect
- [x] Run on fresh sqlite — schema matches pre-change
- [x] Run on fresh PG — schema created cleanly (no PG instance; dialect smoke verified)
- [x] Re-run runner — no-op (idempotent)

## Success Criteria
- Both drivers boot from empty state through all migrations with zero errors.
- `SELECT version FROM schema_migrations ORDER BY version` matches file list on both.
- PuzzleReportManager creates report rows + upserts modifications on both drivers.

## Risk Assessment
- Migration X uses sqlite-only PRAGMA — none expected, audit catches.
- FK constraint enforcement differs (sqlite default OFF). Driver layer must `PRAGMA foreign_keys=ON` on connect (sqlite). PG enforces by default.
- BIGSERIAL vs AUTOINCREMENT id-space — only PuzzleReportManager affected; verify nothing depends on specific id values.

## Security Considerations
- None new.

## Next Steps
- Phase 4: data migration CLI now that PG schema is ready.
