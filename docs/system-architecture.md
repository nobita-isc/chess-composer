# System Architecture

## Overview

Chess Composer is a distributed single-page application (SPA) with a REST API backend. Client and server communicate via JSON over HTTP. Authentication via JWT tokens (stateless).

```
┌─────────────────┐                    ┌──────────────────┐
│   Web Browser   │                    │   Lichess CSV    │
│  (SPA, 3000)    │ ◄──────────────►  │   (3.5M puzzles) │
│                 │   HTTP/JSON        │                  │
└─────────────────┘                    └──────────────────┘
        │
        │ Vite proxy /api/*
        │
        ▼
┌──────────────────────────┐
│   Hono REST API (3001)   │
│  ├─ routes/ (8 modules)  │
│  ├─ services/ (logic)    │
│  ├─ middleware/ (auth)   │
│  └─ database/ (SQLite)   │
└──────────────────────────┘
        │
        ▼
┌──────────────────────────┐
│   SQLite Database        │
│  (puzzles.db, ~1.5GB)    │
│  ├─ puzzles (3.5M rows)  │
│  ├─ students             │
│  ├─ users                │
│  ├─ exercises            │
│  ├─ results              │
│  ├─ courses/lessons      │
│  └─ lesson_content       │
└──────────────────────────┘
```

## Client Architecture

### Layers

```
┌──────────────────────────────────┐
│     Views (UI Components)        │  index.js → routes
├──────────────────────────────────┤
│   Auth → JWT Management          │  LoginView, AuthManager
├──────────────────────────────────┤
│   API Client (Single HTTP layer) │  ApiClient.js (534 LOC)
├──────────────────────────────────┤
│   Routing & Navigation           │  HashRouter.js
├──────────────────────────────────┤
│   Puzzle/Exercise Logic          │  Generation, validation
├──────────────────────────────────┤
│   Chess Libraries                │  chess.js, Chessground
└──────────────────────────────────┘
```

### Request Flow (Example: Generate Puzzles)

```
User selects theme & count
       │
       ▼
GenerateView.handleGenerate()
       │
       ▼
ApiClient.generatePuzzles(theme, count)
       │
       ▼
POST /api/puzzles/generate
       │
       ▼
{ success: true, data: [...] }
       │
       ▼
ExercisePanel renders puzzles
```

### Key Modules

| Module | Purpose | LOC | Status |
|--------|---------|-----|--------|
| index.js | Entry point, routing | 211 | ✅ |
| ApiClient.js | HTTP client (all endpoints) | 534 | ✅ |
| AuthManager.js | JWT token management | ~80 | ✅ |
| HashRouter.js | SPA routing (#/generate, etc.) | ~100 | ✅ |
| ExercisePanel.js | Puzzle display grid + modern UI | 1546 | 🚧 Needs split |
| ExercisePuzzleViewer.js | Inline grading mode | ~400 | ✅ |
| PuzzlePlayer.js | Interactive solver | 1492 | 🚧 Needs split |
| GradeDialog.js | Grading interface | ~300 | ✅ |
| GenerateView.js | Puzzle generation UI | ~683 | ✅ |
| AdminPanel.js | Admin dashboard (modern UI) | 678 | ✅ |
| CourseManagementPage.js | Admin course/lesson/content CRUD | 388 | ✅ |
| lesson-content-editor.js | Inline content editor + puzzle composer | 326 | ✅ |
| lesson-player.js | Coursera-style student lesson player | 244 | ✅ |
| lesson-puzzle-player.js | chess.com-style puzzle player (dark theme) | 387 | ✅ |
| puzzle-composer.js | Full-screen admin puzzle composer | 558 | ✅ |
| student-courses-page.js | Student course listing page | 164 | ✅ |

### State Management Pattern

Client uses **closure-based state** (no Redux, simple & sufficient):

```javascript
const appState = {
  puzzles: [],
  currentExercise: null,
  student: null,

  getPuzzles() { return [...this.puzzles] },
  setPuzzles(p) { this.puzzles = p.map(x => ({...x})) },
  // ... other getters/setters
}
```

All state updates via getter/setter functions (immutable).

### Routing

Hash-based SPA routing:
```
#/login              → LoginView
#/generate           → GenerateView (admin)
#/student            → StudentDashboard (student)
#/exercises/:id      → ExercisePanel
#/admin              → AdminPanel (admin)
```

Route guards check user role:
```javascript
const routes = {
  '/generate': { view: GenerateView, guard: requireAdmin },
  '/student': { view: StudentDashboard, guard: requireStudent }
}
```

### API Client Pattern

Single HTTP client wraps all endpoints:

```javascript
class ApiClient {
  // Puzzles API
  async generatePuzzles(theme, count) { }
  async createCustomPuzzle(fen, moves) { }

  // Exercises API
  async createExercise(data) { }
  async gradeExercise(exerciseId, studentId, score) { }

  // Students API
  async getStudents() { }
  async createStudent(data) { }

  // All methods:
  // - Attach JWT token to requests
  // - Auto-refresh on 401
  // - Handle validation errors
  // - Return standardized responses
}
```

Auto-refresh flow:
```
Request with token
       │
       ▼ (401 response)
       │
Refresh token
       │
       ▼ (new access token)
       │
Retry original request
```

## Server Architecture

### Layers

```
┌────────────────────────────────┐
│   HTTP Layer (Hono.js)         │  Request/response handling
├────────────────────────────────┤
│   Route Handlers (8 modules)   │  Endpoints, validation
├────────────────────────────────┤
│   Middleware                   │  Auth, role checking
├────────────────────────────────┤
│   Services (Business Logic)    │  PuzzleService, etc.
├────────────────────────────────┤
│   Repositories (Data Access)   │  PuzzleRepository, etc.
├────────────────────────────────┤
│   Database Layer               │  SQLite wrapper
├────────────────────────────────┤
│   Migrations                   │  Schema management
└────────────────────────────────┘
```

### Request Processing Pipeline

```
Request
   │
   ▼
authMiddleware (verify JWT)
   │
   ▼
roleMiddleware (check admin/student)
   │
   ▼
Route handler (parse input)
   │
   ▼
Input validation (Zod schema)
   │
   ▼
Service layer (business logic)
   │
   ▼
Repository layer (query DB)
   │
   ▼
Database (SQLite)
   │
   ▼
Response formatting
   │
   ▼
Client
```

### Route Modules (11 total)

| Module | Endpoints | Methods | Status |
|--------|-----------|---------|--------|
| auth.js | /api/auth/login, /refresh, /me | POST, GET | ✅ |
| puzzles.js | /api/puzzles/generate, /custom, /stats, /:id/block, /:id/unblock, /:id/fen | POST, GET, PUT | ✅ |
| themes.js | /api/themes/list, /categories, /stats | GET | ✅ |
| exercises.js | /api/exercises/*, /:id (rename), /export | CRUD + PUT, GET | ✅ |
| student-exercises.js | /api/student-exercises/grade, /upload, /list, /:id/* | POST, GET, PUT | ✅ |
| students.js | /api/students/* | CRUD | ✅ |
| reports.js | /api/reports/submit, /list, /dismiss | POST, GET, PATCH | ✅ |
| users.js | /api/users/* (admin only) | CRUD | ✅ |
| lichess.js | /api/lichess/... | GET (proxy) | ✅ |
| courses.js | /api/courses/*, /api/courses/:id/lessons, assignments | CRUD | ✅ |
| lesson-content.js | /api/lesson-content/*, file upload (100MB max), XP lookup | CRUD + POST | ✅ |

### Service Layer Example

```javascript
class PuzzleService {
  constructor(database, databaseGenerator) {
    this.db = database
    this.generator = databaseGenerator
  }

  async generatePuzzles(theme, count, options) {
    // 1. Validate input
    if (count < 1 || count > 50) throw new Error('Invalid count')

    // 2. Call database generator
    const puzzles = await this.generator.generate(theme, count, options)

    // 3. Format response
    return puzzles.map(p => ({
      fen: p.fen,
      moves: p.moves.split(' '),
      rating: p.rating,
      themes: p.themes.split(',')
    }))
  }
}
```

### Repository Pattern Example

```javascript
class PuzzleRepository {
  constructor(database) {
    this.db = database
  }

  findByTheme(theme, limit) {
    // Use in-memory theme index first
    const puzzles = this.db.getThemeIndex().get(theme) || []
    return puzzles.slice(0, limit)
  }

  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM puzzles WHERE id = ?')
    return stmt.get(id)
  }

  findByRating(minRating, maxRating) {
    const stmt = this.db.prepare(
      'SELECT * FROM puzzles WHERE rating BETWEEN ? AND ?'
    )
    return stmt.all(minRating, maxRating)
  }
}
```

### Middleware

**authMiddleware.js**
```javascript
// Verify JWT token on all routes
// Extract user info from token
// Auto-refresh if expired
// Return 401 if invalid
```

**roleMiddleware.js**
```javascript
// Check user.role === 'admin' or 'student'
// Return 403 if unauthorized
// Can wrap specific routes
```

### Database Layer

**SqliteDatabase.js**
```
┌──────────────────────────────┐
│   DatabaseWrapper            │
├──────────────────────────────┤
│  - prepare(sql)              │  Prepared statements
│  - exec(sql)                 │  Execute SQL
│  - transaction(fn)           │  ACID transactions
│  - getThemeIndex()           │  In-memory theme map
│  - getBlockedPuzzles()       │  Cached blocked IDs
└──────────────────────────────┘
```

**In-Memory Theme Index**
- Loaded at startup from database
- `Map<theme, Array<puzzleIds>>`
- Used for fast theme lookups
- Updated on puzzle block
- ~500MB memory for 3.5M puzzles

### Database Migrations

```
001_add_source_field.js           → Add source, game_url
002_add_exercise_tables.js        → Create exercises tables
003_add_puzzle_results.js         → Track puzzle attempts
004_add_users_auth.js             → Add users, auth
005_add_puzzle_hints.js           → Add hint field
006_add_is_final_flag.js          → Add is_final flag
007_add_lessons_platform.js       → courses, lessons, lesson_content, course_assignments, lesson_progress, student_gamification
008_add_puzzle_composer_fields.js → puzzle_instruction, puzzle_hints, puzzle_video_url on lesson_content
009_add_puzzle_challenges_field.js → puzzle_challenges (JSON array) on lesson_content
```

Run automatically on startup:
```javascript
// In index.js
await runMigrations()
```

### Authentication Flow

```
1. User login (POST /api/auth/login)
   │
   ├─ Username/password → bcrypt verify
   │
   ├─ Check user.role
   │
   └─ Generate tokens:
      - access: JWT { userId, role } expires 15m
      - refresh: JWT { userId, role } expires 7d

2. Client stores tokens in localStorage

3. All requests include: Authorization: Bearer <access_token>

4. On 401: Use refresh token to get new access token

5. Logout: Client clears localStorage
```

### PDF Generation

```javascript
// pdfkit-based generation
class PdfGenerator {
  generateExercise(exercise, puzzles) {
    // Create PDF document
    // Add header (name, date)
    // For each puzzle:
    //   - Render board (Chessground → canvas → PDF)
    //   - Add puzzle info (rating, themes)
    //   - Add solution
    // Return buffer
  }

  generateGradesheet(exercise, studentResults) {
    // Create PDF with:
    //   - Student names
    //   - Scores
    //   - Comments
    // Return buffer
  }
}
```

## Data Flow Examples

### Puzzle Generation Flow

```
User: Select backRankMate, count=10
   │
   ▼
POST /api/puzzles/generate
{ theme: 'backRankMate', count: 10 }
   │
   ▼
[Server] puzzles.js route handler
   │
   ▼
PuzzleService.generatePuzzles()
   │
   ├─ DatabaseGenerator.generate(theme, count)
   │  └─ In-memory theme index: get all backRankMate puzzles
   │  └─ Fisher-Yates shuffle, take 10
   │  └─ Filter by rating range
   │
   ├─ Format response
   │
   └─ Return 10 puzzles
      │
      ▼
   Client receives:
   {
     success: true,
     data: [
       { fen, moves: ['e2e4', ...], rating, themes },
       ...
     ]
   }
```

### Exercise Assignment Flow

```
Teacher: Create exercise, assign to 5 students
   │
   ▼
POST /api/exercises
{ name, puzzleIds: [p1, p2, ...] }
   │
   ▼
ExerciseService.create()
   │
   └─ Save to DB (exercise table)
   │
   ▼
POST /api/exercises/{id}/assign
{ studentIds: [s1, s2, s3, s4, s5] }
   │
   ▼
ExerciseService.assignToStudents()
   │
   └─ Create 5 rows in student_exercises table
      (each: student_id, exercise_id, status='assigned')
   │
   ▼
Teacher dashboard: Exercise assigned to 5 students
   │
   ▼
Students see exercise in dashboard
   │
   ▼
Student clicks exercise → PuzzlePlayer
   │
   ├─ Load puzzles for exercise
   │
   ├─ Student solves each puzzle
   │  └─ Record result (correct/incorrect/partial)
   │  └─ Record time spent, attempts
   │
   └─ Submit exercise → status='submitted'
      │
      ▼
Teacher: Grade submission
   │
   ├─ Review student's moves
   ├─ Adjust score if needed
   ├─ Add comments
   │
   └─ POST /api/student-exercises/{id}/grade
      { score: 85, comments: '...' }
      │
      ▼
Database: Update student_exercises
         status='graded', score=85, graded_at=now
         │
         ▼
Student sees grade in dashboard
```

### Puzzle Challenges Flow (Lessons Platform)

```
Admin: Open lesson-content-editor → click "Add Puzzle"
   │
   ▼
puzzle-composer.js (full-screen overlay)
   │
   ├─ Admin sets up board position (FEN), moves (UCI)
   ├─ Per-move: assign hint text + role (student | computer)
   ├─ Optional: puzzle_instruction, puzzle_video_url
   ├─ "Add Another" → appends to local challenges array
   │
   ▼
Save: POST /api/lesson-content (or PUT /:id)
{ content_type: 'puzzle', puzzle_challenges: [...] }
   │
   ▼
CourseRepository.createContent / updateContent
   │
   ├─ Column allowlist validation (prevents injecting unknown columns)
   ├─ JSON serialization: puzzle_challenges → TEXT
   └─ Stored in lesson_content.puzzle_challenges
   │
   ▼
Student: lesson-player.js loads lesson content
   │
   ├─ content_type === 'puzzle' → mount lesson-puzzle-player.js
   ├─ Deserialize puzzle_challenges JSON
   ├─ For each challenge in sequence:
   │  ├─ Render board at puzzle_fen
   │  ├─ Student moves → validated against puzzle_moves
   │  ├─ Per-move hints shown if student struggles
   │  └─ Computer auto-plays opponent moves
   │
   ├─ ALL challenges solved → POST /api/lesson-content/:id/complete
   │  └─ lesson_progress row: completed=1, xp_earned
   │
   └─ Gamification: student_gamification.total_xp += xp_reward
```

**puzzle_challenges JSON schema (per challenge):**
```json
{
  "puzzle_fen": "rnbqkbnr/...",
  "puzzle_moves": "e2e4 e7e5",
  "puzzle_instruction": "Find the best move for White",
  "puzzle_hints": [
    { "move": "e2e4", "hint": "Control the center", "role": "student" },
    { "move": "e7e5", "hint": "Black mirrors the pawn", "role": "computer" }
  ],
  "puzzle_video_url": "https://...",
  "xp_reward": 10
}
```

### Reporting Flow

```
Student: "This puzzle has wrong solution"
   │
   ▼
POST /api/reports/submit
{ puzzleId, reason: 'wrongSolution', notes: '...' }
   │
   ▼
PuzzleReportManager.submitReport()
   │
   ├─ Create puzzle_reports row
   └─ Increment report count in cache
   │
   ▼
Teacher: View reports (AdminPanel)
   │
   ├─ GET /api/reports/list
   │
   ├─ See: Puzzle, reason, notes, student
   │
   └─ Options:
      ├─ Dismiss (PATCH /api/reports/dismiss)
      │  └─ Set dismissed=true
      │
      └─ Block puzzle (POST /api/puzzles/block)
         └─ Add to puzzle_modifications table
         └─ Update in-memory blocked cache
         └─ Excluded from future generation
```

## Performance Architecture

### Puzzle Generation Performance

**Goal**: <2 seconds for 50 puzzles

**How achieved:**
1. **In-memory theme index** - Pre-compute theme→puzzles mapping at startup
   - 3.5M puzzles indexed in ~500MB RAM
   - O(1) theme lookup instead of O(n) database scan
2. **Fisher-Yates sampling** - O(n) random selection without shuffling entire set
3. **SQLite indices** - Rating, themes columns indexed for fast filtering
4. **Connection pooling** - Reuse database connections

**Result**: 10-puzzle generation = <200ms

### Query Optimization

| Query | Index | Time |
|-------|-------|------|
| Find by theme | In-memory map | <1ms |
| Filter by rating | rating index | <10ms |
| Get user | username index | <5ms |
| List exercises | exercise_id | <10ms |

### Caching Strategy

| Cache | Type | TTL | Size |
|-------|------|-----|------|
| Theme index | In-memory | Startup | ~500MB |
| Blocked puzzles | In-memory Set | Startup | ~10MB |
| Theme stats | In-memory | 1 hour | ~1MB |
| User session | JWT token | 15m | N/A (stateless) |

## Scaling Considerations

### Current Limits

- **Database**: ~1.5GB (3.5M puzzles) on single server
- **Memory**: ~500MB for theme index on single server
- **Concurrent users**: ~10-20 (limited by server CPU/memory)
- **Requests/sec**: ~100-200 (limited by better-sqlite3 write concurrency)

### Scaling Path (Future)

1. **Read-only replicas** - Distribute puzzle queries
2. **Redis cache** - Cache theme stats, frequently accessed exercises
3. **Query result caching** - Cache generated puzzle sets
4. **Database sharding** - Split puzzles by rating range
5. **API gateway** - Load balance across multiple servers
6. **CDN** - Static assets (Chessground, CSS)

### Not Needed Yet

- PostgreSQL (SQLite sufficient)
- Kubernetes (single server)
- Message queues (synchronous generation acceptable)
- GraphQL (REST sufficient)

## Security Architecture

### Authentication

```
JWT Token = Header.Payload.Signature

Header: { alg: 'HS256', typ: 'JWT' }
Payload: { userId, role, iat, exp }
Signature: HMAC-SHA256(Header.Payload, secret)
```

- Tokens signed with JWT_SECRET (from env)
- Verified on every request
- Expired after 15m (access) or 7d (refresh)

### Authorization

```
Route guards check user.role:
- requireAdmin: user.role === 'admin'
- requireStudent: user.role === 'student'
```

### Input Validation

```
All API inputs validated with Zod schemas:
- Type checking
- String length bounds
- Number range checks
- Array length limits
- Custom validators (valid FEN, valid UCI moves)
```

### Database Security

```
All queries use parameterized statements:
- Prevents SQL injection
- better-sqlite3 prepared statements
```

### Error Handling

```
Errors don't expose sensitive info:
- User-friendly messages to client
- Stack traces only in server logs
- No database error messages
```

## Deployment Architecture

### Current

```
Single server:
├─ Node.js runtime
├─ Client (SPA files, Vite build)
├─ Server (Hono API)
└─ SQLite database
```

### Recommended (Future)

```
Docker + Container Orchestration:
├─ Client image (nginx + static assets)
├─ Server image (Node.js + Hono)
├─ Database (SQLite volume or PostgreSQL)
└─ Reverse proxy (Nginx)
```

See [Deployment Guide](./deployment-guide.md) for setup.
