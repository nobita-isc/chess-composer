# Chess Lessons Platform

**Goal:** Online learning platform for chess openings with video lessons, puzzle challenges, progress tracking, and gamification. Lessons are assigned to specific students by the teacher.

**Reference:** chess.com openings lessons (see `designs/screencapture-chess-lessons*.pdf`)

**Design:** `designs/new.pen` (to be created)

## Concept

### Course Structure
```
Course (e.g., "Learn Every Chess Opening")
  └── Lesson 1: "Learn The Italian Game"
       ├── Video segment (YouTube embed, 30 min)
       ├── Challenge 1: Puzzle to solve
       ├── Challenge 2: Puzzle to solve
       └── ... (10 challenges per lesson)
  └── Lesson 2: "Learn The Two Knights Defense"
       ├── Video segment
       └── Challenges
  └── ...
```

### User Roles
- **Admin/Teacher**: Create courses, add lessons (video URL + puzzles), assign to students
- **Student**: Browse assigned courses, watch videos, solve puzzles, track progress

### Gamification
- **XP Points**: Earn XP for each completed video (10 XP) and solved puzzle (20 XP)
- **Streak Counter**: Consecutive days of activity
- **Lesson Badges**: Earn badge per completed lesson (all puzzles solved)
- **Course Completion**: Certificate/trophy for finishing a full course
- **Progress Bar**: Visual progress per course and per lesson
- **Leaderboard**: Optional ranking among assigned students

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | Database Schema + API | Pending | Large |
| 2 | Admin: Course & Lesson Management | Pending | Large |
| 3 | Student: Course Browser & Player | Pending | Large |
| 4 | Gamification System | Pending | Medium |
| 5 | Visual Design (Pencil) | Pending | Medium |

## Database Schema

### New Tables

#### `courses`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | course_xxxxx |
| title | TEXT | "Learn Every Chess Opening" |
| description | TEXT | Course overview |
| thumbnail_url | TEXT | Cover image URL |
| skill_level | TEXT | beginner/intermediate/advanced |
| total_lessons | INTEGER | Count |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

#### `lessons`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | lesson_xxxxx |
| course_id | TEXT FK | Parent course |
| order_index | INTEGER | Position in course |
| title | TEXT | "Learn The Italian Game" |
| description | TEXT | Lesson overview |
| video_url | TEXT | YouTube/embed URL |
| video_duration_min | INTEGER | Duration in minutes |
| puzzle_ids | TEXT | Comma-separated puzzle IDs |
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
| lesson_id | TEXT FK | Lesson |
| video_watched | INTEGER | 0/1 boolean |
| puzzle_results | TEXT | "1,0,1,1,,..." comma-separated |
| puzzles_completed | INTEGER | Count solved |
| total_puzzles | INTEGER | Total in lesson |
| completed_at | TEXT | When lesson fully completed |
| xp_earned | INTEGER | XP from this lesson |

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

### Admin
- `POST /api/courses` — Create course
- `PUT /api/courses/:id` — Update course
- `DELETE /api/courses/:id` — Delete course
- `POST /api/courses/:id/lessons` — Add lesson to course
- `PUT /api/lessons/:id` — Update lesson
- `DELETE /api/lessons/:id` — Delete lesson
- `POST /api/courses/:id/assign` — Assign course to students
- `GET /api/courses` — List all courses (admin sees all)
- `GET /api/courses/:id` — Get course with lessons

### Student
- `GET /api/my/courses` — List assigned courses with progress
- `GET /api/my/courses/:id` — Get course detail with lesson progress
- `PUT /api/my/lessons/:id/progress` — Save lesson progress (video watched, puzzle results)
- `GET /api/my/gamification` — Get XP, streak, badges

## Screens (to design in Pencil)

### Admin Screens
1. **Course List** — Table of courses with lesson count, assigned students
2. **Create/Edit Course** — Form: title, description, skill level, thumbnail
3. **Lesson Manager** — Add/reorder lessons within a course, set video URL + select puzzles
4. **Assign Course** — Select students to assign

### Student Screens
1. **My Courses** — Grid of assigned courses with progress bars
2. **Course Detail** — Lesson list with completion status (like chess.com screenshot)
3. **Lesson Player** — Video player + puzzle challenges below
4. **Gamification Dashboard** — XP, streak, badges, leaderboard

## Gamification Details

### XP System
| Action | XP |
|--------|-----|
| Watch video | 10 |
| Solve puzzle (correct) | 20 |
| Solve puzzle (with hint) | 10 |
| Complete lesson (all puzzles) | 50 bonus |
| Complete course | 200 bonus |

### Streak
- +1 for each day with any lesson activity
- Reset to 0 if a day is missed
- Show fire emoji and count in student nav

### Badges
- Per-lesson completion badge (opening name)
- "First Course" badge
- "Perfect Score" badge (all puzzles correct in a lesson)
- "7-Day Streak" badge
- "30-Day Streak" badge

## Technical Considerations
- Video: YouTube embed (iframe) — no self-hosting needed
- Puzzles: reuse existing puzzle infrastructure (FEN + UCI moves)
- Progress: saved via API, also cached in IndexedDB (offline support from PWA)
- Migration: new SQLite migration file for all new tables
- Security: students can only see assigned courses
