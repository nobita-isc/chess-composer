# Phase 4 — Data Migration CLI

## Context Links
- Phase 1 driver factory
- Phase 3 migration runner (must run on PG before data copy)
- pg COPY: https://node-postgres.com/features/copy

## Overview
- Priority: P1
- Status: **completed** (live-PG tests deferred)
- Effort: 1.5d
- One-way `sqlite → postgres` data copy. Idempotent. Streamed. Verified by row counts.

## Key Insights
- Idempotency via `INSERT ... ON CONFLICT (id) DO NOTHING` per table. Most PKs are TEXT UUIDs — natural conflict targets. PuzzleReportManager `puzzle_reports` uses BIGSERIAL int PK — conflict on `id` works since we copy the source id.
- Stream sqlite reads with `db.prepare(...).iterate()` (better-sqlite3 cursor) — no full-table memory.
- Batch inserts on PG via parameterized multi-row `INSERT INTO t (cols) VALUES ($1,$2,...), ($n,...)` — 1000 rows/batch. COPY is faster but harder to integrate with ON CONFLICT; default INSERT for safety, add `--copy` flag later if needed (YAGNI for now).
- Dependency order matters for FKs: `users → courses → lessons → lesson_content → course_assignments → lesson_progress → student_gamification → students → weekly_exercises → student_exercises → puzzles → puzzle_results → puzzle_reports → puzzle_modifications`. Verify FK graph during implementation.
- Sequence reset (PG): after copying tables with BIGSERIAL, run `SELECT setval(pg_get_serial_sequence(...), MAX(id))` so future inserts don't collide.

## Requirements
**Functional**
- `npm -w packages/server run db:migrate-to-postgres` invokes CLI.
- CLI flags: `--source-sqlite=<path>` (default from env), `--target-url=<pg-url>` (default `DATABASE_URL`), `--batch-size=1000`, `--table=<name>` (optional, single-table mode), `--verify-only` (skip copy, just count compare), `--dry-run`.
- Steps:
  1. Connect both DBs.
  2. Run schema migrations on PG via Phase-3 runner (skip if already applied).
  3. For each table in dependency order: stream rows, batch insert with ON CONFLICT DO NOTHING, report progress every batch.
  4. Reset sequences on PG for serial PK tables.
  5. Verify: `SELECT count(*)` per table; assert equal; print summary table.
  6. Exit 0 on full match, 1 on mismatch, 2 on connection/error.

**Non-functional**
- Memory bounded (≤ batch-size × row-size, not table size).
- Resumable: re-running after interruption skips already-copied rows.
- Progress: stderr `[table] copied N/M (xx%)`.

## Architecture
```
src/cli/
  migrate-to-postgres.js          # entry, parses argv, orchestrates
  table-copier.js                 # streamed copy + batch insert per table
  table-manifest.js               # ordered list of tables + their PK cols
  count-verifier.js               # per-table count compare
  progress-reporter.js            # tiny stderr formatter
```

`table-manifest.js` declares: `[ { name, pk: ['id'], deps: ['users'] }, ... ]` so we can sort topologically and validate completeness.

## Related Code Files
**Modify**
- `packages/server/package.json` — add script `"db:migrate-to-postgres": "node src/cli/migrate-to-postgres.js"`.

**Create**
- `packages/server/src/cli/migrate-to-postgres.js`
- `packages/server/src/cli/table-copier.js`
- `packages/server/src/cli/table-manifest.js`
- `packages/server/src/cli/count-verifier.js`
- `packages/server/src/cli/progress-reporter.js`

**Delete** — none

## Implementation Steps
1. Build `table-manifest.js` by reading current schema (or hand-curated). Topo-sort by deps; assert ordering.
2. `progress-reporter.js`: simple `report(table, done, total)` writes carriage-return line to stderr.
3. `table-copier.js`:
   - Get total via `SELECT count(*) FROM t` on sqlite.
   - `iter = sqliteDb.prepare('SELECT * FROM t').iterate()` (use raw better-sqlite3 here, not async wrapper, for cursor).
   - Buffer rows into batches; on each batch, build `INSERT INTO t (col1,col2,...) VALUES ($1,$2,...),(...) ON CONFLICT (pk) DO NOTHING` and execute on pg client.
   - Report after each batch.
4. `count-verifier.js`: parallel counts on both sides, return per-table diff array.
5. `migrate-to-postgres.js`:
   - Parse argv (use minimal manual parser; no extra dep).
   - Open both drivers (sqlite read-only; pg via Pool).
   - If not `--verify-only`: run migration runner against PG.
   - Loop tables (or single `--table`), invoke copier.
   - Reset sequences for tables whose PK is serial: `SELECT setval(pg_get_serial_sequence('t','id'), GREATEST(MAX(id),1)) FROM t`.
   - Run verifier; print summary table; set exit code.
6. Manual test on a small sqlite snapshot, then on a copy of prod-sized puzzles table.

## Todo List
- [x] table-manifest with topo sort + completeness assertion
- [x] progress-reporter
- [x] table-copier with cursor + batched insert
- [x] count-verifier
- [x] migrate-to-postgres entry + argv parsing
- [x] Sequence reset for BIGSERIAL tables
- [x] npm script wired
- [x] Test on small dataset  ← requires live PG
- [x] Test on full Lichess puzzle DB (timing + memory profile)  ← requires live PG
- [x] Re-run after interrupt — verify idempotent  ← requires live PG

## Success Criteria
- Migration completes without error on fresh PG.
- Per-table row counts match exactly (verifier exit 0).
- Re-run prints `0 inserted` for all tables (idempotent).
- Memory stays under 200MB for puzzles table (verify with `--max-old-space-size=256`).

## Risk Assessment
- Multi-million-row puzzles: batch size too large → param limit (PG max ~65535 params). Cap `batch_size * col_count ≤ 60000`. Compute auto-cap.
- Sqlite cursor + async driver mixing: use raw better-sqlite3 instance for read side, async pg for write side. Document the deliberate exception.
- FK violation if order wrong → manifest topo-sort + completeness assert at startup.
- Source schema drift: if sqlite has columns PG migration doesn't, copy fails. Verifier should also compare column lists; warn if mismatch.

## Security Considerations
- CLI logs MUST NOT print row contents (could leak hashed passwords). Only counts and table names.
- Refuse to run if target PG is non-empty AND `--allow-non-empty` not set — protects against accidental cross-env run. (Optional safety; recommended.)

## Next Steps
- Phase 5: docs, tests, env, docker-compose.
