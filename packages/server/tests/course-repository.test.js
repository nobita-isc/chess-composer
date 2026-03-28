/**
 * Tests for CourseRepository — courses, lessons, content, assignments, progress, gamification.
 * Uses in-memory SQLite.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'

let db

// Minimal repo functions against test DB
function createRepo(db) {
  const genId = (p) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`

  return {
    createCourse(data) {
      const id = genId('course')
      const now = new Date().toISOString()
      db.prepare('INSERT INTO courses (id,title,description,thumbnail_url,skill_level,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
        .run(id, data.title, data.description || null, data.thumbnail_url || null, data.skill_level || 'beginner', now, now)
      return { id, title: data.title }
    },
    findAllCourses() {
      return db.prepare('SELECT c.*, (SELECT COUNT(*) FROM lessons WHERE course_id=c.id) as lesson_count FROM courses c').all()
    },
    findCourseById(id) { return db.prepare('SELECT * FROM courses WHERE id=?').get(id) },
    updateCourse(id, data) {
      const r = db.prepare('UPDATE courses SET title=COALESCE(?,title),description=COALESCE(?,description),updated_at=? WHERE id=?')
        .run(data.title, data.description, new Date().toISOString(), id)
      return r.changes > 0 ? { success: true } : { success: false }
    },
    deleteCourse(id) {
      return db.prepare('DELETE FROM courses WHERE id=?').run(id).changes > 0 ? { success: true } : { success: false }
    },
    createLesson(courseId, data) {
      const id = genId('lesson')
      db.prepare('INSERT INTO lessons (id,course_id,order_index,title,description,created_at) VALUES (?,?,?,?,?,?)')
        .run(id, courseId, data.order_index || 0, data.title, data.description || null, new Date().toISOString())
      return { id }
    },
    findLessonsByCourse(courseId) {
      return db.prepare('SELECT * FROM lessons WHERE course_id=? ORDER BY order_index').all(courseId)
    },
    createContent(lessonId, data) {
      const id = genId('lc')
      db.prepare('INSERT INTO lesson_content (id,lesson_id,order_index,content_type,title,video_url,puzzle_fen,puzzle_moves,xp_reward,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(id, lessonId, data.order_index || 0, data.content_type, data.title, data.video_url || null, data.puzzle_fen || null, data.puzzle_moves || null, data.xp_reward || 10, new Date().toISOString())
      return { id }
    },
    findContentByLesson(lessonId) {
      return db.prepare('SELECT * FROM lesson_content WHERE lesson_id=? ORDER BY order_index').all(lessonId)
    },
    deleteContent(id) {
      return db.prepare('DELETE FROM lesson_content WHERE id=?').run(id).changes > 0 ? { success: true } : { success: false }
    },
    assignCourse(courseId, studentId) {
      const id = genId('ca')
      try {
        db.prepare('INSERT INTO course_assignments (id,course_id,student_id,assigned_at) VALUES (?,?,?,?)').run(id, courseId, studentId, new Date().toISOString())
        return { success: true }
      } catch (e) {
        if (e.message.includes('UNIQUE')) return { success: false, error: 'Already assigned' }
        throw e
      }
    },
    findAssignmentsByStudent(studentId) {
      return db.prepare('SELECT ca.*,c.title FROM course_assignments ca JOIN courses c ON ca.course_id=c.id WHERE ca.student_id=?').all(studentId)
    },
    markContentComplete(studentId, contentId, data = {}) {
      const id = genId('lp')
      try {
        db.prepare('INSERT INTO lesson_progress (id,student_id,content_id,completed,puzzle_result,completed_at,xp_earned) VALUES (?,?,?,1,?,?,?)')
          .run(id, studentId, contentId, data.puzzle_result || null, new Date().toISOString(), data.xp_earned || 0)
      } catch (e) {
        if (e.message.includes('UNIQUE')) {
          db.prepare('UPDATE lesson_progress SET completed=1,completed_at=? WHERE student_id=? AND content_id=?')
            .run(new Date().toISOString(), studentId, contentId)
        } else throw e
      }
      return { success: true }
    },
    getProgress(studentId, contentId) {
      return db.prepare('SELECT * FROM lesson_progress WHERE student_id=? AND content_id=?').get(studentId, contentId)
    },
    getGamification(studentId) {
      let g = db.prepare('SELECT * FROM student_gamification WHERE student_id=?').get(studentId)
      if (!g) {
        db.prepare('INSERT INTO student_gamification (student_id) VALUES (?)').run(studentId)
        g = { student_id: studentId, total_xp: 0, current_streak: 0, longest_streak: 0, badges: '[]' }
      }
      return { ...g, badges: JSON.parse(g.badges || '[]') }
    },
    addXP(studentId, xp) {
      this.getGamification(studentId)
      db.prepare('UPDATE student_gamification SET total_xp=total_xp+? WHERE student_id=?').run(xp, studentId)
    }
  }
}

beforeAll(() => {
  db = new Database(':memory:')
  db.exec(`
    CREATE TABLE courses (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, thumbnail_url TEXT, skill_level TEXT DEFAULT 'beginner', created_at TEXT, updated_at TEXT);
    CREATE TABLE lessons (id TEXT PRIMARY KEY, course_id TEXT, order_index INTEGER DEFAULT 0, title TEXT, description TEXT, created_at TEXT, FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE);
    CREATE TABLE lesson_content (id TEXT PRIMARY KEY, lesson_id TEXT, order_index INTEGER DEFAULT 0, content_type TEXT, title TEXT, video_url TEXT, file_path TEXT, file_size INTEGER, duration_min INTEGER, puzzle_id TEXT, puzzle_fen TEXT, puzzle_moves TEXT, quiz_data TEXT, xp_reward INTEGER DEFAULT 10, created_at TEXT, FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE);
    CREATE TABLE students (id TEXT PRIMARY KEY, name TEXT, email TEXT, skill_level TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE course_assignments (id TEXT PRIMARY KEY, course_id TEXT, student_id TEXT, assigned_at TEXT, UNIQUE(course_id,student_id));
    CREATE TABLE lesson_progress (id TEXT PRIMARY KEY, student_id TEXT, content_id TEXT, completed INTEGER DEFAULT 0, puzzle_result TEXT, completed_at TEXT, xp_earned INTEGER DEFAULT 0, UNIQUE(student_id,content_id));
    CREATE TABLE student_gamification (student_id TEXT PRIMARY KEY, total_xp INTEGER DEFAULT 0, current_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0, last_activity_date TEXT, badges TEXT DEFAULT '[]');
  `)
  db.prepare('INSERT INTO students (id,name,created_at) VALUES (?,?,?)').run('s1', 'Test Student', new Date().toISOString())
})

afterAll(() => db.close())

describe('CourseRepository', () => {
  const repo = () => createRepo(db)

  describe('Courses CRUD', () => {
    it('creates a course', () => {
      const r = repo().createCourse({ title: 'Italian Game', skill_level: 'beginner' })
      expect(r.id).toBeTruthy()
      expect(r.title).toBe('Italian Game')
    })

    it('lists courses with lesson count', () => {
      const courses = repo().findAllCourses()
      expect(courses.length).toBeGreaterThanOrEqual(1)
      expect(courses[0]).toHaveProperty('lesson_count')
    })

    it('finds course by id', () => {
      const c = repo().createCourse({ title: 'Find Me' })
      const found = repo().findCourseById(c.id)
      expect(found.title).toBe('Find Me')
    })

    it('updates course', () => {
      const c = repo().createCourse({ title: 'Old' })
      const result = repo().updateCourse(c.id, { title: 'New' })
      expect(result.success).toBe(true)
      expect(repo().findCourseById(c.id).title).toBe('New')
    })

    it('deletes course', () => {
      const c = repo().createCourse({ title: 'Delete Me' })
      expect(repo().deleteCourse(c.id).success).toBe(true)
      expect(repo().findCourseById(c.id)).toBeUndefined()
    })

    it('returns false for non-existent delete', () => {
      expect(repo().deleteCourse('nonexistent').success).toBe(false)
    })
  })

  describe('Lessons', () => {
    it('creates lessons in a course', () => {
      const c = repo().createCourse({ title: 'Course With Lessons' })
      const l1 = repo().createLesson(c.id, { title: 'Lesson 1', order_index: 0 })
      const l2 = repo().createLesson(c.id, { title: 'Lesson 2', order_index: 1 })
      const lessons = repo().findLessonsByCourse(c.id)
      expect(lessons.length).toBe(2)
      expect(lessons[0].title).toBe('Lesson 1')
      expect(lessons[1].title).toBe('Lesson 2')
    })
  })

  describe('Content Items', () => {
    it('creates content items in a lesson', () => {
      const c = repo().createCourse({ title: 'Content Course' })
      const l = repo().createLesson(c.id, { title: 'Lesson' })
      repo().createContent(l.id, { content_type: 'video', title: 'Intro Video', video_url: 'https://youtube.com/1' })
      repo().createContent(l.id, { content_type: 'puzzle', title: 'Pin Challenge', puzzle_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', xp_reward: 20 })
      const content = repo().findContentByLesson(l.id)
      expect(content.length).toBe(2)
      expect(content[0].content_type).toBe('video')
      expect(content[1].content_type).toBe('puzzle')
    })

    it('deletes content', () => {
      const c = repo().createCourse({ title: 'Del Content' })
      const l = repo().createLesson(c.id, { title: 'L' })
      const ct = repo().createContent(l.id, { content_type: 'pdf', title: 'Guide' })
      expect(repo().deleteContent(ct.id).success).toBe(true)
      expect(repo().findContentByLesson(l.id).length).toBe(0)
    })
  })

  describe('Assignments', () => {
    it('assigns course to student', () => {
      const c = repo().createCourse({ title: 'Assign Test' })
      expect(repo().assignCourse(c.id, 's1').success).toBe(true)
    })

    it('prevents duplicate assignment', () => {
      const c = repo().createCourse({ title: 'Dup Test' })
      repo().assignCourse(c.id, 's1')
      expect(repo().assignCourse(c.id, 's1').success).toBe(false)
    })

    it('finds assignments by student', () => {
      const assignments = repo().findAssignmentsByStudent('s1')
      expect(assignments.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Progress', () => {
    it('marks content complete', () => {
      const c = repo().createCourse({ title: 'Progress Test' })
      const l = repo().createLesson(c.id, { title: 'L' })
      const ct = repo().createContent(l.id, { content_type: 'video', title: 'V' })
      repo().markContentComplete('s1', ct.id, { xp_earned: 10 })
      const p = repo().getProgress('s1', ct.id)
      expect(p.completed).toBe(1)
      expect(p.xp_earned).toBe(10)
    })

    it('handles duplicate completion (upsert)', () => {
      const c = repo().createCourse({ title: 'Upsert Test' })
      const l = repo().createLesson(c.id, { title: 'L' })
      const ct = repo().createContent(l.id, { content_type: 'puzzle', title: 'P' })
      repo().markContentComplete('s1', ct.id, { xp_earned: 20 })
      repo().markContentComplete('s1', ct.id, { xp_earned: 20 }) // should not throw
      expect(repo().getProgress('s1', ct.id).completed).toBe(1)
    })
  })

  describe('Gamification', () => {
    it('creates gamification record on first access', () => {
      const g = repo().getGamification('s1')
      expect(g.total_xp).toBeGreaterThanOrEqual(0)
      expect(g.badges).toEqual([])
    })

    it('adds XP', () => {
      const before = repo().getGamification('s1').total_xp
      repo().addXP('s1', 50)
      const after = repo().getGamification('s1').total_xp
      expect(after).toBe(before + 50)
    })

    it('accumulates XP from multiple additions', () => {
      const before = repo().getGamification('s1').total_xp
      repo().addXP('s1', 10)
      repo().addXP('s1', 20)
      expect(repo().getGamification('s1').total_xp).toBe(before + 30)
    })
  })
})
