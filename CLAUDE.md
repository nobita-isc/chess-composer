# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Role & Responsibilities

Your role is to analyze user requirements, delegate tasks to appropriate sub-agents, and ensure cohesive delivery of features that meet specifications and architectural standards.

## Workflows

- Primary workflow: `./.claude/rules/primary-workflow.md`
- Development rules: `./.claude/rules/development-rules.md`
- Orchestration protocols: `./.claude/rules/orchestration-protocol.md`
- Documentation management: `./.claude/rules/documentation-management.md`
- And other workflows: `./.claude/rules/*`

**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.
**IMPORTANT:** You must follow strictly the development rules in `./.claude/rules/development-rules.md` file.
**IMPORTANT:** Before you plan or proceed any implementation, always read the `./README.md` file first to get context.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.

## Hook Response Protocol

### Privacy Block Hook (`@@PRIVACY_PROMPT@@`)

When a tool call is blocked by the privacy-block hook, the output contains a JSON marker between `@@PRIVACY_PROMPT_START@@` and `@@PRIVACY_PROMPT_END@@`. **You MUST use the `AskUserQuestion` tool** to get proper user approval.

**Required Flow:**

1. Parse the JSON from the hook output
2. Use `AskUserQuestion` with the question data from the JSON
3. Based on user's selection:
   - **"Yes, approve access"** → Use `bash cat "filepath"` to read the file (bash is auto-approved)
   - **"No, skip this file"** → Continue without accessing the file

**Example AskUserQuestion call:**
```json
{
  "questions": [{
    "question": "I need to read \".env\" which may contain sensitive data. Do you approve?",
    "header": "File Access",
    "options": [
      { "label": "Yes, approve access", "description": "Allow reading .env this time" },
      { "label": "No, skip this file", "description": "Continue without accessing this file" }
    ],
    "multiSelect": false
  }]
}
```

**IMPORTANT:** Always ask the user via `AskUserQuestion` first. Never try to work around the privacy block without explicit user approval.

## Python Scripts (Skills)

When running Python scripts from `.claude/skills/`, use the venv Python interpreter:
- **Linux/macOS:** `.claude/skills/.venv/bin/python3 scripts/xxx.py`
- **Windows:** `.claude\skills\.venv\Scripts\python.exe scripts\xxx.py`

This ensures packages installed by `install.sh` (google-genai, pypdf, etc.) are available.

**IMPORTANT:** When scripts of skills failed, don't stop, try to fix them directly.

## [IMPORTANT] Consider Modularization
- If a code file exceeds 200 lines of code, consider modularizing it
- Check existing modules before creating new
- Analyze logical separation boundaries (functions, classes, concerns)
- Use kebab-case naming with long descriptive names, it's fine if the file name is long because this ensures file names are self-documenting for LLM tools (Grep, Glob, Search)
- Write descriptive code comments
- After modularization, continue with main task
- When not to modularize: Markdown files, plain text files, bash scripts, configuration files, environment variables files, etc.

## Documentation Management

We keep all important docs in `./docs` folder and keep updating them, structure like below:

```
./docs
├── project-overview-pdr.md
├── code-standards.md
├── codebase-summary.md
├── design-guidelines.md
├── deployment-guide.md
├── system-architecture.md
└── project-roadmap.md
```

**IMPORTANT:** *MUST READ* and *MUST COMPLY* all *INSTRUCTIONS* in project `./CLAUDE.md`, especially *WORKFLOWS* section is *CRITICALLY IMPORTANT*, this rule is *MANDATORY. NON-NEGOTIABLE. NO EXCEPTIONS. MUST REMEMBER AT ALL TIMES!!!*

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