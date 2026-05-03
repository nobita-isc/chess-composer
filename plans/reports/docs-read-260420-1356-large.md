# Documentation Review Report
**Date**: 2026-04-18 | **Scope**: code-standards.md (759L), system-architecture.md (726L), deployment-guide.md (576L)

---

## 1. code-standards.md

**Purpose**: Define naming conventions, code patterns, security standards, testing requirements, and code review checklist across client/server.

**Sections Outline**:
- File Organization (naming, size limits, directory structure)
- Code Patterns (immutability, repository, service layer, error handling, validation, middleware, RBAC)
- UI Component Patterns (ep-table, dropdowns, password toggle, buttons)
- Naming Conventions (variables, booleans, constants)
- Comments & Documentation (JSDoc, inline comments)
- Security (no hardcoded secrets, input sanitization, parameterized queries, password hashing)
- Testing Standards & Code Coverage
- Performance Guidelines
- Version Control & Commit Messages
- Code Review Checklist

**Staleness Signals**:
- ✅ Column Allowlist Pattern documented (CourseRepository.updateContent) — matches migration 011
- ✅ Modern UI patterns (ep-table, gd-dropdown, styled buttons) documented — reflects 2026-03-28 refactoring
- ✅ Database Transaction Pattern present
- ❌ **Missing**: No mention of puzzle-composer redesign (chess.com-style), lesson-puzzle-player.js, or multi-puzzle challenges
- ❌ **Missing**: No mention of Preview button or content descriptions feature
- ❌ **Missing**: PWA feature (even disabled) not documented
- ❌ **Missing**: No reference to InteractivePuzzleBoard refactor or shared puzzle board module
- ❌ **Missing**: lesson-content-editor and student-courses-page not in architecture section

**Concrete Updates Needed**:
1. **Add UI Component Patterns** for:
   - lesson-puzzle-player dark theme styling
   - puzzle-composer full-screen overlay (chess.com style)
   - Preview button component pattern (lesson-content-editor)
2. **Update Performance Guidelines** section with:
   - Multi-puzzle challenge loading time (<500ms expected)
   - Lesson content serialization/deserialization benchmarks
3. **Extend Code Patterns** with:
   - Shared component extraction (InteractivePuzzleBoard example)
   - JSON serialization patterns for puzzle_challenges (per system-architecture.md)
4. **Add Security Pattern**: File upload validation (100MB max, lesson-content.js endpoint)
5. **Refactor note**: Files marked for modularization should note lesson-content-editor.js (326 LOC — borderline)

---

## 2. system-architecture.md

**Purpose**: Describe distributed SPA architecture, client/server layers, data flow, performance optimizations, and security design.

**Sections Outline**:
- Overview (HTTP/JSON, JWT auth, SPA architecture diagram)
- Client Architecture (layers, request flow, key modules table, state management, routing, API client)
- Server Architecture (layers, request processing pipeline, 11 route modules, service/repository patterns, middleware, database layer, migrations, auth flow, PDF generation)
- Data Flow Examples (puzzle generation, exercise assignment, puzzle challenges, reporting)
- Performance Architecture (theme index, query optimization, caching strategy)
- Scaling Considerations
- Security Architecture (JWT, authz, input validation, DB security, error handling)
- Deployment Architecture (current vs. future)

**Staleness Signals**:
- ✅ Multi-puzzle challenges flow documented with puzzle_challenges JSON schema (lines 505–559)
- ✅ lesson-puzzle-player.js listed in key modules (387 LOC, dark theme)
- ✅ puzzle-composer.js listed (558 LOC, full-screen admin composer)
- ✅ lesson-content-editor.js listed (326 LOC)
- ✅ student-courses-page.js listed (164 LOC)
- ✅ CourseRepository column allowlist mentioned (line 525)
- ❌ **Route modules table (line 232–246)** shows only 8 modules listed; deployment guide mentions 11 total
  - Missing: explicit mention that lesson-content.js handles file upload (100MB max)
  - Missing: explicit mention that migration 011 adds registration/student creation features
- ❌ **Database migrations** (lines 343–354) stop at 009 (puzzle_challenges); migration 011 (registration) NOT listed
- ❌ **Missing**: No mention of Preview button feature in lesson-content-editor
- ❌ **Missing**: No mention of content descriptions/learning materials download
- ❌ **Missing**: PWA feature/disabling PWA in dev not mentioned
- ❌ **Missing**: Shared InteractivePuzzleBoard refactor not described
- ❌ **Key modules table** doesn't show lesson-puzzle-player dark theme as a requirement

**Concrete Updates Needed**:
1. **Update Database Migrations** (line 343):
   ```
   010_add_registration_feature.js    → [registration details]
   011_add_content_descriptions.js    → Add content_description, learning_materials on lesson_content
   ```
2. **Update Route Modules Table** (line 232–246):
   - Clarify lesson-content.js now handles file upload (100MB limit, learning materials)
   - Add row noting preview endpoint or content metadata endpoint if exists
3. **Extend Data Flow Examples** with:
   - Content Description/Learning Materials download flow (POST lesson-content, download via GET)
4. **Update Key Modules** (line 82–99):
   - Note lesson-puzzle-player.js uses dark theme (chess.com-style, not light)
   - Note puzzle-composer.js is "admin full-screen" with multi-puzzle support
5. **Add Performance Note**: Shared InteractivePuzzleBoard refactor resolved Chessground bounds bug
6. **Security Update**: Document 100MB file upload limit validation on lesson-content.js

---

## 3. deployment-guide.md

**Purpose**: Setup instructions for development, production (Node/Nginx or Docker), checklist, monitoring, and troubleshooting.

**Sections Outline**:
- Prerequisites (Node 22+, npm 10+, 2GB disk, 500MB RAM, optional Docker/PostgreSQL)
- Development Setup (clone, build DB, env config, dev servers, migrations, admin user, testing)
- Production Setup (Node.js direct or Docker options)
  - Nginx reverse proxy, SSL, Systemd service, database backup
  - Docker: Dockerfile, docker-compose, build DB
- Production Checklist
- Monitoring & Maintenance (health checks, common issues, logs, DB maintenance)
- Scaling Phases (1: single server, 2: load-balanced, 3: distributed)
- Troubleshooting

**Staleness Signals**:
- ✅ "Latest Features (2026-03-28)" section mentions inline grading, exercise rename, password toggle, modern UI, multiple exercises per week, timezone fixes
- ❌ **Missing**: All recent features (past 2026-03-28) NOT listed:
  - Preview button (5d79ab0, 2026-04-18)
  - Content descriptions/learning materials (b0aff01, 2026-04-17)
  - Shared InteractivePuzzleBoard refactor (916e09f, 2026-04-14)
  - Multi-puzzle challenges (cfdfc9d, 2026-04-10)
  - PWA disabled in dev (0c7cca3, 2026-04-08)
  - Migration 011 registration (c0f0d61, 2026-04-06)
  - Puzzle composer redesign chess.com-style (30815df, 2026-03-22)
- ❌ **Missing**: No mention of file upload feature (100MB limit) — lesson-content.js endpoint exists but not documented
- ❌ **Missing**: No mention of learning materials download capability
- ❌ **Database build**: `npm run build:db:test` still documented but may be outdated if migrations added
- ❌ **Missing**: No note on PWA being disabled in development (may confuse setup)
- ❌ **Monitoring section** doesn't mention lesson-content file uploads as a disk space concern

**Concrete Updates Needed**:
1. **Update "Latest Features"** section (line 5–11):
   ```
   **Latest Features (2026-04-18)**
   - Preview button in lesson content editor
   - Rich content descriptions & learning materials download
   - Shared InteractivePuzzleBoard refactor (chess.com-style dark theme)
   - Multi-puzzle challenges in single lesson content item
   - Puzzle composer redesign (chess.com-style full-screen)
   - PWA disabled in development (Vite HMR restored)
   - Student registration feature (migration 011)
   ```
2. **Production Checklist** (line 436–452): Add checkbox:
   ```
   - [ ] File upload storage configured (100MB max per file)
   - [ ] Learning materials directory writable and backed up
   ```
3. **Monitoring & Common Issues** (line 470–479): Add row:
   ```
   | File upload fails | Disk full / permissions | Check /uploads permissions, increase disk space |
   | Lesson content missing | Migration 011 not run | Run `npm run dev` once to auto-migrate |
   ```
4. **Database Maintenance** (line 494–505): Add:
   ```
   # Archive old learning materials (manual cleanup)
   find /uploads -mtime +30 -delete
   ```
5. **Troubleshooting**: Add section "**Learning Materials Won't Download**"
   ```
   # Check file exists
   ls -lah packages/server/uploads/
   
   # Check permissions
   stat packages/server/uploads/lesson-content-*
   ```
6. **Prerequisites**: Update to mention 500MB storage for uploads (in addition to 2GB database)

---

## Summary: Staleness by Age & Impact

| Doc | Most Recent Commit | Gap | Severity | Items Missing |
|-----|-------------------|-----|----------|---|
| code-standards.md | 2026-03-28 (ref) | 21 days | Medium | Chess.com puzzle composer, lesson-puzzle-player, Preview, InteractivePuzzleBoard refactor, multi-puzzle challenges |
| system-architecture.md | 2026-03-28 (implicit) | 21 days | High | Migration 011, content descriptions, file upload docs, PWA note, shared board details |
| deployment-guide.md | 2026-03-28 (explicit) | 21 days | High | 6+ recent features, file upload monitoring, migration 011, PWA dev note |

**Root Cause**: Docs last updated 2026-03-28; 13 commits since then introduce major features (puzzle composer redesign, multi-puzzle challenges, content descriptions, shared refactor, file uploads, PWA changes, migration 011). Docs frozen post-refactoring; feature work continued without doc updates.

**Effort to Fix**: ~2 hours (code-standards minimal; architecture moderate; deployment high due to feature list + monitoring additions).
