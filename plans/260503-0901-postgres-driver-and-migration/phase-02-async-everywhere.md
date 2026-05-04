# Phase 2 — Async-Everywhere Conversion

## Context Links
- Phase 1 driver iface (all methods async)
- Repos: `students/`, `exercises/`, `puzzles/`, `users/`, `lessons/`, `reports/PuzzleReportManager.js`
- `database/DatabaseLoader.js`, `database/DatabaseGenerator.js`

## Overview
- Priority: P1
- Status: **completed**
- Effort: 1.5d
- Mechanical conversion: every `db.X(...)` callsite gets `await`; enclosing methods become `async`. Routes already async.

## Key Insights
- Hono handlers are async — only repo calls and helpers need `await`.
- DatabaseGenerator runs offline (Lichess import). Sync vs async cost negligible; convert too.
- Theme index build at startup: must be awaited before server starts listening.
- Code paths returning `lastInsertRowid` post-INSERT: switch to `RETURNING id` (works on both drivers, eliminates dialect divergence).

## Requirements
**Functional**
- All repo methods return Promises.
- All callers `await`.
- App boot order: open driver → run migrations → build theme index → start server.

**Non-functional**
- No new ESLint warnings (unhandled promise rejection).
- No silent swallowing of errors during conversion.

## Architecture
No new modules. Pure refactor. Keep file structure.

## Related Code Files
**Modify** (all repos and services using db API)
- `packages/server/src/students/StudentRepository.js`
- `packages/server/src/exercises/ExerciseRepository.js`
- `packages/server/src/puzzles/PuzzleRepository.js`
- `packages/server/src/puzzles/ThemeAnalyticsService.js`
- `packages/server/src/users/UserRepository.js`
- `packages/server/src/lessons/CourseRepository.js` (and any sibling repos in `lessons/`)
- `packages/server/src/reports/PuzzleReportManager.js`
- `packages/server/src/database/DatabaseLoader.js`
- `packages/server/src/database/DatabaseGenerator.js`
- `packages/server/src/index.js` — await migrations + theme index before `serve()`
- All route files in `packages/server/src/routes/` calling repos — add missing `await`s
- Middleware in `packages/server/src/middleware/` if it touches DB

**Create**
- `packages/server/src/puzzles/puzzle-theme-index.js` — extract theme index build out of SqliteDatabase if it lives there; expose `await build(db)` and `query(theme, rating)` sync getter (in-memory).

**Delete** — none

## Implementation Steps
1. Grep all callsites: `rg "db\.(query|queryOne|queryScalar|run|exec)\b" packages/server/src` — produce checklist.
2. Convert one repo at a time. After each repo: run app + repo's tests (or smoke an endpoint).
3. Order (low→high coupling): UserRepository → StudentRepository → ExerciseRepository → CourseRepository → ThemeAnalyticsService → PuzzleReportManager → PuzzleRepository → DatabaseGenerator → DatabaseLoader.
4. Standardize INSERTs needing new id on `RETURNING id`. Update return shape consumers (route handlers).
5. Move theme index build into `puzzle-theme-index.js`. `index.js` awaits `themeIndex.build(db)` before `serve()`.
6. Audit for fire-and-forget: any `db.run(...)` not awaited.
7. Run full app under sqlite — must remain functional.

## Todo List
- [x] Inventory grep checklist
- [x] Convert UserRepository + tests
- [x] Convert StudentRepository + tests
- [x] Convert ExerciseRepository + tests
- [x] Convert CourseRepository + lesson repos + tests
- [x] Convert ThemeAnalyticsService
- [x] Convert PuzzleReportManager (own table)
- [x] Convert PuzzleRepository
- [x] Convert DatabaseGenerator + DatabaseLoader
- [x] Extract puzzle-theme-index.js
- [x] Update boot order in index.js
- [x] Sweep routes/middleware for missing `await`
- [x] Replace `lastInsertRowid` consumers with `RETURNING id`
- [x] Full smoke under sqlite

## Success Criteria
- `npm -w packages/server test` (existing suite) passes under sqlite.
- Manual smoke: lessons CRUD, puzzle solve, exercise assign, user register/login.
- No `UnhandledPromiseRejection` warnings on boot.

## Risk Assessment
- Missed `await` → silent bug (route returns before write). Mitigation: ESLint `no-floating-promises` rule (one-time pass).
- Theme index race: requests served before build. Mitigation: await before `serve()`.
- DatabaseGenerator long-running sync transaction now async — ensure single transaction wraps batch insert (driver `transaction()` API).

## Security Considerations
- None new. Watch for log statements that may now log Promise objects instead of values.

## Next Steps
- Phase 3: schema portability so PG can actually run migrations.
