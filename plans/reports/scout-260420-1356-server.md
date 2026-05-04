# Server Package Scout — April 18, 2026

## 1. Directory Tree (src, one level deep)

```
src/
├── index.js                    [entry point, migrations, middleware, routes]
├── auth/
│   └── AuthService.js         [JWT login, token refresh, verification]
├── database/
│   ├── SqliteDatabase.js      [query wrapper, db abstraction]
│   ├── DatabaseLoader.js      [loader logic]
│   ├── DatabaseGenerator.js   [puzzle generation, theme filtering]
│   └── migrations/            [11 migration files, see section 3]
├── middleware/
│   ├── authMiddleware.js      [JWT extraction: Bearer header + query token]
│   └── roleMiddleware.js      [role-based access control]
├── routes/                    [11 route files, see section 2]
├── auth/users/
│   ├── UserService.js         [user CRUD, password hashing]
│   ├── UserRepository.js      [user DB queries]
├── puzzles/
│   ├── PuzzleRepository.js    [puzzle queries]
│   ├── PuzzleCreationService.js [custom puzzle creation, ID generation]
│   └── validation/PuzzleValidator.js
├── exercises/                 [4 files]
│   ├── ExerciseRepository.js  [weekly exercise DB ops]
│   ├── ExerciseService.js     [create, grade, assign, PDF export]
│   ├── PdfGenerator.js        [exercise PDF export]
│   └── ThemeAnalyticsService.js [per-theme accuracy]
├── lessons/
│   └── CourseRepository.js    [courses, lessons, content, assignments, progress]
├── students/
│   └── StudentRepository.js   [student CRUD, exercise queries]
├── reports/
│   └── PuzzleReportManager.js [puzzle reporting, blocking]
├── shared/
│   └── MoveConverter.js       [chess notation conversion]
```

## 2. All API Route Files (HTTP method + path)

### auth.js
- POST /api/auth/login
- POST /api/auth/refresh
- GET /api/auth/me (protected)

### puzzles.js
- POST /api/puzzles (create custom)
- GET /api/puzzles/custom/stats
- POST /api/puzzles/generate (with filters: theme, rating, popularity)
- GET /api/puzzles/:id
- PUT /api/puzzles/:id/block
- PUT /api/puzzles/:id/unblock
- PUT /api/puzzles/:id/fen

### students.js
- GET /api/students
- POST /api/students
- GET /api/students/:id
- PUT /api/students/:id
- DELETE /api/students/:id
- GET /api/students/:id/exercises
- GET /api/students/:id/performance
- GET /api/students/:id/theme-analytics (per-theme accuracy)

### exercises.js
- GET /api/exercises
- POST /api/exercises (from puzzle IDs)
- GET /api/exercises/current-week
- GET /api/exercises/:id
- GET /api/exercises/:id/pdf (download)
- PUT /api/exercises/:id (update name, admin only)
- DELETE /api/exercises/:id
- POST /api/exercises/:id/assign (to students)
- GET /api/exercises/:id/assignments

### courses.js
- GET /api/courses
- POST /api/courses (admin)
- GET /api/courses/:id
- PUT /api/courses/:id (admin)
- DELETE /api/courses/:id (admin)
- GET /api/courses/:id/lessons
- POST /api/courses/:id/lessons (admin)
- POST /api/courses/:id/assign (admin, bulk student assignment)
- GET /api/courses/:id/assignments (admin)
- GET /api/courses/:id/preview (admin)

### lesson-content.js (mounts to /api/)
- PUT /api/lessons/:id (admin)
- DELETE /api/lessons/:id (admin)
- GET /api/lessons/:id/content
- POST /api/lessons/:id/content (admin)
- PUT /api/content/:id (admin)
- DELETE /api/content/:id (admin)
- PUT /api/lessons/:id/reorder (admin)
- POST /api/content/upload (admin, file upload)
- GET /api/my/courses (student, assigned courses)
- GET /api/my/courses/:id (student, course view with progress)
- PUT /api/my/content/:id/complete (student, mark done + XP)
- PUT /api/my/content/:id/reset (student)
- GET /api/my/gamification (student, XP/badges)

### student-exercises.js
- GET /api/student-exercises/:id
- PUT /api/student-exercises/:id/grade (grading with score, notes, puzzle results)
- PUT /api/student-exercises/:id/attempt (save attempt, temp score)
- POST /api/student-exercises/:id/upload (PDF answer submission)
- GET /api/student-exercises/:id/download (download submitted PDF)
- PUT /api/student-exercises/:id/notes
- PUT /api/student-exercises/:id/mark-final (admin)
- PUT /api/student-exercises/:id/reset-score (admin)

### themes.js
- GET /api/themes
- GET /api/themes/categories
- GET /api/themes/stats

### users.js (admin only, all routes protected)
- POST /api/users
- GET /api/users
- GET /api/users/:id
- PUT /api/users/:id
- DELETE /api/users/:id

### reports.js
- POST /api/reports (submit report)
- GET /api/reports (with pagination, filter dismissed)
- GET /api/reports/stats
- PUT /api/reports/:id/dismiss
- DELETE /api/reports/:id

### lichess.js
- GET /api/lichess/puzzle/:id (proxy Lichess API)
- GET /api/lichess/daily

## 3. Database Migrations (in order)

1. **001_add_source_field** — adds `source` column to puzzles table
2. **002_add_exercise_tables** — creates `weekly_exercises`, `exercise_puzzles`, `student_exercise_assignments` tables
3. **003_add_puzzle_results** — adds `puzzle_results` column to exercise assignments
4. **004_add_users_auth** — creates `users` table (username, password_hash, role, student_id)
5. **005_add_puzzle_hints** — adds `hints` column to puzzles table
6. **006_add_is_final_flag** — adds `is_final` column to student exercise assignments
7. **007_add_lessons_platform** — creates 6 tables: `courses`, `lessons`, `lesson_content` (video/pdf/puzzle/quiz), `course_assignments`, `lesson_progress`, `student_gamification` [MAJOR]
8. **008_add_puzzle_composer_fields** — adds `puzzle_instruction`, `puzzle_hints` (JSON), `puzzle_video_url` to lesson_content [PUZZLE COMPOSER]
9. **009_add_puzzle_challenges_field** — adds `puzzle_challenges` field
10. **010_add_avg_rating** — adds `avg_rating` to weekly_exercises (cached for performance)
11. **011_add_content_description** — adds `description` (markdown text) column to lesson_content

## 4. Key Modules Added Recently

**lessons/CourseRepository.js** (primary module for content platform):
- Course CRUD: create, find, update, delete
- Lesson management within courses (ordered)
- Content item management (video/pdf/puzzle/quiz) with ordering
- Content metadata: file_path, file_size, video_url, duration_min, puzzle_fen, quiz_data, xp_reward, description (new)
- Course assignments to students
- Lesson progress tracking (completion, puzzle results, XP)
- Gamification: XP totals, streaks, badge system
- Student course progress queries with completion percentages

**exercises/ExerciseService.js** (exercise management):
- Create weekly exercises from puzzle IDs
- Get/list exercises with stats
- Assign exercises to students
- Grade student exercises (score, notes, puzzle-by-puzzle results)
- Save student attempts (temp score before grading)
- PDF export
- Mark as final, reset score

**exercises/ExerciseRepository.js** (data access):
- CRUD for weekly_exercises, exercise_puzzles, student_exercise_assignments
- Student exercise queries with performance stats
- Assignment tracking

**students/StudentRepository.js** (student management):
- CRUD students (name, email, skill_level, notes)
- Find by ID, list all

**exercises/ThemeAnalyticsService.js** (analytics):
- Per-theme accuracy breakdown for individual students
- Aggregates puzzle results by theme

## 5. Auth Middleware

**authMiddleware.js**: `authRequired()` middleware
- Extracts JWT from `Authorization: Bearer <token>` header OR `?token=<query>` param
- Verifies token via `authService.verifyToken()`
- Sets `user` context with: id, username, role, student_id
- Returns 401 if missing or invalid

**roleMiddleware.js**: `requireRole(...roles)` middleware
- Checks `user.role` against allowed roles
- Returns 401 if no user, 403 if insufficient permission
- Used by: /users/* (admin), PUT /exercises/:id (admin), /courses/** (admin), /student-exercises/**/mark-final (admin)

## 6. Server Entry Point (index.js) — Startup Flow

1. **Middleware setup**: logger, CORS (http://localhost:3000, 3000/5173)
2. **Database init**: `databaseGenerator.initialize()` loads puzzle database
3. **Run migrations**: 11 migrations in sequence (001–011) creating all tables
4. **Initialize report manager**: `reportManager.initialize()` for puzzle blocking
5. **Mount public auth routes**: POST /api/auth/login, POST /api/auth/refresh, GET /api/auth/me
6. **Apply auth guard**: `authRequired()` middleware to all /api/* routes
7. **Mount protected routes**:
   - /api/users (UserService)
   - /api/puzzles (puzzle generation, custom creation)
   - /api/themes (theme listing, stats)
   - /api/reports (puzzle reporting, blocking)
   - /api/lichess (Lichess proxy)
   - /api/students (StudentRepository)
   - /api/exercises (ExerciseService)
   - /api/student-exercises (grading, PDF upload)
   - /api/courses (CourseRepository)
   - /api/... (lessonContent routes)
8. **Static file serving**: /uploads/courses/:filename (range request support for video seeking)
9. **Health check**: GET /health
10. **Error handlers**: 404, 500

## 7. Notable Changes — What Wouldn't Be Obvious From File Listing

- **Lessons platform is comprehensive**: Not just a table—CourseRepository handles nested hierarchy (courses → lessons → content items), progress tracking, gamification, XP rewards, badge checking, and student progress aggregation with percentages.
- **Puzzle composer features**: Lesson content puzzles support instruction text, per-move hints (JSON), video explanations, and markdown descriptions. Migration 008 explicitly added these fields.
- **Student exercises are mature**: Separate from courses; support PDF grading workflow, puzzle-by-puzzle result tracking, attempts before final grading, and role-based access (mark-final is admin-only).
- **Performance optimization**: Migration 010 added avg_rating cache on weekly_exercises to avoid recalculating on every query.
- **File handling**: Supports video/PDF uploads with range request seeking, file type validation, size limits (100MB courses, 10MB PDFs), and path traversal prevention.
- **Student gamification**: Full XP system, streak tracking, badge awards with course-scoped checks.
- **Rich content**: lesson_content supports 4 types (video/pdf/puzzle/quiz) with metadata for each; description column (migration 011) enables markdown learning notes per item.
- **Theme analytics**: Dedicated service for per-theme accuracy breakdown per student.

---

**Report Generated**: 2026-04-18 | **Package**: chess_composer/packages/server | **Focus**: Lessons, exercises, content, puzzle composer
