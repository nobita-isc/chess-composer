# Chess Lessons Platform

**Goal:** Online learning platform for chess openings with video lessons, puzzle challenges, progress tracking, and gamification. Lessons are assigned to specific students by the teacher.

**Reference:** chess.com openings lessons, Coursera lesson player
**Design:** `designs/new.pen` (12 screens)

## Concept

### Course Structure
```
Course (e.g., "Learn Every Chess Opening")
  └── Lesson 1: "Learn The Italian Game"
       ├── Content Item: Video (YouTube URL or uploaded MP4)
       ├── Content Item: PDF study guide (uploaded)
       ├── Content Item: Puzzle challenge (from FEN / screenshot / DB)
       ├── Content Item: Quiz (multiple choice)
       └── ... (ordered, draggable)
  └── Lesson 2: ...
```

### User Roles
- **Admin/Teacher**: Create courses, compose lessons (video/PDF/puzzle/quiz), assign to students, preview as student
- **Student**: Browse assigned courses, watch videos, solve puzzles, track progress

### Gamification
- **XP Points**: Earn XP for completed content items
- **Streak Counter**: Consecutive days of activity
- **Lesson Badges**: Per completed lesson
- **Course Completion**: Trophy for finishing full course
- **Progress Bars**: Per course and per lesson

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | Database Schema + Migration | ✅ Done | Medium |
| 2 | API Endpoints | ✅ Done | Medium |
| 3 | Admin: Course Management UI | ✅ Done | Large |
| 4 | Admin: Lesson Editor + Content Composer | ✅ Done | Large |
| 5 | Student: Course Browser + Lesson Player | ✅ Done | Large |
| 6 | Gamification System | ✅ Done | Medium |

## Database Schema

### New Tables

#### `courses`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | course_xxxxx |
| title | TEXT | Course title |
| description | TEXT | Course overview |
| thumbnail_url | TEXT | Cover image path/URL |
| skill_level | TEXT | beginner/intermediate/advanced |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

#### `lessons`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | lesson_xxxxx |
| course_id | TEXT FK | Parent course |
| order_index | INTEGER | Position in course |
| title | TEXT | Lesson title |
| description | TEXT | Lesson overview |
| created_at | TEXT | ISO timestamp |

#### `lesson_content`
Ordered content items within a lesson (video, PDF, puzzle, quiz).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | lc_xxxxx |
| lesson_id | TEXT FK | Parent lesson |
| order_index | INTEGER | Position in lesson |
| content_type | TEXT | video/pdf/puzzle/quiz |
| title | TEXT | Display title |
| video_url | TEXT | YouTube/Vimeo URL (video type) |
| file_path | TEXT | Uploaded file path (video/pdf type) |
| file_size | INTEGER | File size in bytes |
| duration_min | INTEGER | Video duration (video type) |
| puzzle_id | TEXT | Reference to puzzles table (puzzle type) |
| puzzle_fen | TEXT | Custom FEN (puzzle type, if not from DB) |
| puzzle_moves | TEXT | Solution moves UCI (puzzle type) |
| quiz_data | TEXT | JSON quiz questions (quiz type) |
| xp_reward | INTEGER | XP earned on completion |
| created_at | TEXT | ISO timestamp |

#### `course_assignments`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | ca_xxxxx |
| course_id | TEXT FK | Assigned course |
| student_id | TEXT FK | Assigned student |
| assigned_at | TEXT | ISO timestamp |

#### `lesson_progress`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | lp_xxxxx |
| student_id | TEXT FK | Student |
| content_id | TEXT FK | lesson_content item |
| completed | INTEGER | 0/1 boolean |
| puzzle_result | TEXT | 1=correct, 0=wrong (puzzle type) |
| completed_at | TEXT | Completion timestamp |
| xp_earned | INTEGER | XP from this item |

#### `student_gamification`
| Column | Type | Description |
|--------|------|-------------|
| student_id | TEXT PK | Student |
| total_xp | INTEGER | Lifetime XP |
| current_streak | INTEGER | Days streak |
| longest_streak | INTEGER | Best streak |
| last_activity_date | TEXT | YYYY-MM-DD |
| badges | TEXT | JSON array of earned badges |

## API Endpoints

### Admin — Courses
- `GET /api/courses` — List all courses with lesson count
- `POST /api/courses` — Create course (title, description, skill_level, thumbnail)
- `PUT /api/courses/:id` — Update course
- `DELETE /api/courses/:id` — Delete course + cascade
- `POST /api/courses/:id/assign` — Assign to students
- `GET /api/courses/:id/preview` — Preview as student (admin only)

### Admin — Lessons
- `GET /api/courses/:id/lessons` — List lessons in course
- `POST /api/courses/:id/lessons` — Add lesson
- `PUT /api/lessons/:id` — Update lesson (title, description, order)
- `DELETE /api/lessons/:id` — Delete lesson

### Admin — Lesson Content
- `GET /api/lessons/:id/content` — List content items
- `POST /api/lessons/:id/content` — Add content item
- `PUT /api/content/:id` — Update content item
- `DELETE /api/content/:id` — Delete content item
- `PUT /api/lessons/:id/reorder` — Reorder content items
- `POST /api/content/upload` — Upload video/PDF file

### Admin — Puzzle Import
- `POST /api/puzzles/from-fen` — Create puzzle from FEN + solution
- `POST /api/puzzles/from-screenshot` — Claude vision → FEN (future)
- `GET /api/puzzles/search` — Search DB by theme/rating

### Student
- `GET /api/my/courses` — List assigned courses with progress
- `GET /api/my/courses/:id` — Course detail with lesson progress
- `GET /api/my/lessons/:id` — Lesson with content items + progress
- `PUT /api/my/content/:id/complete` — Mark content item complete
- `GET /api/my/gamification` — Get XP, streak, badges

## Screens (designed in `designs/new.pen`)

### Admin Screens
1. **Course Management** — Full page with sidebar, course table (Edit/Lessons/Assign actions)
2. **Create Course Dialog** — Title, description, skill level, thumbnail upload
3. **Lesson Manager** — Draggable lesson list with add/edit/delete
4. **Lesson Editor** — Draggable content blocks (VIDEO/PDF/PUZZLE/QUIZ) + AI assist
5. **Upload Content Dialog** — Two tabs:
   - Upload File (primary): drag-drop for MP4/PDF/PNG/JPG, max 100MB
   - Video URL: paste YouTube/Vimeo with preview
6. **Puzzle Import Dialog** — Three tabs:
   - From FEN (primary): FEN input, board preview, solution moves, title, rating
   - From Screenshot: paste image → Claude generates FEN & solution
   - From Database: theme/rating/count filters, generate, checkbox select
7. **Preview as Student** — Admin sees the course as a student would (read-only)

### Student Screens
1. **My Courses** — Grid of course cards with thumbnail images, progress bars, XP/streak/badges header
2. **Course Detail** — Lesson list with completed (✓ green) / in-progress (● indigo) / locked (🔒 gray)
3. **Lesson Player** — Coursera-style:
   - Left sidebar: sequential content items with completion status
   - Right main area: video player OR puzzle viewer OR PDF viewer OR quiz
   - "Mark Complete & Next →" button
   - XP badge per completion

### Sidebar Navigation
- **Admin**: Generate | Exercises | **Courses** (new) | Reports | Users
- **Student**: My Exercises | **Courses** (new) | Performance (green sidebar)

## Gamification

### XP System
| Action | XP |
|--------|-----|
| Watch video | 10 |
| Read PDF | 5 |
| Solve puzzle (correct) | 20 |
| Solve puzzle (with hint) | 10 |
| Complete quiz | 15 |
| Complete lesson (all items) | 50 bonus |
| Complete course | 200 bonus |

### Streak
- +1 for each day with any lesson activity
- Reset to 0 if a day is missed
- 🔥 emoji + count in student header

### Badges
- Per-lesson completion (opening name badge)
- "First Course" — complete any course
- "Perfect Score" — all puzzles correct in a lesson
- "7-Day Streak" / "30-Day Streak"

## Technical Considerations
- **Video**: YouTube embed (iframe) for URL; uploaded MP4 served from `/uploads/courses/`
- **PDF**: Uploaded to `/uploads/courses/`, rendered in iframe or PDF.js
- **Puzzles**: Reuse existing puzzle infrastructure (FEN + UCI moves + Chessground)
- **Quiz**: JSON structure `[{question, options[], correctIndex}]`
- **File Upload**: Multer middleware, max 100MB, MP4/PDF/PNG/JPG
- **Progress**: Saved via API, cached in IndexedDB (PWA offline support)
- **Preview Mode**: Admin opens student view in read-only mode (no progress saved)
- **Migration**: New SQLite migration file for all 6 tables
- **Security**: Students can only see assigned courses; admin role required for CRUD
- **Claude Code Integration**: AI assist for lesson composition + screenshot-to-FEN puzzle import
