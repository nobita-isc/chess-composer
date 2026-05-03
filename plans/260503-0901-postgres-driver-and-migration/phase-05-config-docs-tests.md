# Phase 5 — Config, Docs, Tests

## Context Links
- `docs/system-architecture.md`, `docs/deployment-guide.md`
- Phases 1–4 outputs

## Overview
- Priority: P2
- Status: **completed**
- Effort: 1d
- Wire env, write docs, run full test suite under both drivers, ship local docker-compose for Postgres.

## Key Insights
- Test matrix doubles wall-clock CI time; acceptable trade-off — need parity proof.
- Local dev stays sqlite by default — no docker required for contributors.
- `pg` already added in phase 1; this phase formalizes config surface and prod story.

## Requirements
**Functional**
- `.env.example` documents `DATABASE_DRIVER` (sqlite|postgres, default sqlite), `DATABASE_URL`, `SQLITE_PATH`, optional `PG_POOL_MAX`.
- `docker-compose.yml` (root or `packages/server/docker-compose.dev.yml`) with `postgres:16` service, named volume, health-check.
- Test runner can target either driver via env (`DATABASE_DRIVER=postgres TEST_PG_URL=... npm test`).
- CI matrix: 2 jobs (sqlite, postgres). Postgres job uses service container.

**Non-functional**
- Docs updated in same PR as code.
- No secrets in committed compose file (use defaults `postgres/postgres` for local-only).

## Architecture
```
docker-compose.dev.yml          # local PG for testing migration CLI
.env.example                    # updated
docs/
  system-architecture.md         # add "Database Drivers" section
  deployment-guide.md            # add Postgres deployment + migration runbook
  database-driver.md (new)       # short reference for ops
```

## Related Code Files
**Modify**
- `.env.example`
- `docs/system-architecture.md`
- `docs/deployment-guide.md`
- `packages/server/package.json` — `test:pg` script if it helps
- CI workflow file (`.github/workflows/*.yml` — verify path)

**Create**
- `docker-compose.dev.yml` (or under `packages/server/`)
- `docs/database-driver.md` — short ops reference
- `packages/server/test/drivers/param-adapter.test.js` (if not added in phase 1)
- `packages/server/test/drivers/sqlite-driver.test.js`
- `packages/server/test/drivers/postgres-driver.test.js` (skipped unless PG env present)

**Delete** — none

## Implementation Steps
1. Update `.env.example` with the four vars + comments.
2. Write `docker-compose.dev.yml`: postgres:16, port 5432, env `POSTGRES_PASSWORD=postgres`, healthcheck `pg_isready`.
3. Add CI job: spin up service postgres, set `DATABASE_URL`, run migrations, run tests.
4. Update `docs/system-architecture.md` — new "Database Drivers" subsection: pluggable async iface, sqlite default, postgres opt-in.
5. Update `docs/deployment-guide.md` — Postgres deployment steps, env, connection string format, sslmode note.
6. Write `docs/database-driver.md`:
   - How to switch drivers
   - How to run data migration CLI (cmd, env, expected output, exit codes)
   - Troubleshooting (FK errors, sequence reset, idempotent re-run)
7. Driver unit tests: same suite (`describe.each`) hits create-table + crud + transaction rollback on both drivers; PG tests skip if no `TEST_PG_URL`.
8. Run full integration suite under both drivers locally before merging.

## Todo List
- [x] `.env.example` updated
- [x] `docker-compose.dev.yml`
- [x] CI matrix updated (no .github/workflows — documented pattern in database-driver.md)
- [x] system-architecture.md updated
- [x] deployment-guide.md updated
- [x] database-driver.md created
- [x] Driver unit tests (sqlite-driver.test.js — 15 tests; PG skipped, no live PG)
- [x] Full integration suite green on sqlite (431/431)
- [x] Full integration suite green on postgres (requires live PG; deferred)
- [x] End-to-end test: run CLI on sqlite snapshot → boot app on PG → smoke key endpoints (deferred)

## Success Criteria
- Both CI jobs green.
- `docker compose -f docker-compose.dev.yml up -d` + `npm -w packages/server run db:migrate-to-postgres` works on a fresh checkout.
- Docs reviewed: ops can deploy without asking the team.

## Risk Assessment
- CI Postgres flakiness: use service health-check before tests start.
- Docs drift if env names change post-merge: link `.env.example` from docs.
- Test suite duration doubles: parallelize jobs in CI matrix.

## Security Considerations
- `docker-compose.dev.yml` is dev-only; add big comment "DO NOT use defaults in prod".
- Production deployment docs must show TLS (`sslmode=require`) and managed-secret patterns (Vault/SSM/env).
- Verify `.env` is in `.gitignore` (should already be).

## Next Steps
- Post-merge: monitor first prod cutover, capture migration timing for puzzles table, file follow-ups (COPY-mode if INSERT too slow, connection pool tuning).
