# Phase 01 Infra Report — Playwright + jsdom + DB Clone

**Status:** complete
**Date:** 2026-05-03

## Deps Installed
- `@playwright/test@1.59.1`, `playwright@1.59.1` added to root devDependencies
- `jsdom` already present (`^29.0.2`) — no duplicate install needed
- Chromium binary: `npx playwright install chromium` — success

## Files Created
| File | Lines | Notes |
|------|-------|-------|
| `playwright.config.js` | 55 | chromium-only, dual webServer (api:3001 + client:3000) |
| `e2e/global-setup.js` | 40 | clones DB, seeds users, writes `.auth/state.json` |
| `e2e/global-teardown.js` | 25 | removes `puzzles-e2e.db*` + `e2e/.auth/` |
| `e2e/fixtures/auth-fixture.js` | 48 | extends test with `studentPage`/`adminPage` |
| `e2e/smoke.spec.js` | 12 | asserts title exists |
| `packages/server/test-utils/seed-test-db.js` | 57 | cp db+shm+wal idempotently |
| `packages/server/test-utils/sign-test-token.js` | 26 | `tokenFor()` using live JWT_SECRET |
| `packages/server/test-utils/seed-test-users.js` | 55 | INSERT OR IGNORE admin+student |
| `vitest.workspace.js` | 37 | node+jsdom projects (opt-in via `--workspace`) |

## Files Modified
- `package.json` (root): added `test:e2e`, `test:e2e:headed`, `test:e2e:install` scripts
- `.gitignore`: added `puzzles-e2e.db*`, `e2e/.auth/`, `playwright-report/`, `test-results/`

## Key Findings

**JWT key:** `chess_access_token` (from `packages/client/src/auth/AuthManager.js:8`)

**SQLITE_PATH flow:** `database-config.js` reads `process.env.SQLITE_PATH || null`, passed to `SqliteDatabase.initialize()` → `new Database(resolvedPath)`. Confirmed end-to-end.

**Port layout:** server=3001, client=3000 (vite). Playwright `baseURL` = `http://localhost:3000`, webServer array boots both.

**JWT secret location:** `packages/server/src/auth/AuthService.js:11` — `process.env.JWT_SECRET || 'chess-composer-dev-secret-change-in-production'`. `sign-test-token.js` mirrors this exactly (no import, avoids ESM circular dep).

**WAL files:** both `puzzles.db-shm` and `puzzles.db-wal` present in `packages/server/data/` — both copied in seed-test-db.js with existence checks.

**Vitest workspace:** created as opt-in (`npx vitest run --workspace`). Default `npm test` still uses `vitest.config.js` unmodified — no risk to existing 539 tests.

## Test Results

```
npm run test:e2e
  1 passed (3.4s)  ✓ chromium › smoke.spec.js › app loads and has a title

npm test
  28 test files passed
  539 tests passed
```

## Mtime Check
- `puzzles.db` mtime before: `May 2 21:52:17 2026`
- `puzzles.db` mtime after:  `May 2 21:52:17 2026` — UNCHANGED
- `puzzles-e2e.db*` after teardown: no files found — cleaned correctly

## Deviations from Phase Spec
- Files use `.js` not `.ts` — per prompt constraint ("Repo is JS/ESM; use .js for everything")
- `playwright.config.js` boots **both** webServers (client + server) — phase spec only mentioned server. Client at :3000 is needed for `baseURL` to serve the HTML app under test.
- `vitest.workspace.js` is opt-in only (run with `--workspace`). Default `npm test` unchanged to avoid breaking existing test infrastructure. Phase 2 authors should note: jsdom tests can either use `--workspace` or add `// @vitest-environment jsdom` docblock.
- `sign-test-token.js` does NOT import `AuthService.js` directly (avoids ESM import of server deps in a utility). Instead mirrors the same env-var pattern. Same drift protection — both read same `JWT_SECRET` env var.

## Blockers for Phases 2/3/4
None. All helpers are importable from e2e specs:
- `../packages/server/test-utils/seed-test-db.js` — `{ CLONE_DB }`
- `../packages/server/test-utils/sign-test-token.js` — `{ tokenFor }`
- `../packages/server/test-utils/seed-test-users.js` — `{ TEST_ADMIN, TEST_STUDENT }`
- `./fixtures/auth-fixture.js` — `{ test, expect }` with `studentPage`/`adminPage`
