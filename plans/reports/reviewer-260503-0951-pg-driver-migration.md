# Code Review: PostgreSQL Driver + SQLite→Postgres Migration

**Reviewer:** code-reviewer
**Date:** 2026-05-03
**Scope:** 5 phases — driver abstraction, async, schema portability, migration CLI, config/docs
**Score:** 5/10
**Sign-off:** **DO NOT MERGE** — multiple critical correctness bugs that break Postgres path AND SQLite migration path. Block on fixes for items C1, C2, C3, C4, C5 below.

---

## Summary

Architecture is sound (clean driver abstraction, dialect helpers, table manifest, topological copy ordering). Param adapter is simple but has gaps. Repos and routes are uniformly async-correct (no missing awaits found in greps).

However the implementation has several **critical** correctness bugs that mean:
- SQLite migrations are silently broken under the new `transaction()` shim (likely don't run, or run outside the TX).
- Postgres ADD COLUMN migrations cannot succeed — try/catch inside a TX poisons the TX.
- Postgres path crashes immediately because boot order doesn't await async driver init.
- Several timestamp columns typed `INTEGER` overflow PG `INT4` for `Date.now()` values.
- `migrate-to-postgres` CLI checks PG emptiness BEFORE running migrations → tables don't exist yet → crash on a clean target.

---

## Critical Issues (block merge)

### C1. SQLite `transaction()` shim does not await the inner async function
**File:** `packages/server/src/database/SqliteDatabase.js:207-216`

```js
const txn = this.db.transaction(() => {
  const p = fn(shim);
  p.then(v => { result = v; });
});
txn();
return result;
```

`better-sqlite3`'s wrapped fn is fully synchronous: it runs BEGIN, executes the inner function, then COMMIT — all in one tick. The inner function fires off the async `fn(shim)` which returns a Promise; the `.then` callback fires later in a microtask. By then COMMIT has already happened. `result` is always `undefined`.

For migrations this means the migration body executes (microtasks resolve sync-ish via Promise.resolve), but anything past the first real `await` boundary may run AFTER COMMIT. And the runner's own `INSERT INTO schema_migrations` (in migration-runner.js:76) inside `db.transaction` is fully async — it definitely runs outside the transaction.

**Fix:** drop the better-sqlite3 wrapper for this path. Use manual `BEGIN/COMMIT/ROLLBACK` via `this.db.exec()` like the underlying `SqliteDriver.transaction` already does (sqlite-driver.js:101-110). Or even simpler: when sqlite path, delegate to a `SqliteDriver` instance instead of duplicating the shim.

No tests cover this path (`grep` for runMigrations in tests = 0 hits).

---

### C2. ADD COLUMN migrations are unrunnable on Postgres (TX poisoning)
**Files:** `migrations/001`, `003`, `005`, `006`, `008`, `009`, `010`, `011` — 8 of 11 migrations.

Pattern in all of them:
```js
try {
  await db.exec(`ALTER TABLE ... ADD COLUMN ...`);
} catch (err) {
  if (msg.includes('duplicate column') || msg.includes('already exists')) { /* swallow */ }
  else throw err;
}
```

In Postgres, once any statement raises inside a TX block, the entire transaction is aborted and every subsequent command returns `current transaction is aborted, commands ignored until end of transaction block` — the `INSERT INTO schema_migrations` at the end of the TX fails, the migration is never marked applied, and the next run has the same problem forever.

**Fix:** for Postgres use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` (PG 9.6+). For SQLite, query `PRAGMA table_info(<table>)` first, only ALTER if absent. Encapsulate as `addColumnIfNotExists(db, table, colDef)` helper using `getDialectForDb`. Drop the try/catch entirely.

---

### C3. Boot order races async PG driver connect
**File:** `packages/server/src/index.js:46-58`, `SqliteDatabase.js:75-93`

`databaseGenerator.initialize()` calls `loader.load()` → `database.initialize()` which for the postgres path schedules `_pendingInit` and returns immediately. `database.driver` is still `null` when `runMigrations(database)` is called on the next line — first migration query throws `Database not initialized`.

Also `_initPostgres` sets `this.initialized = true` *before* the connect promise resolves (line 77). `isReady()` returns true but no driver exists. Misleading.

**Fix:** in `index.js`, `await database.initAsync()` after `databaseGenerator.initialize()` and before `runMigrations`. Move the `initialized = true` flag inside the resolved branch of `_pendingInit`.

---

### C4. `puzzle_reports.reported_at` and `puzzle_modifications.modified_at` use INTEGER + millisecond timestamps
**File:** `packages/server/src/reports/PuzzleReportManager.js:64-81`

Both tables are created via `dialect.exec` with `INTEGER NOT NULL`. In Postgres `INTEGER` = INT4 (max 2,147,483,647). `Date.now()` ≈ 1.7×10¹². Every insert blows up with `integer out of range`. Same column types in puzzle_reports are inserted with `Date.now()` at line 129 / 227 / 244 / 279.

**Fix:** use `BIGINT` for both columns — needs a portability shim (`dialect.bigInt()` returning `INTEGER` for sqlite, `BIGINT` for pg). Or switch to TEXT ISO timestamps for consistency with other tables.

Audit other migrations for the same issue (007 uses INTEGER for `order_index` only — bounded, OK).

---

### C5. `migrate-to-postgres` checks emptiness before running PG migrations
**File:** `packages/server/src/cli/migrate-to-postgres.js:207-221`

```js
if (!args.verifyOnly && !args.dryRun && !args.allowNonEmpty) {
  const nonEmpty = await checkTargetEmpty(pgDriver, tables);  // SELECT count(*) FROM "puzzles" — table does not exist yet
  ...
}
// --- Run schema migrations on PG first ---
if (!args.verifyOnly && !args.dryRun) {
  await runMigrations(pgDriver);
}
```

On a fresh PG target (the most common migration scenario) `count(*) FROM "puzzles"` raises `relation does not exist`, hits the catch in `main`, prints FATAL, exits 2.

**Fix:** swap the order — run migrations first, then check emptiness. Or wrap `checkTargetEmpty` in a `to_regclass('public.<t>') IS NOT NULL` filter.

---

## High-Priority Issues

### H1. Param adapter is too narrow
**File:** `database/drivers/param-adapter.js`

Only handles single-quoted strings. Misses:
- `--` line comments containing `?` (e.g. `-- WHERE x = ?`) → would convert to `$N`.
- `/* block comments */` ditto.
- `"double quoted identifiers"` containing `?` (rare but legal). Adapter would replace.
- PG dollar-quoted strings `$tag$ ... ?$tag$`.
- PG JSON ops `?` `?|` `?&` (not used in current SQL — verify and document).

Risk in the current codebase is low (no comments / dollar quotes in our SQL grep) but the adapter is presented as general-purpose. At minimum: document the limitations in the JSDoc, and add a test for the `'don''t'` escape case (claim made in comments — needs proof).

`adaptParams` returns `count` but no caller uses it.

### H2. Postgres driver: `query()` / `run()` don't capture the failing SQL on error
Wrapping `pool.query` errors with the original SQL (or first 200 chars) helps a lot when a migration explodes. Currently you get raw pg errors with no context.

### H3. `DatabaseLoader.getPuzzlesByIds` hits sqlite-only sync path
**File:** `database/DatabaseLoader.js:98` → calls `this.db.getPuzzlesByIds(sampled)` which uses `this.db.db.prepare(...)` (SqliteDatabase.js:133-138). Throws on Postgres path. Either remove the in-memory theme index path entirely for postgres OR guard with `if (this.db.db) { ... } else { /* fallback to async query */ }`.

Same applies to `buildThemeIndex`, `getPuzzleIdsByTheme`, `addToThemeIndex`. Postgres install with puzzles loaded would crash on first themed query.

### H4. CLI safety check doesn't distinguish missing-table from empty-table
Once C5 is fixed (migrations run first), `checkTargetEmpty` is fine. If keeping original order, it must tolerate missing tables (treat as empty).

### H5. Postgres driver — `transaction()` `clientDriver` is not a proper driver object
**File:** `drivers/postgres-driver.js:108-148`

The shim is fine functionally. But duplicates `adaptParams` calls and won't catch instanceof checks. Minor, but consider a private `_runOnConn(conn, sql, params)` helper used by both pool and transaction methods. DRY.

Also: if `BEGIN` itself throws, the `finally` releases the client correctly — good. But the `ROLLBACK` failure is swallowed silently; could log at debug level.

### H6. Hardcoded admin password committed to source (pre-existing, not introduced here)
**File:** `migrations/004_add_users_auth.js:12` — `DEFAULT_ADMIN_PASSWORD = 'SotaJapan@2026'`. Already in repo. Flagging because it's now baked into every PG install too. Make seeding skip if `SEED_ADMIN_PASSWORD` env not set, or force password change on first login.

---

## Medium-Priority Issues

### M1. `dialect.upsert` returns SQL with `?` placeholders for both dialects
Then param-adapter rewrites for PG. Works, but means the Postgres path always pays adapter cost on hot inserts. Not critical.

### M2. `DEFAULT CURRENT_TIMESTAMP` on TEXT columns
Migrations 002, 004, 007 use `TEXT DEFAULT CURRENT_TIMESTAMP`. SQLite returns `'YYYY-MM-DD HH:MM:SS'`; Postgres returns `'YYYY-MM-DD HH:MM:SS.ffffff+00'`. Format divergence — if any code parses these timestamps with strict regex, will break on PG. Repos always pass `new Date().toISOString()` explicitly so default is rarely used; OK in practice but flag.

### M3. `redactUrl` fallback regex
`url.replace(/:([^@]+)@/, ':***@')` — if URL has username with `@` it could mis-fire. Edge case, low risk. Always-prefer-URL-parse path is fine.

### M4. `progress-reporter.report` uses `\r` to overwrite stderr
Won't render properly when stderr is piped to a logfile (gives one giant line). Not a bug but worth a `--no-tty` flag or auto-detect `process.stderr.isTTY`.

### M5. `count-verifier` runs all PG counts concurrently with `Promise.all`
With max-pool=10 (postgres-driver.js:30) and ~13 tables, this is fine. If manifest grows beyond 10, last queries will queue — still correct, just not maximally parallel.

### M6. `assertCompleteness` only warns; mismatches silently skip data
**File:** `cli/table-manifest.js:105`. A new table added after manifest = silent data loss on migration. Consider `--strict` flag making it fatal, or default fatal with `--allow-skip`.

### M7. Migration 001 `CREATE INDEX` after a poisoned TX
After C2 fix this becomes moot. But note: even if ALTER were skipped cleanly, `CREATE INDEX IF NOT EXISTS` inside an aborted PG transaction would also fail.

### M8. `lastInsertId` always null on Postgres driver
**File:** `postgres-driver.js:89`. Comment says "use RETURNING in the SQL". Currently `PuzzleReportManager.reportPuzzle` (line 132-140) relies on `lastInsertRowid ?? lastInsertId` which is `null` on PG → returned `reportId = 0`. Affects API consumers. Need RETURNING-aware helper or explicit `runReturning(sql, params, returnCol)`.

---

## Low-Priority / Style

- `param-adapter.js` — `i++` in 4 places; could simplify with `for` loop. Cosmetic.
- `SqliteDatabase` class name no longer matches its purpose; rename deferred per phase 1 doc — fine, but file 234 lines now (over 200 line guideline).
- `migration-runner.js:67` uses `import(\`file://${file}\`)` — works on macOS/Linux; on Windows path needs `pathToFileURL`. If Windows is supported, fix.
- `database-config.js` — driver string is normalized but DATABASE_URL is not validated as a URL until pg connect. Optionally validate via `new URL()` early.
- `PostgresDriver.connect` allows pool size only via hardcoded `max: 10`. Expose via env (`PG_POOL_MAX`).

---

## Edge Cases Found by Scout

- **SQLite shim transaction** (C1) — only triggered by migration runner; tests don't cover it.
- **Empty target check** (C5) — only triggered on fresh PG; dev environments will all hit it.
- **Date.now() into INTEGER column** (C4) — every report/block operation in production after PG cutover.
- **TX poisoning on PG ADD COLUMN** (C2) — every fresh PG schema bootstrap.
- **getPuzzlesByIds sqlite path** (H3) — every themed puzzle query on PG.

---

## Positive Observations

- Driver abstraction is clean; factory + interface JSDoc is good.
- Manifest topological sort is correct and rejects cycles/missing deps.
- `param-adapter` correctly handles `''` escape (verified by reading state machine).
- `progress-reporter` keeps stdout clean for machine parsing — good separation.
- `DATABASE_URL` redaction helper exists and uses URL parser.
- CLI never logs row contents (verified).
- Async repos consistently use `await` (no fire-and-forget bugs found in grep).
- `getDialectForDb` works for both paths despite simple heuristic.
- Sequence reset SQL uses `pg_get_serial_sequence` + `GREATEST(..., 1)` — handles empty-table case correctly.
- ON CONFLICT DO NOTHING + idempotent count verify makes re-runs safe.

---

## Recommended Actions (priority order)

1. **C1** — rewrite `SqliteDatabase.transaction()` to use manual BEGIN/COMMIT/ROLLBACK (or delegate to a `SqliteDriver` instance).
2. **C2** — replace try/catch ALTER pattern with column-existence pre-check; affects 8 migrations.
3. **C3** — `await database.initAsync()` in `index.js` boot sequence.
4. **C4** — change `reported_at` / `modified_at` to BIGINT (PG) / INTEGER (sqlite) via dialect helper.
5. **C5** — run migrations before emptiness check in CLI.
6. **H3** — guard sqlite-only theme index methods against postgres path.
7. **M8** — RETURNING-aware insert helper for PG.
8. **H6** — add `SEED_ADMIN_PASSWORD` env override.
9. Add tests for: migration runner against both drivers, param-adapter edge cases, PG transaction rollback path.

---

## Unresolved Questions

- Are there integration tests against a live Postgres in CI? If not, none of these would be caught.
- Is the cutover plan one-shot (downtime) or live? Live cutover with sequence reset needs a different strategy.
- Phase 5 docs not reviewed in detail — does the runbook mention running migrations before the emptiness check is needed?
- Are there any in-flight queries written directly against `database.db` (the better-sqlite3 instance) that bypass the async wrapper? Need broader codebase scan.
- Has anyone actually run the CLI end-to-end against a fresh Postgres? Symptoms of C5/C2 would be immediate.
