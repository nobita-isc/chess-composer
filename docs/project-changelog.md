# Project Changelog

All notable changes to Chess Composer are documented here.

## Format

This changelog follows [Keep a Changelog](https://keepachangelog.com/) conventions.

## Unreleased

## [2026-05-03] — Playwright E2E Tests + Board Widget Unit Tests

### Added
- **E2E test infrastructure**: Playwright (Chromium) with root config, Headless + headed modes
- **E2E test suites**: `e2e/puzzle-solving.spec.js` (13 specs, 11 pass, 3 skipped), `e2e/puzzle-play.spec.js` (10 specs, 9 pass, 1 skipped), `e2e/smoke.spec.js` (smoke tests)
- **E2E helpers**: `e2e/helpers/{board-actions,api-assertions,seed-exercise,seed-lesson}.js` for reusable test patterns
- **E2E fixtures**: `e2e/fixtures/auth-fixture.js` with token-based login
- **DB clone helper**: `packages/server/test-utils/seed-test-db.js` using `VACUUM INTO` for WAL-safe SQLite clone (puzzles-e2e.db isolated database)
- **JWT signing helper**: `packages/server/test-utils/sign-test-token.js` for test token generation
- **User seeding helper**: `packages/server/test-utils/seed-test-users.js` for test user setup
- **Vitest workspace**: `vitest.workspace.js` with jsdom project for client DOM tests (opt-in)
- **Board widget unit tests**: `packages/client/tests/interactive-puzzle-board.test.js`, `chess-puzzle-utils.test.js`, `helpers/make-board.js` (62 tests, 95% coverage on widget)
- **Root test scripts**: `test:e2e`, `test:e2e:headed`, `test:e2e:install`

### Technical Details
- E2E isolation: All tests use `puzzles-e2e.db` (WAL-safe clone via `VACUUM INTO`)
- Auth bypass: Token injection via `chess_access_token` localStorage key
- Board widget: 95% coverage on interactive board interactions and move validation

---

## [2026-05-03] — Postgres Driver + SQLite→Postgres Migration CLI

### Added
- **Pluggable DatabaseDriver interface**: `SqliteDriver` and `PostgresDriver` share a common async API (`query`, `queryOne`, `queryScalar`, `run`, `exec`, `transaction`, `close`)
- **PostgresDriver** (`pg.Pool`): async-native, converts `?` placeholders to `$N` via `param-adapter.js`, BEGIN/COMMIT/ROLLBACK transaction support
- **SqliteDriver**: wraps `better-sqlite3` synchronous API in Promises for interface parity
- **`database-config.js`**: reads `DATABASE_DRIVER` env var, instantiates and connects correct driver at startup
- **Migration CLI** (`npm -w packages/server run db:migrate-to-postgres`): one-way SQLite→Postgres data copy — batched inserts, FK-ordered tables, sequence reset, count verification
- **CLI flags**: `--dry-run`, `--verify-only`, `--allow-non-empty`, `--table=<name>`, `--batch-size=<n>`
- **`docker-compose.dev.yml`**: local Postgres 16-alpine with healthcheck for dev/testing
- **`docs/database-driver.md`**: driver switching, CLI reference, troubleshooting, production guide

### Changed
- `.env.example`: expanded with `DATABASE_DRIVER`, `SQLITE_PATH`, `DATABASE_URL`, `PG_POOL_MAX` entries and comments
- `docs/system-architecture.md`: added "Database Drivers" subsection with interface diagram and env var table
- `docs/deployment-guide.md`: added Postgres deployment section with migration runbook and production checklist

### Technical Details
- `pg` package added to `packages/server` dependencies
- `param-adapter.js`: stateful parser correctly skips `?` inside single-quoted SQL strings
- Migration CLI exit codes: 0 = success, 1 = count mismatch, 2 = fatal

---

## [2026-05-03] — Course Management UX Overhaul (3-Pane Workspace)

### Added
- **3-pane workspace UI**: Admin course management rewritten as Courses | Lessons | Editor with resizable splitters
- **Breadcrumb navigation**: Context-aware breadcrumb showing course → lesson → content path
- **Inline lesson metadata editor**: Debounced auto-save for lesson title + description
- **Inline content list editor**: Edit-in-place for all content items (video/PDF/quiz/puzzle)
- **Editable video URLs**: Video URL field now editable (was previously immutable)
- **Selection persistence**: URL hash + localStorage state management; scroll position restored after puzzle composer round-trips
- **Pane splitter utility**: Extracted to `shared/pane-splitter.js` for reuse across lesson player
- **Debounce utility**: `shared/debounce.js` for input debouncing patterns
- **Selection store**: `shared/selection-store.js` for managing course/lesson/content selection state

### Changed
- `CourseManagementPage.js`: Refactored from modal-based flow to 3-pane workspace
- `lesson-player.js`: Now uses shared `pane-splitter.js` component
- Admin course UI: Eliminated stacked modals in favor of single-page workspace
- Lesson content editing: All edits in-place instead of modal dialogs

### New Files
- `course-list-pane.js` — Courses sidebar panel
- `lesson-list-pane.js` — Lessons sidebar panel
- `lesson-editor-pane.js` — Main content editor pane
- `course-mgmt-breadcrumb.js` — Breadcrumb navigation component
- `course-mgmt-dialogs.js` — Remaining modal dialogs (create course/lesson)
- `lesson-meta-editor.js` — Inline lesson title + description editor
- `lesson-content-list.js` — Editable content items list
- `content-item-{video,pdf,quiz,puzzle}.js` — Per-type inline editors
- `lesson-content-upload-dialog.js` — File upload dialog
- `shared/pane-splitter.js` — Resizable pane divider utility
- `shared/debounce.js` — Debounce function for auto-save
- `shared/selection-store.js` — State persistence (URL + localStorage)

### Deleted
- `lesson-content-editor.js` — Functionality refactored into pane-based editors

### Server Changes
- `lesson-content` PUT endpoint: Now validates `video_url` (http/https only via URL constructor)

### Technical Details
- **Selection state**: URL hash `#/courses/X/lessons/Y` + localStorage backup
- **Debouncing**: 500ms delay on lesson metadata changes before auto-save
- **Splitter behavior**: Drag to resize panes, persist widths in localStorage
- **Scroll restoration**: Tracked separately per content item

### Fixed
- Video URL immutability issue — URLs now editable like all other fields
- Puzzle composer navigation — back button now restores previous pane state

### Security
- Video URL validation: reject non-http/https schemes

### Files Modified
- CourseManagementPage.js (refactored ~400→600 LOC as coordinator)
- lesson-player.js (uses pane-splitter, ~320 LOC)
- CourseRepository.js (no schema changes)

### Files Added: 12
- course-list-pane.js, lesson-list-pane.js, lesson-editor-pane.js
- course-mgmt-breadcrumb.js, course-mgmt-dialogs.js
- lesson-meta-editor.js, lesson-content-list.js
- content-item-video.js, content-item-pdf.js, content-item-quiz.js, content-item-puzzle.js
- lesson-content-upload-dialog.js
- shared/pane-splitter.js, shared/debounce.js, shared/selection-store.js

---

## [2026-04-12] — Rich Content Descriptions & Learning Materials

### Added
- **Markdown editor component** (`markdown-editor.js`): split-pane editor with live preview, toolbar buttons (bold, italic, headers, lists, links)
- **Lesson content descriptions**: new `description` TEXT column on lesson_content table (migration 011)
- **Admin description editing**: upload dialogs and edit dialogs now include markdown editor for content descriptions
- **Puzzle composer description field**: coaches can add long-form descriptions to puzzles alongside instructions
- **Student description viewing**: lesson player renders markdown descriptions with proper typography and styling
- **Collapsible description panel**: long descriptions auto-collapse (<300 chars expand by default)
- **Sidebar Notes tab**: quick reference listing all descriptions in current lesson with previews
- **Download learning materials**: styled HTML downloads with embedded CSS, print-friendly formats
- **Content download helper** (`content-download-helper.js`): export descriptions as HTML or markdown files
- **Visual hierarchy improvements**: type badges, clearer content titles, better spacing and typography

### Changed
- `CourseRepository.createContent()`: now accepts and stores `description` parameter
- `CourseRepository.updateContent()`: description added to allowlist of editable columns
- `lesson-player.js`: description rendering integrated into all content types (video, PDF, puzzle)
- `lesson-content-editor.js`: upload and edit dialogs now include markdown editor
- `puzzle-composer.js`: added description textarea field to composer form

### Technical Details
- **New dependency**: `marked` (~5KB gzipped) for markdown parsing
- **Security**: descriptions stored as raw markdown; sanitization at render time via marked
- **Performance**: zero server overhead for downloads (client-side Blob + createObjectURL)
- **Build**: all 6 phases implemented and tested; build passes without errors
- **Files modified**: 5 files; 2 new files
- **Lines of code**: ~300 new LOC (300 LOC markdown-editor.js, 180 LOC content-download-helper.js)

### Fixed
- N/A

### Security
- Input validation on description content (max length enforced at editor level)
- Markdown sanitization via marked library (no raw HTML injection)
- CSRF protection via existing API middleware
- Only admin/coaches can edit descriptions (role-based access)

---

## [2026-03-28] — Chess Lessons Platform & Puzzle Composer Redesign

### Added
- **Chess lessons platform**: courses, lessons, content items (video, PDF, puzzle, quiz)
- **Course management UI**: admin page for full course/lesson/content CRUD
- **Student courses page**: view and track assigned courses
- **Lesson player**: Coursera-style sidebar navigation with progress tracking
- **Puzzle composer**: full-screen admin composer with chess.com-style dark theme
- **Puzzle challenges**: multi-puzzle sets stored as JSON array in single content item
- **Per-move hints**: student and computer role assignment for interactive solving
- **Gamification**: XP rewards, achievement streaks, badges
- **File uploads**: video and PDF support (100MB max per file)
- **Student puzzle player**: interactive solving with auto-play, timeline feedback
- **Course assignments**: assign courses to students with per-content progress tracking
- **PWA offline support**: manifest and service worker integration

### Technical Details
- **Database**: migrations 007-009 add lessons platform schema
- **Migration 008**: puzzle_instruction, puzzle_hints, puzzle_video_url columns
- **Migration 009**: puzzle_challenges JSON array for multi-puzzle support
- **New components**: CourseManagementPage, lesson-player, lesson-puzzle-player, puzzle-composer
- **Repository pattern**: CourseRepository with column allowlist for safe dynamic updates
- **Gamification tables**: course_assignments, lesson_progress, student_gamification

---

## [2026-03-15] — Polish & Stability (Phase 5)

### Added
- **PDF export**: exercises and gradesheets with styled layouts
- **Print preview**: visual preview before PDF generation
- **Modal UI improvements**: better overflow handling, sticky footers
- **Success/error notifications**: toast-style feedback
- **Mobile responsiveness**: CSS improvements for iOS/Android

### Technical Details
- **PDF generation**: pdfkit-based exercise export (<2s generation time)
- **Input validation**: Zod schemas on all API inputs
- **Error handling**: comprehensive try-catch with user-friendly messages
- **Security**: 0 XSS, 0 SQL injection vulnerabilities

---

## [2026-02-28] — Auth & Admin (Phase 4)

### Added
- **JWT authentication**: 15min access tokens, 7day refresh tokens
- **User management**: admin dashboard for user CRUD
- **Role-based access**: admin and student roles with route guards
- **Puzzle reporting**: students can report inappropriate puzzles
- **Puzzle blocking**: admin can block reported puzzles from generation
- **Admin panel**: dashboard with user stats, reports list, puzzle management

### Technical Details
- **Auth service**: JWT generation/verification, bcrypt password hashing (10 rounds)
- **Middleware**: authMiddleware (token verify/refresh), roleMiddleware (role checks)
- **Security**: no hardcoded secrets, all credentials in environment variables

---

## [2026-02-10] — Core Features (Phase 3)

### Added
- **Puzzle generation UI**: theme/rating filters, batch generation
- **Weekly exercises**: create and assign exercises to student groups
- **Exercise grading**: inline grading with keyboard shortcuts, PDF upload support
- **Student dashboard**: view assigned exercises, solve puzzles, track progress
- **Puzzle solver**: interactive board with move validation, hint system
- **Grading interface**: modal-based grading with comments and scoring

### Technical Details
- **Puzzle generation**: <1s for 50 puzzles via in-memory theme index
- **API endpoints**: /api/exercises/*, /api/student-exercises/*, /api/puzzles/generate
- **State management**: closure-based app object in vanilla JS

---

## [2026-01-22] — Database Integration (Phase 2)

### Added
- **SQLite database**: 3.5M Lichess puzzles indexed by theme
- **Theme indexing**: in-memory Map<theme, puzzles[]> for fast lookups
- **Database utilities**: SqliteDatabase wrapper, DatabaseLoader (CSV parser), DatabaseGenerator (theme mapping)
- **Build pipeline**: `npm run build:db` script for Lichess CSV → SQLite conversion
- **Indices**: optimized queries on fen, rating, themes columns
- **Puzzle filtering**: rating range, theme selection, popularity filtering

### Technical Details
- **Database size**: 1.5GB SQLite (~3.5M puzzles)
- **Theme coverage**: 90+ unique themes from Lichess
- **Performance**: <100ms query time, <1s generation with 50 puzzles
- **Schema**: puzzles table with id, fen, moves (UCI), rating, popularity, themes, source

---

## [2026-01-15] — Foundation & Setup (Phase 1)

### Added
- **Monorepo structure**: npm workspaces with client and server packages
- **Client setup**: Vite dev server, vanilla JS SPA, hot module reload
- **Server setup**: Hono REST API framework on Node.js
- **Chess board UI**: Chessground integration for interactive board rendering
- **Move validation**: chess.js library for legal move checking
- **Basic routing**: hash-based router for SPA navigation
- **Responsive design**: CSS media queries for mobile/tablet/desktop

### Technical Details
- **Build tools**: Vite 5.4.11, Node.js 22+
- **Framework**: Hono 4.6.18 (lightweight REST framework)
- **Database**: better-sqlite3 11.0.0 (synchronous SQLite)
- **Development**: concurrent dev servers (client: 3000, server: 3001)
- **Proxy**: Vite proxies /api/* to localhost:3001

---

## [2026-04-18] — Interactive Puzzle Board Refactor & Content Descriptions

### Added
- **Shared InteractivePuzzleBoard module** (`interactive-puzzle-board.js`): Centralized puzzle interaction logic with proper Chessground lifecycle management (board recreation pattern)
- **Safe markdown module** (`safe-markdown.js`): marked + DOMPurify integration for all content description rendering
- **Markdown editor component** (`markdown-editor.js`): Split-pane editor with live preview, toolbar buttons
- **Content download helper** (`content-download-helper.js`): Export descriptions as HTML or markdown files
- **Preview button**: All content editor dialogs now include Preview button (lesson-content-editor.js)
- **Lesson content description column** (migration 011): Rich markdown support for learning materials

### Changed
- Puzzle composer uses shared InteractivePuzzleBoard for consistency
- Lesson player uses safe-markdown for all description rendering
- All markdown rendering centralized via single safe-markdown.js module (prevents XSS)

### Fixed
- Chessground bounds issue in interactive puzzle board (recreation on opponent move)
- Content editor UX: save/close behavior in edit content dialog
- Full-screen dialog overflow on mobile

### Tests
- 5+ comprehensive lesson-content route tests with Hono + DB integration
- Content description feature tests

### Known Issues (Resolved)
- PWA disabled in dev mode (restores Vite HMR, commit 0c7cca3)

---

## [2026-04-12] → [2026-04-18] — Quality & Stability

### Added
- Student registration feature (migration 011)
- Comprehensive test suite for lesson content routes
- Preview functionality across all content types

---

## Maintenance Notes

- **Architecture**: Vanilla JS SPA with Hono REST API, no frontend framework (React/Vue)
- **Code quality**: Immutable update patterns, error handling, input validation throughout
- **Testing**: 0% coverage (TODO: add 80%+ unit/integration/E2E tests)
- **Known debt**: Some files >200 LOC (ExercisePanel.js 1546 LOC, PuzzlePlayer.js 1492 LOC) — marked for future modularization
- **Security**: All endpoints protected via JWT auth, role-based access control, no hardcoded secrets

---

## Dependencies Summary

| Package | Version | Purpose | Size |
|---------|---------|---------|------|
| chess.js | 1.0.0-beta.8 | Move validation, FEN parsing | npm |
| chessground | 9.2.1 | Interactive board UI | npm |
| hono | 4.6.18 | REST API framework | npm |
| better-sqlite3 | 11.0.0 | SQLite database | npm |
| bcrypt | 6.0.0 | Password hashing | npm |
| jsonwebtoken | 9.0.3 | JWT tokens | npm |
| pdfkit | 0.15.0 | PDF generation | npm |
| marked | (latest) | Markdown parsing | ~5KB gz |
| zod | (latest) | Input validation | npm |

---

**Last Updated**: 2026-04-18
**Maintained By**: Chess Composer Team
