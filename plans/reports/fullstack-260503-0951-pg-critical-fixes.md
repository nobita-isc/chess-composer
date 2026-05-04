# PG Critical Fixes Report

**Agent:** fullstack-developer
**Date:** 2026-05-03
**Scope:** C1–C5 from reviewer-260503-0951-pg-driver-migration.md

---

## Status: ALL 5 FIXED

Tests: 431/431 pass, 0 errors (was 431/431 pass + 1 unhandled rejection error).

---

## C1 — SqliteDatabase.transaction() async fix

**File:** `packages/server/src/database/SqliteDatabase.js:207-218` (was 207-216)

**Root cause:** `this.db.transaction(fn)` (better-sqlite3 sync wrapper) ran BEGIN + COMMIT synchronously before the `await fn(shim)` callbacks had a chance to resolve. `result` was always `undefined`. The `INSERT INTO schema_migrations` inside the transaction ran outside the TX.

**Fix:** Replaced `this.db.transaction(...)` wrapper with manual `this.db.exec('BEGIN')` / `await fn(shim)` / `this.db.exec('COMMIT')` pattern — same approach as `SqliteDriver.transaction()`. Kept the shim intact (shim methods are still needed to expose async-compatible API over better-sqlite3).

---

## C2 — ADD COLUMN TX poisoning on Postgres

**Files created:**
- `packages/server/src/database/migration-helpers.js` (new, 65 lines)

**Files updated (8 migrations):**
- `migrations/001_add_source_field.js`
- `migrations/003_add_puzzle_results.js`
- `migrations/005_add_puzzle_hints.js`
- `migrations/006_add_is_final_flag.js`
- `migrations/008_add_puzzle_composer_fields.js`
- `migrations/009_add_puzzle_challenges_field.js`
- `migrations/010_add_avg_rating.js`
- `migrations/011_add_content_description.js`

**Root cause:** try/catch around `ALTER TABLE ... ADD COLUMN` inside a PG transaction poisons the entire TX on "already exists" error. All subsequent statements (including `INSERT INTO schema_migrations`) fail silently.

**Fix:** Created `addColumnIfNotExists(db, table, column, type)` helper in `migration-helpers.js`:
- Postgres path: emits `ALTER TABLE t ADD COLUMN IF NOT EXISTS col TYPE` (PG 9.6+) — no error, no TX poisoning.
- SQLite path: queries `PRAGMA table_info(t)` first; skips ALTER if column already exists.
- Raw better-sqlite3 fallback: uses `db.prepare(...).all()` when `db.query` is absent (covers test fixtures and legacy callers).

All 8 migrations updated to use `addColumnIfNotExists`. Dropped all try/catch ALTER blocks.

**Note on test compatibility:** `content-description-repository.test.js:116` calls `migrate(db)` with a raw better-sqlite3 instance and uses `expect(() => migrate(db)).not.toThrow()` (sync assertion on async fn). Before fix: worked by accident (old sync PRAGMA path). After fix: helper detects absent `db.query` and falls back to `db.prepare().all()` — no unhandled rejection.

---

## C3 — Boot order: initAsync() before runMigrations

**File:** `packages/server/src/index.js:53-54`

**Root cause:** `databaseGenerator.initialize()` calls `_initPostgres()` which sets `this.initialized = true` eagerly but leaves `this.driver = null` while connect completes async. `runMigrations(database)` on the next line hits `driver === null` → first query throws `Database not initialized`.

**Fix:** Added `await database.initAsync()` between `databaseGenerator.initialize()` and `runMigrations(database)`. `initAsync()` is a no-op for sqlite path (safe for both paths).

---

## C4 — BIGINT for millisecond timestamp columns

**File:** `packages/server/src/reports/PuzzleReportManager.js:64-81`

**Root cause:** `reported_at INTEGER NOT NULL` and `modified_at INTEGER NOT NULL` declared as INT4 in Postgres. `Date.now()` ≈ 1.7×10¹² overflows PG INT4 max (2.1×10⁹) → every insert fails.

**Fix:** Added `const isPostgres = Boolean(this.db.driver)` check; uses `BIGINT` for PG path, `INTEGER` for sqlite path. Both tables (`puzzle_reports`, `puzzle_modifications`) updated. SQLite stores BIGINT as 8-byte int — fully compatible.

---

## C5 — migrate-to-postgres: migrations before emptiness check

**File:** `packages/server/src/cli/migrate-to-postgres.js:206-221`

**Root cause:** On fresh PG target, `checkTargetEmpty` runs `SELECT count(*) FROM "puzzles"` before tables exist → `relation does not exist` → FATAL exit.

**Fix:** Swapped block order — PG migrations now run FIRST (creates all tables), then non-empty check runs. Added clarifying comments. `--dry-run` and `--verify-only` paths unaffected (migrations block is already guarded by `!args.dryRun && !args.verifyOnly`).

---

## Verification

```
npm test → 431/431 pass, 0 errors
node src/cli/migrate-to-postgres.js --help → prints usage OK
npm -w packages/server run start → clean boot, "No pending migrations", 1,834,231 puzzles loaded
  (EADDRINUSE on port 3001 is expected — another server process already running)
```

---

## Unresolved Questions

- C4 only fixes table creation for NEW installs. Existing PG installs with `INTEGER` columns for `reported_at`/`modified_at` will still fail on insert. A follow-up migration (`ALTER TABLE puzzle_reports ALTER COLUMN reported_at TYPE BIGINT`) is needed for PG upgrade path — skipped per "critical fixes only" scope.
- `--verify-only` on a fresh PG (no tables yet) will fail in `verifyCounts` since tables don't exist. Not in scope (C5 fix only covers the non-empty check; verify-only skips copy/migrations by design).
