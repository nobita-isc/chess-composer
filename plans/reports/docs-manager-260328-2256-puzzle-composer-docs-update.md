# Docs Update: Puzzle Composer Redesign + Lessons Platform

**Date**: 2026-03-28 | **Branch**: feature/chess-lessons-platform

## Changes Made

### `/docs/codebase-summary.md` (366 → 488 LOC)
- Added `src/lessons/` to client and server directory trees
- Added **Lessons Module** section (6 files, 2,067 LOC) with descriptions of all 6 lesson files
- Documented `puzzle_challenges` architecture inline
- Updated migrations count: 6 → 9; listed migrations 007–009
- Updated routes count: 8 → 11; added courses.js and lesson-content.js
- Added lessons platform tables to DB schema (courses, lessons, lesson_content, course_assignments, lesson_progress, student_gamification)
- Added new lesson_content columns: puzzle_instruction, puzzle_hints, puzzle_video_url, puzzle_challenges (with migration refs)
- Added `CourseRepository` to Services & Repositories section
- Added column allowlist to Key Design Patterns table
- Rewrote Recent Changes section to lead with lessons platform + puzzle composer

### `/docs/system-architecture.md` (658 → 726 LOC)
- Updated DB diagram to include courses/lessons/lesson_content
- Added 6 lessons module files to Key Modules table
- Updated Route Modules table: 8 → 11 entries (added courses.js, lesson-content.js)
- Updated migrations table: 6 → 9 entries
- Added **Puzzle Challenges Flow** data flow section with full call path and JSON schema

### `/docs/project-roadmap.md` (368 → 364 LOC)
- Updated phase summary: Phase 6 → Complete, added Phase 6b (Lessons Platform) → Complete
- Rewrote "Latest Updates" to reflect puzzle composer + lessons platform
- Converted Phase 6 section from In Progress to Complete
- Added full Phase 6b section with all deliverables and key architecture decision note
- Updated dependency tree and timeline summary
- Cleared "Blocked By" on Phase 7

### `/docs/code-standards.md` (716 → 759 LOC)
- Added `src/lessons/` to both client and server directory structure
- Updated routes comment: 8 → 11 modules
- Added **Column Allowlist Pattern** section with correct/wrong examples (from CourseRepository.updateContent)
- Updated "Last refactored" note

## Verification
- All 4 files under 800 LOC (488, 726, 364, 759)
- All new content cross-referenced against actual source files (migrations, CourseRepository.js, lessons/*.js)
- puzzle_challenges JSON schema documented from migration 009 + CourseRepository column handling

## Unresolved Questions
- None
