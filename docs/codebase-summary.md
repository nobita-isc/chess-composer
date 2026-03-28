# Codebase Summary

Chess Composer is a **monorepo** with 2 npm workspaces (client & server), ~15K LOC total. Client is Vanilla JS SPA (Vite). Server is Node.js REST API (Hono). Both share chess.js dependency.

**Last Updated**: 2026-03-28 (includes puzzle composer redesign, lessons platform, new lesson modules)

## Directory Structure

```
chess_composer/
├── packages/
│   ├── client/                  # SPA (port 3000)
│   │   ├── src/
│   │   │   ├── index.js         # Entry point, routing
│   │   │   ├── api/
│   │   │   │   └── ApiClient.js # HTTP client (8 API sections)
│   │   │   ├── auth/            # JWT, login, user management
│   │   │   ├── core/            # Chess logic, routing
│   │   │   ├── data/            # Sample puzzles (fallback)
│   │   │   ├── exercises/       # Puzzle solver, grading, PDF
│   │   │   ├── lessons/         # Chess lessons platform (courses, puzzles, player)
│   │   │   ├── puzzles/         # Generation, creation, validation
│   │   │   ├── reports/         # Admin panel, reporting
│   │   │   ├── views/           # GenerateView, StudentDashboard
│   │   │   └── public/          # Static HTML, CSS
│   │   ├── package.json         # chess.js, chessground
│   │   └── vite.config.js       # Vite config, /api proxy
│   │
│   └── server/                  # REST API (port 3001)
│       ├── src/
│       │   ├── index.js         # Hono app, middleware, migrations
│       │   ├── auth/            # JWT generation, verification
│       │   ├── database/        # SQLite wrapper, loader, generator
│       │   ├── exercises/       # Exercise CRUD, PDF generation
│       │   ├── lessons/         # CourseRepository, lessons platform logic
│       │   ├── middleware/      # Auth, role checking
│       │   ├── puzzles/         # Puzzle generation, validation
│       │   ├── reports/         # Reporting system, blocking
│       │   ├── routes/          # 11 route modules (API endpoints)
│       │   ├── shared/          # Move converter, utilities
│       │   ├── students/        # Student CRUD
│       │   └── users/           # User management, auth
│       ├── data/                # SQLite database (puzzles.db)
│       ├── package.json         # Hono, better-sqlite3, pdfkit
│       └── src/database/migrations/  # Schema migrations
│
├── scripts/                     # Build utilities
│   └── build-sqlite-db-optimized.js  # CSV→SQLite pipeline
│
├── docs/                        # Documentation
├── package.json                 # Monorepo config (workspaces)
└── README.md                    # Project overview
```

## Client Architecture (~12,378 LOC, 34 files)

### Entry Point: `src/index.js` (211 LOC)
- Role-based routing dispatcher
- Creates views: GenerateView (admin), StudentDashboard (student), LoginView
- Initializes API client, auth manager
- Handles route guards and navigation

### API Client: `src/api/ApiClient.js` (534 LOC)
- Single HTTP client for all backend communication
- 8 API sections:
  - `puzzles/*` - Generate, custom create
  - `lichess/*` - Lichess API proxy
  - `themes/*` - List themes
  - `reports/*` - Puzzle reporting
  - `students/*` - Student management
  - `exercises/*` - Weekly exercises
  - `student-exercises/*` - Grading
  - `users/*` - User management
- Auto-refresh tokens on 401
- Standard response format: `{ success, data, error }`

### Auth Module: `src/auth/` (3 files)
- **AuthManager.js** - JWT token management, login/logout
- **jwt-decode.js** - Parse JWT payload (no external dependency)
- **LoginView.js** - Login UI, credential handling

### Core Module: `src/core/` (3 files)
- **HashRouter.js** - Hash-based SPA routing (#/generate, #/student, etc.)
- **routeConfig.js** - Route definitions with guards (requireAdmin, requireStudent)
- **ChessEngineV2.js** - Stockfish integration (optional)

### Exercises Module: `src/exercises/` (9 files, ~6,000 LOC)
Handles puzzle solving, grading, PDF export, student management.

**Key components (2026-03-28)**
- **ExercisePanel.js** (1546 LOC) - Main exercise display, modern `ep-table` pattern
  - Could split: PuzzleGrid, ExerciseHeader, ExerciseFooter
- **ExercisePuzzleViewer.js** (400+ LOC) - Read-only puzzle display + inline grading mode
  - New: gradingMode option with C/X keyboard shortcuts
  - New: auto-advance and progress tracking
- **PuzzlePlayer.js** (1492 LOC) - Interactive puzzle solver
  - Could split: BoardDisplay, MoveValidator, SolutionDisplay
- **PrintPreview.js** (751 LOC) - PDF preview/printing
  - Could split: PreviewControls, PreviewContent
- **GradeDialog.js** - Grading modal (enhanced z-index handling)
- **CreateExerciseDialog.js** - Exercise creation (sticky footer, scrollable grid)
- **StudentDialog.js** - Student management modal + inline create

**UI Improvements**
- Modern styled buttons (btn-outline, btn-sm)
- Dropdown menus with position:fixed to escape overflow
- Password toggle component on all password inputs

### Lessons Module: `src/lessons/` (6 files, ~2,067 LOC)

Chess lessons platform — courses, lesson content, puzzle challenges, and student player.

**Key components (2026-03-28)**
- **CourseManagementPage.js** (388 LOC) - Admin UI: create/edit courses, lessons, content items
- **lesson-content-editor.js** (326 LOC) - Inline content editor; integrates puzzle-composer
- **lesson-player.js** (244 LOC) - Coursera-style student lesson player with sidebar nav + multi-challenge support
- **lesson-puzzle-player.js** (387 LOC) - chess.com-style dark-theme puzzle player: interactive solving, per-move hints, computer auto-play, timeline feedback
- **puzzle-composer.js** (558 LOC) - Full-screen admin puzzle composer: board preview, per-move hint editor, multi-puzzle batch creation, move validation
- **student-courses-page.js** (164 LOC) - Student course listing and assignment view

**puzzle_challenges architecture**: Multiple puzzles stored as a JSON array in one `lesson_content` row. Each challenge object: `puzzle_fen`, `puzzle_moves`, `puzzle_instruction`, `puzzle_hints[]`, `puzzle_video_url`, `xp_reward`. Student must solve ALL challenges before the item marks complete.

### Puzzles Module: `src/puzzles/` (4 files, ~1,200 LOC)
- **CreatePuzzleDialog.js** (785 LOC) - Custom puzzle creation form
  - Could split: FENInput, MovesInput, ValidationDisplay
- **puzzleGeneration.js** - Client-side puzzle utilities
- **staticBoard.js** - Non-interactive board display
- **validation/PuzzleValidator.js** - Input validation

### Reports Module: `src/reports/` (3 files)
- **AdminPanel.js** (678 LOC) - Admin dashboard
  - Could split: StatsPanel, ReportsList, UserManagement
- **ReportDialog.js** - Report submission/viewing
- **constants.js** - Report reasons, categories

### Views Module: `src/views/` (1 file)
- **GenerateView.js** (~683 LOC) - Puzzle generation UI
  - Could split: ThemeSelector, FilterPanel, PuzzleGrid, GenerateButton

## Server Architecture (~5,200 LOC, 33 files)

### Entry Point: `src/index.js` (126 LOC)
- Hono app initialization
- Middleware registration (auth, role checking, CORS)
- Database initialization
- Migration runner
- Route registration (8 modules)
- Server startup on port 3001

### Database Layer: `src/database/` (4 files, ~760 LOC)

**SqliteDatabase.js** (209 LOC)
- better-sqlite3 wrapper
- Database initialization, schema verification
- In-memory theme index (`Map<theme, puzzles[]>`)
- Query helpers (prepared statements)
- Indices for fast lookups

**DatabaseLoader.js** (209 LOC)
- CSV parsing and loading
- Theme filtering
- Rating/popularity filtering
- Fisher-Yates random sampling
- Fallback puzzles if database unavailable

**DatabaseGenerator.js** (337 LOC)
- Theme-to-Lichess tag mapping (90+ themes)
- Criteria relaxation (if no puzzles found)
- UCI→SAN move conversion
- Rating range filtering
- Caching of generated sets

**9 Migrations** (`migrations/001-009.js`)
- 001: Add source field to puzzles
- 002: Add exercise tables
- 003: Add puzzle_results table
- 004: Add users auth table
- 005: Add puzzle_hints field
- 006: Add is_final flag
- 007: Chess lessons platform tables (courses, lessons, lesson_content, course_assignments, lesson_progress, student_gamification)
- 008: Puzzle composer fields (puzzle_instruction, puzzle_hints, puzzle_video_url) on lesson_content
- 009: puzzle_challenges column on lesson_content (multi-puzzle JSON array)

### Auth Module: `src/auth/` (1 file)
- **AuthService.js** - JWT generation/verification, bcrypt hashing
  - Access token: 15min, refresh token: 7d
  - Password: 10-round bcrypt

### Routes Module: `src/routes/` (11 files, ~1,400 LOC)
Each route module registers endpoints for a domain.

**auth.js** - POST /api/auth/login, /refresh, /me
**puzzles.js** - POST /api/puzzles/generate, POST /custom, GET /stats, PUT /:id/block, PUT /:id/unblock, PUT /:id/fen
**themes.js** - GET /api/themes/list, /categories, /stats
**exercises.js** - CRUD weekly exercises, PUT /:id (rename), GET /export (PDF)
**student-exercises.js** - POST /grade, /upload-pdf, GET /list, PUT /:id/* (status updates)
**students.js** - CRUD students
**reports.js** - POST /submit, GET /list, PATCH /dismiss, /stats
**users.js** - User management (admin only)
**lichess.js** - Proxy Lichess API (reference puzzles)
**courses.js** - CRUD courses, lessons; GET /api/courses, /api/courses/:id, assignments
**lesson-content.js** - CRUD lesson_content items; file upload (video/PDF 100MB max); XP lookup

### Middleware: `src/middleware/` (2 files)
- **authMiddleware.js** - JWT verification, token refresh
- **roleMiddleware.js** - Role-based access control (requireAdmin, etc.)

### Services & Repositories: `src/*` (9+ files)
Domain-specific business logic following repository pattern.

**Auth**: AuthService
**Users**: UserService, UserRepository
**Puzzles**: PuzzleCreationService, PuzzleRepository, PuzzleValidator
**Exercises**: ExerciseService, ExerciseRepository
**Students**: StudentRepository
**Reports**: PuzzleReportManager
**Lessons**: CourseRepository (courses, lessons, lesson_content, assignments, progress, gamification)

### Utilities: `src/shared/` (1 file)
- **MoveConverter.js** - SAN↔UCI conversion for move display

### PDF Generation: `src/exercises/PdfGenerator.js`
- pdfkit-based exercise and gradesheet generation
- Custom fonts, layouts, chess board rendering
- <2 second generation time for typical exercises

## Database Schema

```sql
-- Puzzles (from Lichess CSV)
puzzles (
  id TEXT PRIMARY KEY,
  fen TEXT,
  moves TEXT,          -- UCI format
  rating INTEGER,
  popularity INTEGER,
  themes TEXT,         -- comma-separated
  source TEXT,
  game_url TEXT,
  is_blocked BOOLEAN
)

-- Teacher data
weekly_exercises (
  id INTEGER PRIMARY KEY,
  week_start DATE,
  week_end DATE,
  name TEXT,
  puzzle_ids TEXT,     -- JSON array
  filters JSON,        -- rating range, themes
  created_at TIMESTAMP
)

-- Student data
students (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT,
  skill_level TEXT,
  notes TEXT,
  created_at TIMESTAMP
)

-- Authentication
users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT,
  role TEXT,           -- 'admin' | 'student'
  student_id INTEGER,
  created_at TIMESTAMP
)

-- Assignments & results
student_exercises (
  id INTEGER PRIMARY KEY,
  student_id INTEGER,
  exercise_id INTEGER,
  score REAL,
  total_puzzles INTEGER,
  answer_pdf_path TEXT,
  status TEXT,         -- 'assigned' | 'submitted' | 'graded'
  assigned_at TIMESTAMP,
  graded_at TIMESTAMP,
  notes TEXT
)

puzzle_results (
  id INTEGER PRIMARY KEY,
  student_exercise_id INTEGER,
  puzzle_id TEXT,
  result TEXT,         -- 'correct' | 'incorrect' | 'partial'
  attempt_count INTEGER,
  time_spent_seconds INTEGER
)

-- Reporting
puzzle_reports (
  id INTEGER PRIMARY KEY,
  puzzle_id TEXT,
  reason TEXT,
  notes TEXT,
  dismissed BOOLEAN,
  reported_at TIMESTAMP
)

puzzle_modifications (
  puzzle_id TEXT PRIMARY KEY,
  blocked BOOLEAN,
  modified_fen TEXT,
  modified_at TIMESTAMP
)

-- Lessons platform (migration 007-009)
courses (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  skill_level TEXT,          -- 'beginner' | 'intermediate' | 'advanced'
  created_at TEXT,
  updated_at TEXT
)

lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT,
  order_index INTEGER,
  title TEXT,
  description TEXT,
  created_at TEXT
)

lesson_content (
  id TEXT PRIMARY KEY,
  lesson_id TEXT,
  order_index INTEGER,
  content_type TEXT,         -- 'video' | 'pdf' | 'puzzle' | 'quiz'
  title TEXT,
  video_url TEXT,
  file_path TEXT,
  file_size INTEGER,
  duration_min INTEGER,
  puzzle_id TEXT,
  puzzle_fen TEXT,
  puzzle_moves TEXT,
  quiz_data TEXT,            -- JSON
  xp_reward INTEGER,
  puzzle_instruction TEXT,   -- migration 008
  puzzle_hints TEXT,         -- JSON: per-move hints (student/computer roles) — migration 008
  puzzle_video_url TEXT,     -- migration 008
  puzzle_challenges TEXT,    -- JSON array of challenge objects — migration 009
  created_at TEXT
)

course_assignments (
  id TEXT PRIMARY KEY,
  course_id TEXT,
  student_id TEXT,
  assigned_at TEXT
)

lesson_progress (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  content_id TEXT,
  completed INTEGER,
  puzzle_result TEXT,
  completed_at TEXT,
  xp_earned INTEGER
)

student_gamification (
  student_id TEXT PRIMARY KEY,
  total_xp INTEGER,
  current_streak INTEGER,
  longest_streak INTEGER,
  last_activity_date TEXT,
  badges TEXT              -- JSON array
)
```

## Build Pipeline

**scripts/build-sqlite-db-optimized.js**
- Reads Lichess CSV (3.5M rows)
- 10K row batch inserts for speed
- Creates indices on fen, rating, themes
- WAL mode for faster writes
- Theme→puzzles map for memory index
- Outputs: `packages/server/data/puzzles.db` (~1.5GB)

**Build variants:**
- `npm run build:db` - Full Lichess database
- `npm run build:db:test` - 1,000 puzzles for testing

## Key Design Patterns

| Pattern | Usage | Example |
|---------|-------|---------|
| Repository | Data access abstraction | PuzzleRepository, UserRepository |
| Service | Business logic | PuzzleCreationService, ExerciseService |
| Middleware | HTTP concerns | authMiddleware, roleMiddleware |
| Modal | UI state management | GradeDialog, CreateExerciseDialog |
| Closure | Client-side state | App object encapsulation |
| In-memory cache | Theme index | `Map<theme, puzzles[]>` |
| Fisher-Yates | Random sampling | Puzzle selection |
| Column allowlist | Safe dynamic UPDATE | CourseRepository.updateContent() |

## Code Quality

| Aspect | Status |
|--------|--------|
| Immutability | ✅ No mutations in updates |
| File size | 🟡 Some files >200 LOC (marked above) |
| Error handling | ✅ Try-catch, user-friendly messages |
| Input validation | ✅ Zod schemas on API inputs |
| Security | ✅ No hardcoded secrets, parameterized queries |
| Testing | 📋 Coverage tracking, test files not listed |
| Documentation | ✅ JSDoc comments, clear naming |
| Dependencies | ✅ Minimal, production-ready packages |

## Technology Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Client** | Vanilla JS | ES6+ | Main UI logic |
| **Client** | Vite | 5.4.11 | Dev server, build |
| **Client** | chess.js | 1.0.0-beta.8 | Move validation, FEN parsing |
| **Client** | Chessground | 9.2.1 | Interactive board rendering |
| **Server** | Hono | 4.6.18 | REST framework |
| **Server** | better-sqlite3 | 11.0.0 | Database (sync) |
| **Server** | bcrypt | 6.0.0 | Password hashing |
| **Server** | jsonwebtoken | 9.0.3 | JWT tokens |
| **Server** | pdfkit | 0.15.0 | PDF generation |
| **Build** | Node.js | 22+ | Runtime |
| **Monorepo** | npm workspaces | - | Package management |

## External Data

**Lichess Database** (~3.5M puzzles)
- Not included in repo (external download)
- CSV format: PuzzleId, FEN, Moves, Rating, Themes, etc.
- Downloaded via `npm run build:db`
- ~1.5GB SQLite after processing

## Performance Notes

- Puzzle generation: <1s for 50 puzzles (in-memory theme index)
- PDF generation: <2s per exercise (pdfkit)
- Database query: <100ms typical (SQLite indices)
- Client renders: <100ms (Vanilla JS, no virtual DOM overhead)
- Memory footprint: ~500MB (theme index + in-memory cache)
- Inline grading: instant (no server roundtrip until save)

## Recent Changes (2026-03-28)

**New: Chess Lessons Platform**
- Full lessons platform: courses → lessons → content items (video, PDF, puzzle, quiz)
- CourseManagementPage.js — admin UI for course/lesson/content CRUD
- student-courses-page.js — student course listing and assigned courses view
- lesson-player.js — Coursera-style player with sidebar navigation
- File upload support (video/PDF, 100MB max)
- Gamification: XP rewards, streaks, badges (student_gamification table)
- Course assignments (course_assignments table) with per-content progress tracking

**New: Puzzle Composer Redesign (chess.com-style)**
- puzzle-composer.js (558 LOC) — full-screen admin composer with board preview, per-move hint editor, multi-puzzle batch creation, move validation
- lesson-puzzle-player.js (387 LOC) — dark-theme interactive student puzzle player with computer auto-play and timeline feedback
- lesson-content-editor.js — integrated puzzle composer, removed old inline dialog
- migrations 008 & 009: puzzle_instruction, puzzle_hints (JSON), puzzle_video_url, puzzle_challenges (JSON) added to lesson_content
- puzzle_challenges: multiple puzzles per content item stored as JSON array; student completes ALL before item marks done
- CourseRepository: column allowlist pattern for safe dynamic UPDATE of lesson_content

**Previous UI Modernization**
- Inline puzzle grading with C/X keyboard shortcuts, auto-advance, auto-save
- Exercise rename (PUT /api/exercises/:id)
- Modern `ep-table` pattern, `btn-outline btn-sm` buttons, fixed-position dropdowns

## Integration Points

- **Lichess**: CSV database (offline)
- **chess.js**: Move validation, FEN parsing (npm)
- **Chessground**: Board UI (npm)
- **pdfkit**: PDF generation (npm)
- **bcrypt**: Password hashing (npm)
- **better-sqlite3**: Database (npm)
- **No external APIs** beyond optional Lichess reference proxy
