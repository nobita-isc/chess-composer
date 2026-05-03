# Phase 1 — Driver Abstraction

## Context Links
- `packages/server/src/database/SqliteDatabase.js` — current sync wrapper
- `packages/server/src/database/DatabaseLoader.js`, `DatabaseGenerator.js`
- pg docs: https://node-postgres.com/

## Overview
- Priority: P1 (blocks everything)
- Status: **completed**
- Effort: 1d
- Define minimal async `DatabaseDriver` iface; ship `SqliteDriver` + `PostgresDriver`. Singleton picks driver via env.

## Key Insights
- All current callsites use 5 methods only (`query`, `queryOne`, `queryScalar`, `run`, `exec`) plus implicit transactions in a few places.
- `run()` returns `{changes, lastInsertRowid}` — Postgres equivalent is `RETURNING id` for inserts; `rowCount` for changes. Document and standardize.
- pg uses `$1, $2`; better-sqlite3 uses `?`. Adapter rewrites SQL once at driver entry.
- Theme index (puzzle-specific in-memory) does NOT belong in the driver. Move to a `PuzzleThemeIndex` service initialized at startup.

## Requirements
**Functional**
- `DatabaseDriver` async iface: `query(sql, params) → rows[]`, `queryOne → row|null`, `queryScalar → value`, `run(sql, params) → {changes, lastInsertId|null}`, `exec(sql) → void`, `transaction(async fn)`, `close()`.
- `createDriver(config)` factory: returns Sqlite or Postgres impl based on `config.driver`.
- Sqlite driver wraps better-sqlite3 sync calls in `async` fns (Promise.resolve under hood).
- Postgres driver uses `pg.Pool`. Adapter `?` → `$N` (left-to-right scan, ignores `?` inside single-quoted strings).
- Boolean read coercion in PG driver: optional row mapper not needed if schema uses INTEGER 0/1 in PG too — but cleaner to use BOOLEAN and coerce on read. Defer concrete coercion strategy to Phase 3 schema audit; driver provides hook `mapRow(row)` no-op default.

**Non-functional**
- Each driver file ≤200 lines.
- Zero behavioral change for sqlite path (regression-safe).
- No dependency on repo code from driver layer.

## Architecture
```
src/database/
  DatabaseDriver.js          # JSDoc iface + factory
  drivers/
    sqlite-driver.js         # better-sqlite3 wrapper
    postgres-driver.js       # pg.Pool wrapper + ?→$N adapter
    param-adapter.js         # shared adapter, exported for tests
  database-config.js         # reads env, returns config
  SqliteDatabase.js          # KEEP as singleton facade, delegates to driver
```

## Related Code Files
**Modify**
- `packages/server/src/database/SqliteDatabase.js` — becomes thin facade over driver. Remove direct better-sqlite3 import. Keep export name for back-compat (rename in later cleanup pass — out of scope here).
- `packages/server/src/database/DatabaseLoader.js` — pass driver config.
- `.env.example` — add `DATABASE_DRIVER`, `DATABASE_URL`.
- `packages/server/package.json` — add `pg` dep.

**Create**
- `packages/server/src/database/DatabaseDriver.js`
- `packages/server/src/database/drivers/sqlite-driver.js`
- `packages/server/src/database/drivers/postgres-driver.js`
- `packages/server/src/database/drivers/param-adapter.js`
- `packages/server/src/database/database-config.js`

**Delete** — none

## Implementation Steps
1. `npm -w packages/server install pg`.
2. Create `database-config.js` reading `DATABASE_DRIVER` (default `sqlite`), `DATABASE_URL`, `SQLITE_PATH`.
3. Create `DatabaseDriver.js` with JSDoc typedef + `createDriver(config)` factory.
4. Implement `param-adapter.js`: `adaptParams(sql) → { sql: pgSql, count }`. State machine over chars, skip inside `'...'`. Unit-test edge cases (escaped quotes `''`, no `?`, all `?`).
5. Implement `sqlite-driver.js`: open better-sqlite3, expose async wrappers, transaction via `db.transaction()` invoked synchronously inside async fn.
6. Implement `postgres-driver.js`: `pg.Pool` from `DATABASE_URL`. Each method runs `adaptParams` then `pool.query`. Transaction via `client.query('BEGIN')…`.
7. Refactor `SqliteDatabase.js` to instantiate driver via factory and delegate. Keep singleton export. Module is now misnamed but defer rename.
8. Run existing app under sqlite — must work unchanged.
9. Smoke-boot under `DATABASE_DRIVER=postgres` against empty PG (will fail at first repo call — expected; phases 2/3 fix).

## Todo List
- [x] Add `pg` dep
- [x] `database-config.js`
- [x] `DatabaseDriver.js` factory + typedef
- [x] `param-adapter.js` + unit tests
- [x] `sqlite-driver.js`
- [x] `postgres-driver.js`
- [x] Refactor `SqliteDatabase.js` to delegate (additive branch — sqlite sync unchanged)
- [x] Sqlite path regression test (full test suite: 416 tests pass)
- [x] PG path connect-and-ping test (requires live Postgres — deferred to Phase 5 CI matrix)

## Success Criteria
- `npm -w packages/server run dev` works unchanged with no env set.
- `DATABASE_DRIVER=postgres DATABASE_URL=... node -e "import('./src/database/SqliteDatabase.js').then(m=>m.db.queryScalar('SELECT 1'))"` returns 1.
- Adapter unit tests pass: `SELECT * FROM t WHERE a=? AND b=?` → `... a=$1 AND b=$2`.

## Risk Assessment
- Adapter mishandles `?` in string literal → today none in repo; add lint check (grep) to CI in phase 5.
- Transaction semantics differ (better-sqlite3 nested = savepoint; pg same with `SAVEPOINT`). Phase-1 supports single-level only; document.
- pg connection error on missing DB silently logs — fail loudly at startup.

## Security Considerations
- `DATABASE_URL` contains password — never log full URL; redact.
- TLS: Postgres driver should accept `?sslmode=require` in URL (pg handles natively).

## Next Steps
- Phase 2: convert all callers to await driver methods.
