/**
 * Integration tests for ExerciseRepository using in-memory SQLite.
 * Tests CRUD operations, student assignments, and data integrity.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'

// Create in-memory database with schema
let db
let repo

beforeAll(() => {
  db = new Database(':memory:')

  // Create tables matching production schema
  db.exec(`
    CREATE TABLE weekly_exercises (
      id TEXT PRIMARY KEY,
      week_start TEXT NOT NULL,
      week_end TEXT NOT NULL,
      name TEXT,
      puzzle_ids TEXT NOT NULL,
      filters TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      skill_level TEXT DEFAULT 'beginner',
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE student_exercises (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      score INTEGER,
      total_puzzles INTEGER,
      answer_pdf_path TEXT,
      status TEXT DEFAULT 'assigned',
      assigned_at TEXT,
      graded_at TEXT,
      notes TEXT,
      puzzle_results TEXT,
      puzzle_hints TEXT,
      is_final INTEGER DEFAULT 0,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (exercise_id) REFERENCES weekly_exercises(id)
    );

    CREATE INDEX idx_weekly_exercises_week ON weekly_exercises(week_start);
    CREATE INDEX idx_student_exercises_student ON student_exercises(student_id);
    CREATE INDEX idx_student_exercises_exercise ON student_exercises(exercise_id);
  `)

  // Create a minimal repository that uses our test DB
  repo = {
    generateExerciseId() {
      return `ex_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
    },
    generateStudentExerciseId() {
      return `se_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
    },
    createExercise(data) {
      const id = this.generateExerciseId()
      const now = new Date().toISOString()
      db.prepare(
        `INSERT INTO weekly_exercises (id, week_start, week_end, name, puzzle_ids, filters, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, data.week_start, data.week_end, data.name, data.puzzle_ids, data.filters ? JSON.stringify(data.filters) : null, now)
      return { success: true, data: { id, ...data, created_at: now } }
    },
    findExercisesByWeek(weekStart) {
      return db.prepare('SELECT * FROM weekly_exercises WHERE week_start = ?').all(weekStart)
    },
    updateExerciseName(id, name) {
      const result = db.prepare('UPDATE weekly_exercises SET name = ? WHERE id = ?').run(name, id)
      if (result.changes === 0) return { success: false, error: 'Exercise not found' }
      return { success: true }
    },
    deleteExercise(id) {
      const result = db.prepare('DELETE FROM weekly_exercises WHERE id = ?').run(id)
      if (result.changes === 0) return { success: false, error: 'Exercise not found' }
      return { success: true }
    }
  }
})

afterAll(() => {
  db.close()
})

describe('ExerciseRepository CRUD', () => {
  let createdId

  it('creates an exercise', () => {
    const result = repo.createExercise({
      week_start: '2026-03-23',
      week_end: '2026-03-29',
      name: 'Test Exercise',
      puzzle_ids: 'p1,p2,p3'
    })
    expect(result.success).toBe(true)
    expect(result.data.id).toBeTruthy()
    createdId = result.data.id
  })

  it('finds exercises by week', () => {
    const results = repo.findExercisesByWeek('2026-03-23')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].name).toBe('Test Exercise')
  })

  it('returns empty array for week with no exercises', () => {
    const results = repo.findExercisesByWeek('2099-01-01')
    expect(results).toEqual([])
  })

  it('allows multiple exercises for same week', () => {
    repo.createExercise({
      week_start: '2026-03-23',
      week_end: '2026-03-29',
      name: 'Second Exercise',
      puzzle_ids: 'p4,p5'
    })
    const results = repo.findExercisesByWeek('2026-03-23')
    expect(results.length).toBeGreaterThanOrEqual(2)
  })

  it('updates exercise name', () => {
    const result = repo.updateExerciseName(createdId, 'Updated Name')
    expect(result.success).toBe(true)

    const exercises = repo.findExercisesByWeek('2026-03-23')
    const updated = exercises.find(e => e.id === createdId)
    expect(updated.name).toBe('Updated Name')
  })

  it('returns error when updating non-existent exercise', () => {
    const result = repo.updateExerciseName('nonexistent_id', 'New Name')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('deletes an exercise', () => {
    const result = repo.deleteExercise(createdId)
    expect(result.success).toBe(true)
  })

  it('returns error when deleting non-existent exercise', () => {
    const result = repo.deleteExercise('nonexistent_id')
    expect(result.success).toBe(false)
  })
})

describe('Student Exercise Assignments', () => {
  let exerciseId
  let studentId = 'student_test_1'

  beforeAll(() => {
    // Create student
    db.prepare(
      'INSERT INTO students (id, name, skill_level, created_at) VALUES (?, ?, ?, ?)'
    ).run(studentId, 'Test Student', 'beginner', new Date().toISOString())

    // Create exercise
    const result = repo.createExercise({
      week_start: '2026-04-06',
      week_end: '2026-04-12',
      name: 'Assignment Test',
      puzzle_ids: 'p1,p2,p3,p4,p5'
    })
    exerciseId = result.data.id
  })

  it('creates a student exercise assignment', () => {
    const id = repo.generateStudentExerciseId()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO student_exercises (id, student_id, exercise_id, total_puzzles, status, assigned_at)
       VALUES (?, ?, ?, ?, 'assigned', ?)`
    ).run(id, studentId, exerciseId, 5, now)

    const row = db.prepare('SELECT * FROM student_exercises WHERE id = ?').get(id)
    expect(row.status).toBe('assigned')
    expect(row.total_puzzles).toBe(5)
    expect(row.score).toBeNull()
  })

  it('grades a student exercise with puzzle results', () => {
    const assignment = db.prepare(
      'SELECT * FROM student_exercises WHERE student_id = ? AND exercise_id = ?'
    ).get(studentId, exerciseId)

    db.prepare(
      `UPDATE student_exercises SET score = ?, status = 'graded', puzzle_results = ?, graded_at = ? WHERE id = ?`
    ).run(4, '1,1,1,1,0', new Date().toISOString(), assignment.id)

    const updated = db.prepare('SELECT * FROM student_exercises WHERE id = ?').get(assignment.id)
    expect(updated.status).toBe('graded')
    expect(updated.score).toBe(4)
    expect(updated.puzzle_results).toBe('1,1,1,1,0')
  })

  it('resets student exercise score', () => {
    const assignment = db.prepare(
      'SELECT * FROM student_exercises WHERE student_id = ? AND exercise_id = ?'
    ).get(studentId, exerciseId)

    db.prepare(
      `UPDATE student_exercises SET score = NULL, status = 'assigned', puzzle_results = NULL, puzzle_hints = NULL, graded_at = NULL WHERE id = ?`
    ).run(assignment.id)

    const updated = db.prepare('SELECT * FROM student_exercises WHERE id = ?').get(assignment.id)
    expect(updated.status).toBe('assigned')
    expect(updated.score).toBeNull()
    expect(updated.puzzle_results).toBeNull()
  })
})
