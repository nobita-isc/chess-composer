# Chess Composer - Project Overview & PDR

## Vision

Enable chess teachers to quickly generate themed weekly exercises for students, streamline grading, and provide interactive puzzle-solving experience with real Lichess puzzles.

## Product Overview

**Chess Composer** is a web-based platform that combines:
1. **Lichess puzzle database** (~3.5M puzzles with theme tags)
2. **Teacher workflow** (exercise creation, assignment, grading)
3. **Student interface** (puzzle solving, answer submission)
4. **PDF export** (exercises, gradesheets)

Target users: Chess teachers, coaches, chess programs.

## Problem Statement

- Teachers manually select chess puzzles (time-consuming)
- No centralized way to assign exercises to multiple students
- Difficult to grade interactive puzzle solutions
- Limited puzzle variety (manually curated)
- No tracking of student progress

## Solution

Platform that:
- Generates puzzles by theme/rating in seconds
- Assigns exercises to student groups with one click
- Provides interactive puzzle-solving interface
- Tracks puzzle results and calculates grades
- Exports exercises and gradesheets as PDFs

## Core Features

### 1. Puzzle Generation
**Functional Requirements:**
- Select from 90+ Lichess themes (backRankMate, smotheredMate, etc.)
- Filter by rating range (1200-3000)
- Generate 5-50 puzzles in seconds
- Display FEN, moves (UCI), rating, popularity
- Show mate-in-N for tactical puzzles

**Non-functional:**
- Generate 50 puzzles in <2 seconds
- Support concurrent requests (5+ simultaneous teachers)
- Fallback to cached puzzles if database unavailable

### 2. Exercise Management
**Functional Requirements:**
- Create weekly exercises (set of puzzles)
- Name, describe, set date range
- CRUD operations (create, read, update, delete)
- Export exercise as PDF (printable, web-viewable)
- Assign to student groups

**Non-functional:**
- PDF generation <5 seconds
- Support 100+ student assignments per exercise
- Archive old exercises automatically

### 3. Student Assignment & Grading
**Functional Requirements:**
- Assign exercise to individual/group of students
- Student solves puzzles interactively (move on board)
- Submit answer (moves attempted, time spent)
- Teacher grades submission (0-100 score, comments)
- Calculate statistics (% correct, avg rating, trends)

**Non-functional:**
- Grade 50 submissions in <5 minutes
- Support 1000s of concurrent students

### 4. Puzzle Solving Interface
**Functional Requirements:**
- Interactive chessboard (Chessground)
- Display puzzle FEN, move validation (chess.js)
- Show solution when requested
- Track attempts, time spent
- Accept/reject player moves with feedback

**Non-functional:**
- Fluid board interaction (<100ms response)
- Mobile responsive (tablet/phone)

### 5. Admin Features
**Functional Requirements:**
- Manage users (create, edit, delete)
- View system reports (puzzles used, student stats)
- Report problematic puzzles
- Block/modify puzzles (prevent reuse)
- Review puzzle quality reports from students

**Non-functional:**
- Support 10,000+ users
- Handle high-volume reporting (100s of reports/week)

## Technical Constraints

| Constraint | Rationale |
|----------|-----------|
| SQLite (not PostgreSQL) | Simple deployment, no external DB |
| Vanilla JS (no React) | Lightweight, no build complexity |
| JWT tokens (not sessions) | Stateless, scalable |
| CSV→SQLite build pipeline | Offline Lichess integration, no API rate limits |
| ~3.5M puzzle limit | Storage on single server (~2GB) |
| better-sqlite3 (sync) | Simpler error handling, in-memory theme index |

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Puzzle generation time | <2s for 50 puzzles | ✅ <1s |
| PDF export time | <5s | ✅ <2s |
| Theme coverage | 90+ Lichess themes | ✅ 90+ |
| Database size | <2GB | ✅ ~1.5GB (3.5M puzzles) |
| Concurrent users | 5+ simultaneous | ✅ ~10 (limited by server resources) |
| Mobile responsive | Works on tablets/phones | ✅ Full mobile support |
| System uptime | 99% during school hours | ✅ In production |

## Security Requirements

| Requirement | Implementation |
|------------|-----------------|
| Authentication | JWT (access 15min, refresh 7d) |
| Authorization | Role-based (admin/student) |
| Password security | bcrypt (10 rounds) |
| Input validation | Zod schemas on all API inputs |
| SQL injection | Parameterized queries (better-sqlite3) |
| XSS prevention | No eval(), sanitized HTML |
| Rate limiting | Per-user/IP limits on sensitive endpoints |
| Error handling | User-friendly messages, no stack traces |

## Data Requirements

### Input Data
- **Lichess CSV** (~1.1GB, ~3.5M puzzles)
  - PuzzleId, FEN, Moves (UCI), Rating, Themes, Popularity, GameUrl
  - Downloaded separately (not in repo)
  - Preprocessed into SQLite with indices

### Output Data
- **Student exercises** (PDFs)
- **Gradesheets** (PDFs)
- **Reports** (puzzle quality feedback)
- **Blocked puzzles** (in-memory cache + DB)

## Integration Points

| System | Integration | Status |
|--------|-----------|--------|
| Lichess | CSV database download | ✅ Manual, build pipeline |
| Chess.js | Move validation, FEN parsing | ✅ Npm package |
| Chessground | Board UI | ✅ Npm package |
| pdfkit | PDF generation | ✅ Npm package |
| bcrypt | Password hashing | ✅ Npm package |
| better-sqlite3 | Database | ✅ Npm package |

## Acceptance Criteria

### Teacher Workflow
- [ ] Can login with admin credentials
- [ ] Can generate 10 puzzles by theme in <2 seconds
- [ ] Can create weekly exercise with selected puzzles
- [ ] Can assign exercise to 1+ students
- [ ] Can export exercise as PDF
- [ ] Can grade student submissions
- [ ] Can view student statistics

### Student Workflow
- [ ] Can login with student credentials
- [ ] Can see assigned exercises
- [ ] Can solve puzzles with move validation
- [ ] Can submit answers
- [ ] Can view grade and feedback

### System Requirements
- [ ] 0 SQL injection vulnerabilities
- [ ] 0 XSS vulnerabilities
- [ ] All API responses in standard format
- [ ] All errors have user-friendly messages
- [ ] Database backed up before schema changes
- [ ] <100ms response on most endpoints

## Development Roadmap

| Phase | Status | Deliverables |
|-------|--------|--------------|
| **1. Foundation** | ✅ Complete | Vite setup, chess.js, Chessground |
| **2. Database** | ✅ Complete | SQLite, 3.5M Lichess puzzles, theme index |
| **3. Core features** | ✅ Complete | Puzzle generation, exercises, grading |
| **4. Auth & admin** | ✅ Complete | JWT, user management, reporting |
| **5. Polish** | ✅ Complete | PDF export, modals, error handling |
| **6. Performance** | 🚧 In progress | Caching, query optimization |
| **7. Deployment** | 📋 Planned | Docker setup, CI/CD |

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Lichess database too large | Low | Medium | Use SQLite indices, in-memory theme cache |
| Slow puzzle generation | Low | Medium | Pre-compute theme index on startup |
| Database corruption | Low | High | Migrations, backups, WAL mode |
| Poor PDF rendering | Low | Low | Use pdfkit (tested) |
| High concurrent users | Medium | Medium | Add server pooling, read replicas |
| Theme tag changes | Low | Low | Version control CSV format |

## Future Enhancements

1. **Performance**
   - Redis caching layer
   - Query result caching
   - Horizontal scaling (multiple servers)

2. **Features**
   - Spaced repetition scheduling
   - AI hint generation
   - Puzzle difficulty prediction
   - Integration with chess.com

3. **Analytics**
   - Student performance dashboards
   - Puzzle difficulty calibration
   - Cohort analysis
   - Long-term progress tracking

4. **Mobile**
   - Native iOS/Android apps
   - Offline puzzle pack downloads
   - Push notifications for assignments

## Dependencies

| Dependency | Version | Purpose | Status |
|-----------|---------|---------|--------|
| chess.js | 1.0.0-beta.8 | Move validation | ✅ Used |
| Chessground | 9.2.1 | Board rendering | ✅ Used |
| Hono | 4.6.18 | API framework | ✅ Used |
| better-sqlite3 | 11.0.0 | Database | ✅ Used |
| pdfkit | 0.15.0 | PDF generation | ✅ Used |
| bcrypt | 6.0.0 | Password hashing | ✅ Used |
| jsonwebtoken | 9.0.3 | JWT tokens | ✅ Used |
| Vite | 5.4.11 | Build tool | ✅ Used |

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-03-23 | 1.0.0 | Initial release |
| - | 1.1.0 | Planned: Performance optimizations |
| - | 2.0.0 | Planned: Mobile apps, AI features |
