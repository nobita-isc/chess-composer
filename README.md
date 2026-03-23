# Chess Composer

Web-based chess puzzle generator for teachers and students. Create themed weekly exercises, assign to students, grade submissions interactively. Integrates 3.5M+ Lichess puzzles with theme-based filtering and custom puzzle creation.

## Quick Start

```bash
# Install dependencies
npm install

# Start development (client: 3000, server: 3001)
npm run dev

# Build production client
npm run build

# Build SQLite database from Lichess CSV
npm run build:db
npm run build:db:test  # 1000 puzzles for testing
```

Visit [http://localhost:3000](http://localhost:3000) - Login with admin credentials (see server startup logs).

## Tech Stack

| Component | Tech |
|-----------|------|
| **Client** | Vanilla JS (ES6+), Vite, chess.js, Chessground |
| **Server** | Hono REST API, Node.js, better-sqlite3 |
| **Database** | SQLite (~3.5M Lichess puzzles) |
| **Auth** | JWT (15min access, 7d refresh), bcrypt |
| **PDF** | pdfkit (exercise printouts) |

## Architecture

**Monorepo** with npm workspaces:
- `packages/client/` - SPA (port 3000)
- `packages/server/` - REST API (port 3001)
- Vite proxies `/api/*` requests to server

### Key Flow
```
User Login → JWT tokens stored → Auth guards on routes
Teacher creates weekly exercise → Select puzzles by theme/rating
Assigns to students → Students solve interactively
Teacher grades submissions → PDF gradesheet export
```

## Features

| Feature | Status |
|---------|--------|
| Puzzle generation (90+ themes) | ✅ Complete |
| Weekly exercise management | ✅ Complete |
| Student assignment & grading | ✅ Complete |
| Auth system (admin/student) | ✅ Complete |
| Puzzle reporting & blocking | ✅ Complete |
| PDF export (exercises, gradesheets) | ✅ Complete |
| Custom puzzle creation | ✅ Complete |
| Lichess integration | ✅ Complete |

## Database Schema

```
puzzles - Lichess puzzles (FEN, moves, rating, themes, source)
students - Student info (name, email, skill_level, notes)
users - Auth (username, password_hash, role, student_id)
weekly_exercises - Teacher-created exercise sets
student_exercises - Student assignments with scores/status
puzzle_results - Individual puzzle attempt tracking
puzzle_reports - Puzzle quality reports
puzzle_modifications - Blocked/modified puzzles
```

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Generate puzzles, create exercises, assign, grade, manage users, review reports |
| **Student** | View assigned exercises, solve puzzles, submit answers |

## Documentation

- [Project Overview & PDR](./docs/project-overview-pdr.md) - Requirements & vision
- [Codebase Summary](./docs/codebase-summary.md) - File structure & organization
- [Code Standards](./docs/code-standards.md) - Patterns & conventions
- [System Architecture](./docs/system-architecture.md) - Detailed design
- [Deployment Guide](./docs/deployment-guide.md) - Setup & deployment
- [Development Roadmap](./docs/project-roadmap.md) - Current progress

## Key Commands

```bash
npm run dev          # Concurrent dev (both packages)
npm run dev:client   # Client only (Vite HMR)
npm run dev:server   # Server only (auto-reload)
npm run build        # Production build
npm run build:db     # Full Lichess database
npm run build:db:test # 1000 puzzle sample
```

## API Overview

All endpoints return `{ success: boolean, data?: T, error?: string }`.

| Endpoint | Purpose |
|----------|---------|
| `/api/auth/*` | Login, refresh, current user |
| `/api/puzzles/*` | Generate, custom create, stats |
| `/api/themes/*` | List themes, categories, stats |
| `/api/exercises/*` | Weekly exercise CRUD, PDF |
| `/api/student-exercises/*` | Grade, upload PDFs, list |
| `/api/students/*` | Student CRUD |
| `/api/reports/*` | Submit, list, dismiss reports |
| `/api/users/*` | User management (admin only) |

See [System Architecture](./docs/system-architecture.md) for detailed API specs.

## Development

Follow conventions in [Code Standards](./docs/code-standards.md). Key principles:
- Immutable updates (no mutations)
- Repository pattern (data access)
- Service layer (business logic)
- Modal-based UI (dialogs & overlays)
- 200-400 lines per file (modular)

## License

MIT
