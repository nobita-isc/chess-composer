# Phase 01 — Test Infra Setup (Playwright + jsdom + DB clone)

## Context Links
- Server entry: `packages/server/src/index.js` (honors `SQLITE_PATH`)
- Auth service: `packages/server/src/auth/AuthService.js` (JWT_SECRET default `chess-composer-dev-secret-change-in-production`)
- DB: `packages/server/data/puzzles.db` (437MB) + `puzzles.db-shm`, `puzzles.db-wal`
- Plan: `./plan.md`

## Overview
- **Priority:** P1 (blocks all automation phases)
- **Status:** completed
- **Effort:** 5h
- **Description:** Bootstrap Playwright (Chromium only), jsdom for unit tests, sqlite clone helper, JWT signing helper, global setup/teardown, npm scripts, smoke spec.

## Key Insights
- Repo uses Vitest at root + workspace level. No browser test infra exists.
- Server already accepts `SQLITE_PATH` env (Postgres migration phase 5).
- Auth tokens signed with `jsonwebtoken`; importing `AuthService.js` directly avoids drift if signing logic changes.
- 437MB DB clone — fast on SSD; must include `-shm`/`-wal` files for WAL-mode consistency.

## Requirements
**Functional**
- `npm run test:e2e` from repo root runs Playwright suite headless on Chromium.
- `npm run test:e2e:headed` for debug.
- Global setup clones DB + boots dev server with `SQLITE_PATH=...puzzles-e2e.db`.
- Global teardown removes cloned DB files.
- JWT helper produces tokens accepted by server `authMiddleware`.
- Vitest jsdom env available for unit tests on DOM widgets.

**Non-functional**
- Cold setup ≤10s. No port collisions in CI (random port + Playwright `webServer`).
- Helpers ≤200 lines each.

## Architecture
```
repo-root/
├─ playwright.config.ts          # chromium-only, webServer auto-launches
├─ e2e/
│  ├─ global-setup.ts            # clone DB, seed users, sign tokens, expose paths
│  ├─ global-teardown.ts         # rm puzzles-e2e.db*
│  ├─ fixtures/
│  │  └─ auth.ts                 # Playwright fixture: storageState w/ JWT
│  └─ smoke.spec.ts              # loads /, asserts title
├─ vitest.workspace.js           # adds jsdom env for client/tests/**
└─ packages/server/test-utils/
   ├─ seed-test-db.js            # cp puzzles.db{,-shm,-wal} → puzzles-e2e.db*
   ├─ sign-test-token.js         # tokenFor({ id, role, email })
   └─ seed-test-users.js         # ensures admin + student exist in cloned DB
```

Server boots via Playwright `webServer` config: `SQLITE_PATH=...puzzles-e2e.db npm --workspace packages/server run dev`.

## Related Code Files
**Modify**
- `package.json` (root): add devDeps `@playwright/test`, `playwright`, `jsdom`; scripts `test:e2e`, `test:e2e:headed`, `test:e2e:install`.
- `vitest.config.*` or new `vitest.workspace.js` (if missing).

**Create**
- `playwright.config.ts`
- `e2e/global-setup.ts`
- `e2e/global-teardown.ts`
- `e2e/fixtures/auth.ts`
- `e2e/smoke.spec.ts`
- `packages/server/test-utils/seed-test-db.js`
- `packages/server/test-utils/sign-test-token.js`
- `packages/server/test-utils/seed-test-users.js`
- `vitest.workspace.js` (only if not present)

**Delete:** none

## Implementation Steps
1. Add devDeps: `npm i -D -w . @playwright/test playwright jsdom` then `npx playwright install chromium`.
2. Confirm `SQLITE_PATH` env actually flows into server's better-sqlite3 init; grep `packages/server/src` to verify.
3. Grep client for JWT localStorage key (`localStorage.setItem('...', token)`); record exact key for fixture.
4. Write `seed-test-db.js`: copy `puzzles.db`, `puzzles.db-shm`, `puzzles.db-wal` to `puzzles-e2e.db*` paths via `fs.copyFileSync`. Idempotent (rm first).
5. Write `sign-test-token.js`: import `AuthService` (or fall back to inline `jwt.sign`) — export `tokenFor({ id, role, email })`.
6. Write `seed-test-users.js`: open cloned DB w/ better-sqlite3, INSERT OR IGNORE one admin + one student via existing `users` table schema; return `{ adminId, studentId }`.
7. Write `playwright.config.ts`: `testDir: 'e2e'`, projects=`[{name:'chromium', use: devices['Desktop Chrome']}]`, `webServer: { command: 'npm --workspace packages/server run dev', port: 3001, env: { SQLITE_PATH: '<abs path to puzzles-e2e.db>', NODE_ENV: 'test' }, reuseExistingServer: !process.env.CI }`, `globalSetup`, `globalTeardown`.
8. Write `global-setup.ts`: call seed helpers, write tokens to `e2e/.auth/state.json` (storageState format), expose IDs via `process.env.E2E_*`.
9. Write `global-teardown.ts`: rm `puzzles-e2e.db*` and `e2e/.auth/`.
10. Write `fixtures/auth.ts`: extends `test` with `studentPage` / `adminPage` that call `addInitScript` to localStorage-set token before any nav.
11. Write `smoke.spec.ts`: `test('app loads', async ({ page }) => { await page.goto('/'); await expect(page).toHaveTitle(/.+/); })`.
12. Add `vitest.workspace.js` if absent — define two projects: `node` (default) and `jsdom` (matches `packages/client/tests/**`).
13. Run `npm run test:e2e` — smoke must pass; `npm test` — vitest still green.

## Todo List
- [x] Install Playwright + jsdom; chromium browser binary
- [x] Verify `SQLITE_PATH` honored end-to-end
- [x] Confirm JWT localStorage key from client source
- [x] `seed-test-db.js` works with WAL files
- [x] `sign-test-token.js` produces token accepted by `authMiddleware`
- [x] `seed-test-users.js` idempotent
- [x] `playwright.config.js` boots server with cloned DB
- [x] Global setup/teardown leave no artifacts
- [x] `auth-fixture.js` injects token before first page load
- [x] Smoke spec green
- [x] Vitest jsdom workspace project added
- [x] Root scripts: `test:e2e`, `test:e2e:headed`

## Success Criteria
- `npm run test:e2e` exits 0 with smoke spec passing.
- `puzzles-e2e.db*` exists during test run, removed after.
- `puzzles.db` mtime unchanged after run (verify with `stat`).
- JWT helper-issued token verified by `authMiddleware` against `/api/me`-style route.

## Risk Assessment
- **DB cp slow on cold disk** — 437MB; mitigate by cloning once per suite, not per-test.
- **Port collision** — random port via `process.env.PORT`; Playwright `webServer.port` matches.
- **WAL file desync** — close any open handles before copy; if dev server holds it, copy before server boot (global-setup runs first).
- **JWT secret drift** — import live `AuthService` rather than hardcoding.

## Security Considerations
- Default JWT secret is dev-only; document that test mode uses same dev secret. Never commit `puzzles-e2e.db`.
- Add `puzzles-e2e.db*` and `e2e/.auth/` to `.gitignore`.

## Next Steps
- Phase 2 (jsdom unit tests on board widget) and Phases 3/4 (Playwright e2e) unblocked.
