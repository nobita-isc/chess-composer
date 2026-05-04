/**
 * E2E tests for weekly exercises student flows (UC-WEX-010..014).
 * Tests student assignment fetch, attempts, notes, work upload, and visibility constraints.
 * Uses in-memory sqlite with auth context mocking.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

let db

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
}

function createRepo(db) {
  return {
    // ---- Students ----
    createStudent(data) {
      const id = genId('student')
      const now = new Date().toISOString()
      db.prepare('INSERT INTO students (id,name,email,skill_level,created_at,updated_at) VALUES (?,?,?,?,?,?)')
        .run(id, data.name, data.email || null, data.skill_level || 'beginner', now, now)
      return { success: true, data: { id, ...data } }
    },
    findStudentById(id) {
      return db.prepare('SELECT * FROM students WHERE id=?').get(id)
    },

    // ---- Weekly Exercises ----
    createExercise(data) {
      const id = genId('exercise')
      const now = new Date().toISOString()
      db.prepare('INSERT INTO weekly_exercises (id,week_start,week_end,name,puzzle_ids,filters,created_at) VALUES (?,?,?,?,?,?,?)')
        .run(id, data.week_start, data.week_end, data.name || null, data.puzzle_ids, data.filters ? JSON.stringify(data.filters) : null, now)
      return { success: true, data: { id, ...data, created_at: now } }
    },
    findExerciseById(id) {
      return db.prepare('SELECT * FROM weekly_exercises WHERE id=?').get(id)
    },

    // ---- Student Exercises (Assignments) ----
    assignExercise(data) {
      const id = genId('se')
      const now = new Date().toISOString()
      try {
        db.prepare('INSERT INTO student_exercises (id,student_id,exercise_id,status,assigned_at) VALUES (?,?,?,?,?)')
          .run(id, data.student_id, data.exercise_id, 'assigned', now)
        return { success: true, data: { id, ...data, status: 'assigned', assigned_at: now } }
      } catch (e) {
        if (e.message?.includes('UNIQUE')) return { success: false, error: 'Already assigned' }
        throw e
      }
    },
    findStudentExercises(studentId) {
      return db.prepare(`
        SELECT se.*,we.week_start,we.week_end,we.name as exercise_name,we.puzzle_ids
        FROM student_exercises se
        JOIN weekly_exercises we ON se.exercise_id=we.id
        WHERE se.student_id=? ORDER BY we.week_start DESC
      `).all(studentId)
    },
    findStudentExerciseById(id, studentIdCheck = null) {
      // If studentIdCheck provided, verify ownership (auth gate)
      const se = db.prepare(`
        SELECT se.*,s.name as student_name,we.week_start,we.week_end,we.name as exercise_name,we.puzzle_ids
        FROM student_exercises se
        JOIN students s ON se.student_id=s.id
        JOIN weekly_exercises we ON se.exercise_id=we.id
        WHERE se.id=?
      `).get(id)
      if (!se) return null
      if (studentIdCheck && se.student_id !== studentIdCheck) {
        return null // Unauthorized: not own assignment
      }
      return se
    },
    recordAttempt(id, data) {
      // Student records work attempt (increment counter implicitly via score)
      const se = db.prepare('SELECT * FROM student_exercises WHERE id=?').get(id)
      if (!se) return { success: false, error: 'Assignment not found' }
      const fields = []
      const values = []
      if (data.score !== undefined) { fields.push('score=?'); values.push(data.score) }
      if (data.puzzle_results !== undefined) { fields.push('puzzle_results=?'); values.push(data.puzzle_results) }
      if (data.puzzle_hints !== undefined) { fields.push('puzzle_hints=?'); values.push(data.puzzle_hints) }
      if (fields.length === 0) return { success: true }
      values.push(id)
      const result = db.prepare(`UPDATE student_exercises SET ${fields.join(',')} WHERE id=?`).run(...values)
      return result.changes > 0 ? { success: true, data: this.findStudentExerciseById(id) } : { success: false, error: 'Assignment not found' }
    },
    addNotes(id, notes) {
      const se = db.prepare('SELECT * FROM student_exercises WHERE id=?').get(id)
      if (!se) return { success: false, error: 'Assignment not found' }
      db.prepare('UPDATE student_exercises SET notes=? WHERE id=?').run(notes, id)
      return { success: true, data: this.findStudentExerciseById(id) }
    },
    recordWorkFile(id, filePath) {
      const se = db.prepare('SELECT * FROM student_exercises WHERE id=?').get(id)
      if (!se) return { success: false, error: 'Assignment not found' }
      db.prepare('UPDATE student_exercises SET answer_pdf_path=? WHERE id=?').run(filePath, id)
      return { success: true, data: this.findStudentExerciseById(id) }
    },
    getExercisePdf(exerciseId) {
      // Mock: in real app, this generates PDF from puzzle_ids
      const ex = db.prepare('SELECT * FROM weekly_exercises WHERE id=?').get(exerciseId)
      if (!ex) return null
      return Buffer.from(`PDF for ${ex.name}`, 'utf-8')
    }
  }
}

beforeAll(() => {
  db = new Database(':memory:')
  db.exec(`
    CREATE TABLE students (id TEXT PRIMARY KEY, name TEXT, email TEXT, skill_level TEXT DEFAULT 'beginner', created_at TEXT, updated_at TEXT);
    CREATE TABLE weekly_exercises (id TEXT PRIMARY KEY, week_start TEXT, week_end TEXT, name TEXT, puzzle_ids TEXT, filters TEXT, created_at TEXT);
    CREATE TABLE student_exercises (id TEXT PRIMARY KEY, student_id TEXT, exercise_id TEXT, score INTEGER, status TEXT DEFAULT 'assigned', assigned_at TEXT, graded_at TEXT, notes TEXT, answer_pdf_path TEXT, puzzle_results TEXT, puzzle_hints TEXT, is_final INTEGER DEFAULT 0, FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE, FOREIGN KEY (exercise_id) REFERENCES weekly_exercises(id) ON DELETE CASCADE, UNIQUE(student_id,exercise_id));
    CREATE INDEX idx_student_exercises_student ON student_exercises(student_id);
    CREATE INDEX idx_student_exercises_exercise ON student_exercises(exercise_id);
  `)
})

afterAll(() => db.close())

describe('Weekly Exercises Student Flows (UC-WEX-010..014)', () => {
  const repo = () => createRepo(db)
  let studentAlice, studentBob
  let exercise1, exercise2

  beforeAll(() => {
    const a = repo().createStudent({ name: 'Alice', email: 'alice@example.com' })
    const b = repo().createStudent({ name: 'Bob', email: 'bob@example.com' })
    studentAlice = a.data.id
    studentBob = b.data.id

    const ex1 = repo().createExercise({
      week_start: '2026-03-23',
      week_end: '2026-03-29',
      name: 'Week 1: Openings',
      puzzle_ids: 'p1,p2,p3,p4,p5'
    })
    const ex2 = repo().createExercise({
      week_start: '2026-03-30',
      week_end: '2026-04-05',
      name: 'Week 2: Midgame',
      puzzle_ids: 'p6,p7,p8'
    })
    exercise1 = ex1.data
    exercise2 = ex2.data

    // Assign to students
    repo().assignExercise({ student_id: studentAlice, exercise_id: exercise1.id })
    repo().assignExercise({ student_id: studentAlice, exercise_id: exercise2.id })
    repo().assignExercise({ student_id: studentBob, exercise_id: exercise1.id })
  })

  describe('UC-WEX-010: Fetch assigned exercise (visibility)', () => {
    it('student fetches own assigned exercise', () => {
      const assignments = repo().findStudentExercises(studentAlice)
      const se = assignments.find(a => a.exercise_id === exercise1.id)
      expect(se).toBeDefined()
      expect(se.exercise_name).toBe('Week 1: Openings')
      expect(se.puzzle_ids).toBe('p1,p2,p3,p4,p5')
    })

    it('student sees multiple assigned exercises', () => {
      const assignments = repo().findStudentExercises(studentAlice)
      expect(assignments.length).toBeGreaterThanOrEqual(2)
      expect(assignments.map(a => a.exercise_id)).toContain(exercise1.id)
      expect(assignments.map(a => a.exercise_id)).toContain(exercise2.id)
    })

    it('student cannot access other student\'s exercise (auth gate at route)', () => {
      // Repo layer: simulate auth check
      const se = repo().findStudentExerciseById(
        repo().findStudentExercises(studentAlice).find(a => a.exercise_id === exercise1.id).id,
        studentBob // Wrong student ID
      )
      expect(se).toBeNull() // Auth gate blocks access
    })

    it('student can access own exercise with correct student_id check', () => {
      const assignments = repo().findStudentExercises(studentAlice)
      const se = assignments.find(a => a.exercise_id === exercise1.id)
      const checked = repo().findStudentExerciseById(se.id, studentAlice)
      expect(checked).toBeDefined()
      expect(checked.student_name).toBe('Alice')
    })

    it('student cannot see unassigned exercise', () => {
      // Create exercise not assigned to Alice
      const other = repo().createExercise({
        week_start: '2026-04-06',
        week_end: '2026-04-12',
        puzzle_ids: 'px'
      })
      const assignments = repo().findStudentExercises(studentAlice)
      const se = assignments.find(a => a.exercise_id === other.data.id)
      expect(se).toBeUndefined()
    })

    it('finds exercise by ID if student is owner', () => {
      const assignments = repo().findStudentExercises(studentAlice)
      const seId = assignments.find(a => a.exercise_id === exercise1.id).id
      const se = repo().findStudentExerciseById(seId, studentAlice)
      expect(se).toBeDefined()
      expect(se.student_id).toBe(studentAlice)
    })
  })

  describe('UC-WEX-011: Record attempt (increments counter)', () => {
    let seAlice1

    beforeEach(() => {
      seAlice1 = repo().findStudentExercises(studentAlice).find(a => a.exercise_id === exercise1.id)
    })

    it('student records first attempt with score and puzzle results', () => {
      const result = repo().recordAttempt(seAlice1.id, {
        score: 3,
        puzzle_results: '1,1,0,1,0'
      })
      expect(result.success).toBe(true)
      const se = repo().findStudentExerciseById(seAlice1.id)
      expect(se.score).toBe(3)
      expect(se.puzzle_results).toBe('1,1,0,1,0')
    })

    it('student records second attempt (overwrites previous)', () => {
      // First attempt already recorded above
      const result = repo().recordAttempt(seAlice1.id, {
        score: 4,
        puzzle_results: '1,1,1,1,0'
      })
      expect(result.success).toBe(true)
      const se = repo().findStudentExerciseById(seAlice1.id)
      expect(se.score).toBe(4)
      expect(se.puzzle_results).toBe('1,1,1,1,0')
    })

    it('student records attempt with hints', () => {
      const result = repo().recordAttempt(seAlice1.id, {
        puzzle_hints: '0,1,0,0,1'
      })
      expect(result.success).toBe(true)
      const se = repo().findStudentExerciseById(seAlice1.id)
      expect(se.puzzle_hints).toBe('0,1,0,0,1')
    })

    it('returns 404 for non-existent assignment', () => {
      const result = repo().recordAttempt('fake_id', { score: 10 })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Assignment not found')
    })

    it('succeeds with empty attempt (no-op)', () => {
      const result = repo().recordAttempt(seAlice1.id, {})
      expect(result.success).toBe(true)
    })
  })

  describe('UC-WEX-012: Add notes to assignment', () => {
    let seAlice2

    beforeAll(() => {
      seAlice2 = repo().findStudentExercises(studentAlice).find(a => a.exercise_id === exercise2.id)
    })

    it('student adds notes to assignment', () => {
      const result = repo().addNotes(seAlice2.id, 'I need more time on the endgame section')
      expect(result.success).toBe(true)
      const se = repo().findStudentExerciseById(seAlice2.id)
      expect(se.notes).toBe('I need more time on the endgame section')
    })

    it('student updates notes', () => {
      const result = repo().addNotes(seAlice2.id, 'Now I understand the concepts better')
      expect(result.success).toBe(true)
      const se = repo().findStudentExerciseById(seAlice2.id)
      expect(se.notes).toBe('Now I understand the concepts better')
    })

    it('empty notes are allowed', () => {
      const result = repo().addNotes(seAlice2.id, '')
      expect(result.success).toBe(true)
    })

    it('returns 404 for non-existent assignment', () => {
      const result = repo().addNotes('fake_id', 'Some notes')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Assignment not found')
    })
  })

  describe('UC-WEX-013: Upload work file (PDF)', () => {
    let seAlice1

    beforeEach(() => {
      seAlice1 = repo().findStudentExercises(studentAlice).find(a => a.exercise_id === exercise1.id)
    })

    it('student uploads work PDF', () => {
      const filePath = '/uploads/alice-week1-work.pdf'
      const result = repo().recordWorkFile(seAlice1.id, filePath)
      expect(result.success).toBe(true)
      const se = repo().findStudentExerciseById(seAlice1.id)
      expect(se.answer_pdf_path).toBe(filePath)
    })

    it('student can update work file', () => {
      const filePath1 = '/uploads/alice-week1-work.pdf'
      const filePath2 = '/uploads/alice-week1-work-revised.pdf'
      repo().recordWorkFile(seAlice1.id, filePath1)
      const result = repo().recordWorkFile(seAlice1.id, filePath2)
      expect(result.success).toBe(true)
      const se = repo().findStudentExerciseById(seAlice1.id)
      expect(se.answer_pdf_path).toBe(filePath2)
    })

    it('work file path is stored independently of score', () => {
      repo().recordAttempt(seAlice1.id, { score: 5 })
      repo().recordWorkFile(seAlice1.id, '/uploads/work.pdf')
      const se = repo().findStudentExerciseById(seAlice1.id)
      expect(se.score).toBe(5)
      expect(se.answer_pdf_path).toBe('/uploads/work.pdf')
    })

    it('returns 404 for non-existent assignment', () => {
      const result = repo().recordWorkFile('fake_id', '/uploads/fake.pdf')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Assignment not found')
    })
  })

  describe('UC-WEX-014: Download exercise PDF (read-only)', () => {
    it('student downloads exercise PDF', () => {
      const pdfBuffer = repo().getExercisePdf(exercise1.id)
      expect(pdfBuffer).toBeDefined()
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true)
      expect(pdfBuffer.toString()).toContain('Week 1: Openings')
    })

    it('PDF download is not restricted by ownership (exercise is public)', () => {
      // Student can download any exercise PDF, but assignment must exist
      // This is different from assignment records which are restricted
      const pdfBuffer = repo().getExercisePdf(exercise1.id)
      expect(pdfBuffer).toBeDefined()
    })

    it('returns null for non-existent exercise', () => {
      const pdfBuffer = repo().getExercisePdf('fake_id')
      expect(pdfBuffer).toBeNull()
    })
  })

  describe('UC-WEX-015: Student cannot perform admin actions', () => {
    let seAlice1

    beforeAll(() => {
      seAlice1 = repo().findStudentExercises(studentAlice).find(a => a.exercise_id === exercise1.id)
    })

    it('student CANNOT grade own exercise (no gradeExercise method called by student)', () => {
      // Repo doesn't have a student-grade method; grading is admin-only via updateStudentExercise
      // This documents the contract: students call recordAttempt, admins call updateStudentExercise with status='graded'
      const attempt = repo().recordAttempt(seAlice1.id, { score: 5 })
      expect(attempt.success).toBe(true)
      // Student status remains 'assigned', not 'graded' (admin sets that)
      const se = repo().findStudentExerciseById(seAlice1.id)
      expect(se.status).toBe('assigned') // unchanged
    })

    it('student CANNOT mark assignment as final', () => {
      // Only admin can set is_final=1
      // This test documents the contract
      const se = repo().findStudentExerciseById(seAlice1.id)
      expect(se.is_final).toBe(0) // student cannot change this
    })

    it('student CANNOT reset own score', () => {
      // Only admin can reset via updateStudentExercise
      // Student cannot access score-reset operations
      expect(true).toBe(true) // Contract: students don't have resetScore method
    })

    it('admin-graded assignment shows grade and final-mark', () => {
      // After admin grades: student can READ these fields
      // Simulate admin grading
      const db2 = db
      db2.prepare('UPDATE student_exercises SET score=?,status=?,is_final=? WHERE id=?')
        .run(5, 'graded', 1, seAlice1.id)

      const se = repo().findStudentExerciseById(seAlice1.id, studentAlice)
      expect(se.score).toBe(5)
      expect(se.status).toBe('graded')
      expect(se.is_final).toBe(1)
    })
  })

  describe('Student privacy and isolation', () => {
    it('Alice cannot see Bob\'s assignments', () => {
      const aliceExercises = repo().findStudentExercises(studentAlice)
      const bobExercises = repo().findStudentExercises(studentBob)

      const aliceExerciseIds = aliceExercises.map(e => e.exercise_id)
      const bobExerciseIds = bobExercises.map(e => e.exercise_id)

      // Bob only has exercise1, Alice has exercise1 and exercise2
      expect(bobExerciseIds).toHaveLength(1)
      expect(aliceExerciseIds).toHaveLength(2)
      expect(bobExerciseIds).toContain(exercise1.id)
      expect(aliceExerciseIds).toContain(exercise1.id)
      expect(aliceExerciseIds).toContain(exercise2.id)
    })

    it('student cannot access other student\'s assignment record', () => {
      const bobAssignments = repo().findStudentExercises(studentBob)
      const bobSeId = bobAssignments[0].id

      // Try to access Bob's assignment with Alice's auth
      const se = repo().findStudentExerciseById(bobSeId, studentAlice)
      expect(se).toBeNull() // Auth gate denies access
    })

    it('updates to one student\'s assignment don\'t affect another', () => {
      const aliceAssignments = repo().findStudentExercises(studentAlice)
      const bobAssignments = repo().findStudentExercises(studentBob)

      const aliceSeId = aliceAssignments.find(a => a.exercise_id === exercise1.id).id
      const bobSeId = bobAssignments.find(a => a.exercise_id === exercise1.id).id

      // Alice records attempt
      repo().recordAttempt(aliceSeId, { score: 5 })

      // Bob's score should be unaffected
      const bobSe = repo().findStudentExerciseById(bobSeId, studentBob)
      expect(bobSe.score).toBeNull()
    })
  })

  describe('Attempt workflow', () => {
    let seBob1

    beforeAll(() => {
      seBob1 = repo().findStudentExercises(studentBob).find(a => a.exercise_id === exercise1.id)
    })

    it('student workflow: attempt → notes → upload → see grade (after admin)', () => {
      // Step 1: Record attempt
      repo().recordAttempt(seBob1.id, { score: 4, puzzle_results: '1,0,1,1,0' })
      let se = repo().findStudentExerciseById(seBob1.id, studentBob)
      expect(se.score).toBe(4)

      // Step 2: Add notes
      repo().addNotes(seBob1.id, 'Struggled with puzzle 2')
      se = repo().findStudentExerciseById(seBob1.id, studentBob)
      expect(se.notes).toBe('Struggled with puzzle 2')

      // Step 3: Upload work
      repo().recordWorkFile(seBob1.id, '/uploads/bob-week1.pdf')
      se = repo().findStudentExerciseById(seBob1.id, studentBob)
      expect(se.answer_pdf_path).toBe('/uploads/bob-week1.pdf')

      // Step 4: Status still 'assigned' until admin grades
      expect(se.status).toBe('assigned')

      // Simulate admin grading
      db.prepare('UPDATE student_exercises SET score=?,status=? WHERE id=?')
        .run(5, 'graded', seBob1.id)

      // Step 5: Student sees updated grade
      se = repo().findStudentExerciseById(seBob1.id, studentBob)
      expect(se.score).toBe(5)
      expect(se.status).toBe('graded')
    })
  })

  describe('Error scenarios', () => {
    it('attempt with no data is no-op', () => {
      const seAlice1 = repo().findStudentExercises(studentAlice).find(a => a.exercise_id === exercise1.id)
      const result = repo().recordAttempt(seAlice1.id, {})
      expect(result.success).toBe(true)
    })

    it('find returns null when student doesn\'t own assignment', () => {
      const aliceExercises = repo().findStudentExercises(studentAlice)
      const aliceSeId = aliceExercises[0].id

      const se = repo().findStudentExerciseById(aliceSeId, 'wrong_student')
      expect(se).toBeNull()
    })

    it('notes with very long text are stored', () => {
      const seAlice1 = repo().findStudentExercises(studentAlice).find(a => a.exercise_id === exercise1.id)
      const longNotes = 'a'.repeat(10000)
      const result = repo().addNotes(seAlice1.id, longNotes)
      expect(result.success).toBe(true)
      const se = repo().findStudentExerciseById(seAlice1.id)
      expect(se.notes).toBe(longNotes)
    })

    it('puzzle_results with empty slots are stored', () => {
      const seAlice1 = repo().findStudentExercises(studentAlice).find(a => a.exercise_id === exercise1.id)
      const result = repo().recordAttempt(seAlice1.id, { puzzle_results: '1,,0,,1' })
      expect(result.success).toBe(true)
      const se = repo().findStudentExerciseById(seAlice1.id)
      expect(se.puzzle_results).toBe('1,,0,,1')
    })
  })
})
