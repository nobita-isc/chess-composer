# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Start both client (port 3000) and server (port 3001) concurrently
npm run dev

# Start only client or server
npm run dev:client
npm run dev:server

# Build client for production
npm run build

# Build SQLite database from Lichess CSV
npm run build:db
npm run build:db:test  # Limited to 1000 puzzles for testing
```

## Architecture Overview

This is a **monorepo** using npm workspaces with two packages:

### Client (`packages/client/`)
- Vanilla JS (ES6+) SPA built with Vite
- **chess.js** for move validation and FEN parsing
- **Chessground** for interactive chess board rendering
- Vite proxies `/api/*` requests to `localhost:3001`

### Server (`packages/server/`)
- **Hono** REST API framework on Node.js
- **better-sqlite3** for synchronous SQLite database access
- **pdfkit** for PDF generation
- Database stored at `packages/server/data/puzzles.db`

### Key Data Flow
```
Client ApiClient → POST /api/puzzles/generate
                 → Server DatabaseGenerator queries SQLite
                 → Returns puzzles with FEN, moves (UCI), rating, themes
                 → Client renders with Chessground boards
```

## Database

SQLite database with in-memory theme index (`Map<theme, puzzles[]>`) for fast lookups.

**Puzzles table columns**: id, fen, moves (UCI format), rating, popularity, themes (comma-separated), source, game_url, is_blocked

**Migrations** run automatically on server start (`packages/server/src/database/migrations/`).

## API Response Format

All endpoints return:
```javascript
{ success: boolean, data?: T, error?: string }
```

## Key Directories

- `packages/client/src/exercises/` - Student exercise management (grading, print preview, puzzle player)
- `packages/client/src/reports/` - Puzzle reporting/blocking system
- `packages/server/src/routes/` - API endpoints (puzzles, exercises, students, reports)
- `packages/server/src/database/` - SqliteDatabase wrapper and DatabaseGenerator
- `scripts/` - Database build utilities

## Chess-Specific Notes

- Moves stored in **UCI format** (e.g., "e2e4 e7e5")
- Board orientation flips for black-to-move puzzles
- Puzzles auto-play opponent's first move before player interaction
