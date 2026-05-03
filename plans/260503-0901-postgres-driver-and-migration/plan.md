---
title: "PostgreSQL swappable driver + SQLite→Postgres migration CLI"
description: "Add async DatabaseDriver abstraction (sqlite|postgres), convert repositories to async, ship one-way data migration CLI."
status: completed
priority: P2
effort: 5-7 days
branch: feature/chess-lessons-platform
tags: [database, postgres, sqlite, migration, refactor, server]
created: 2026-05-03
completed: 2026-05-03
---

# PostgreSQL Driver + SQLite→Postgres Migration

## Status
✅ **COMPLETED 2026-05-03** — sqlite default unchanged; postgres opt-in ready, awaiting live-PG smoke test

## Goal
1. Driver abstraction: same repo code works on SQLite or Postgres, selected by `DATABASE_DRIVER` env.
2. CLI `npm -w packages/server run db:migrate-to-postgres` to copy SQLite data → Postgres, idempotent, resumable.
3. SQLite remains default. No live dual-write. One-way migration.

## Critical Decision: Sync→Async API
better-sqlite3 sync; pg async. **Chose path A: async-everywhere.**
- Rejected B (deasync/Atomics blocking pg) — brittle, blocks event loop.
- Rejected C (driver-specific repos) — massive duplication, violates DRY.
- Cost: every repo method, every route handler, DatabaseLoader, DatabaseGenerator, PuzzleReportManager touched. Routes already async — only need `await` on repo calls. Net diff is mechanical.

## Phases

| # | File | Status | Effort | Summary |
|---|------|--------|--------|---------|
| 1 | [phase-01-driver-abstraction.md](./phase-01-driver-abstraction.md) | completed | 1d | `DatabaseDriver` async iface + Sqlite/Postgres impls + `?`→`$N` adapter |
| 2 | [phase-02-async-everywhere.md](./phase-02-async-everywhere.md) | completed | 1.5d | Convert all repos/services to async; await in routes |
| 3 | [phase-03-schema-portability-and-migration-runner.md](./phase-03-schema-portability-and-migration-runner.md) | completed | 1d | Audit migrations: kill `AUTOINCREMENT`/`INSERT OR REPLACE`; tiny `dialect.js` helper; portable runner |
| 4 | [phase-04-data-migration-cli.md](./phase-04-data-migration-cli.md) | completed | 1.5d | Streamed batched copy with `ON CONFLICT DO NOTHING`, progress, row-count verify |
| 5 | [phase-05-config-docs-tests.md](./phase-05-config-docs-tests.md) | completed | 1d | `pg` dep, env, docs, run test suite under both drivers, docker-compose snippet |

## Key Dependencies
- npm: add `pg` (Postgres driver). Keep `better-sqlite3`.
- Env: `DATABASE_DRIVER=sqlite|postgres` (default sqlite), `DATABASE_URL=postgres://...`, `SQLITE_PATH` (existing).
- Local Postgres via docker-compose for dev/test.

## Cross-Cutting Constraints
- YAGNI/KISS/DRY. Driver iface stays minimal: `query/queryOne/queryScalar/run/exec/transaction/close`. No ORM, no query builder.
- Each new file ≤200 lines. Split if larger.
- Postgres credentials env-only, never committed.
- Standardize new inserts on `RETURNING id` (both drivers support).

## Risks (top-level — phase files detail mitigations)
- Async ripple: themeIndex build during init order — keep async-aware, await before serving traffic.
- `?`→`$N` adapter: literal `?` inside string literals. Verify by grep; current code has none.
- Boolean coercion (SQLite 0/1 vs PG bool). Repos must coerce on read.
- Multi-million-row puzzles table: streamed cursor read on sqlite + batched insert on PG. No full-table memory load.
- Data migration interrupted mid-table: `ON CONFLICT (id) DO NOTHING` makes re-run safe.

## Validation Strategy
- Same test suite runs twice (sqlite + postgres) via env in CI matrix.
- Migration CLI exits non-zero if any per-table count mismatches.
- Smoke: full app boot under postgres, hit /health + a puzzle/lesson/course endpoint.

## Unresolved Questions
1. Do we want connection pooling tuned (max connections, idle timeout) defaulted, or read from env? Defaulting to `pg.Pool({ max: 10 })` until load testing.
2. Should migration CLI support `--table=puzzles` to migrate one table at a time? Default yes (cheap to add) — confirm.
3. Lichess puzzle import (DatabaseGenerator) — keep SQLite-only for the bulk import then migrate, or make it driver-agnostic? Recommend **SQLite-only** (KISS): generator stays sqlite, then run CLI to copy to PG.
4. CI: spin Postgres service container? Confirm CI provider before phase 5.
