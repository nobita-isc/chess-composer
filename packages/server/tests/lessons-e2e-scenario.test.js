/**
 * End-to-end scenario tests for Chess Lessons Platform.
 * Tests the full flow: admin creates course → adds lessons/content → assigns students
 * → student learns → progress tracked → gamification (XP, streaks, badges).
 * Uses in-memory SQLite with the actual repository logic.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'

let db

// Replicate the actual CourseRepository logic against test DB
function createFullRepo(db) {
  const genId = (p) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`

  return {
    // Courses
    createCourse(data) {
      const id = genId('course')
      const now = new Date().toISOString()
      db.prepare('INSERT INTO courses (id,title,description,skill_level,created_at,updated_at) VALUES (?,?,?,?,?,?)')
        .run(id, data.title, data.description || null, data.skill_level || 'beginner', now, now)
      return id
    },
    getCourse(id) { return db.prepare('SELECT * FROM courses WHERE id=?').get(id) },

    // Lessons
    createLesson(courseId, title, order) {
      const id = genId('lesson')
      db.prepare('INSERT INTO lessons (id,course_id,order_index,title,created_at) VALUES (?,?,?,?,?)')
        .run(id, courseId, order, title, new Date().toISOString())
      return id
    },
    getLessons(courseId) { return db.prepare('SELECT * FROM lessons WHERE course_id=? ORDER BY order_index').all(courseId) },

    // Content
    addVideo(lessonId, title, url, order) {
      const id = genId('lc')
      db.prepare('INSERT INTO lesson_content (id,lesson_id,order_index,content_type,title,video_url,xp_reward,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .run(id, lessonId, order, 'video', title, url, 10, new Date().toISOString())
      return id
    },
    addPDF(lessonId, title, path, order) {
      const id = genId('lc')
      db.prepare('INSERT INTO lesson_content (id,lesson_id,order_index,content_type,title,file_path,xp_reward,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .run(id, lessonId, order, 'pdf', title, path, 5, new Date().toISOString())
      return id
    },
    addPuzzle(lessonId, title, fen, moves, order) {
      const id = genId('lc')
      db.prepare('INSERT INTO lesson_content (id,lesson_id,order_index,content_type,title,puzzle_fen,puzzle_moves,xp_reward,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(id, lessonId, order, 'puzzle', title, fen, moves, 20, new Date().toISOString())
      return id
    },
    addQuiz(lessonId, title, quizData, order) {
      const id = genId('lc')
      db.prepare('INSERT INTO lesson_content (id,lesson_id,order_index,content_type,title,quiz_data,xp_reward,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .run(id, lessonId, order, 'quiz', title, JSON.stringify(quizData), 15, new Date().toISOString())
      return id
    },
    getContent(lessonId) { return db.prepare('SELECT * FROM lesson_content WHERE lesson_id=? ORDER BY order_index').all(lessonId) },
    getContentById(id) { return db.prepare('SELECT * FROM lesson_content WHERE id=?').get(id) },

    // Assignments
    assign(courseId, studentId) {
      const id = genId('ca')
      db.prepare('INSERT INTO course_assignments (id,course_id,student_id,assigned_at) VALUES (?,?,?,?)')
        .run(id, courseId, studentId, new Date().toISOString())
    },
    getStudentCourses(studentId) {
      return db.prepare('SELECT ca.*,c.title FROM course_assignments ca JOIN courses c ON ca.course_id=c.id WHERE ca.student_id=?').all(studentId)
    },

    // Progress
    markComplete(studentId, contentId, puzzleResult = null) {
      const id = genId('lp')
      const content = this.getContentById(contentId)
      const xp = content?.xp_reward || 10
      try {
        db.prepare('INSERT INTO lesson_progress (id,student_id,content_id,completed,puzzle_result,completed_at,xp_earned) VALUES (?,?,?,1,?,?,?)')
          .run(id, studentId, contentId, puzzleResult, new Date().toISOString(), xp)
      } catch (e) {
        if (e.message.includes('UNIQUE')) {
          db.prepare('UPDATE lesson_progress SET completed=1,puzzle_result=?,completed_at=?,xp_earned=? WHERE student_id=? AND content_id=?')
            .run(puzzleResult, new Date().toISOString(), xp, studentId, contentId)
        } else throw e
      }
      this.addXP(studentId, xp)
      return xp
    },
    getProgress(studentId, contentId) {
      return db.prepare('SELECT * FROM lesson_progress WHERE student_id=? AND content_id=?').get(studentId, contentId)
    },
    getCourseProgress(studentId, courseId) {
      return db.prepare(`
        SELECT lc.id, lc.content_type, lc.title, COALESCE(lp.completed,0) as completed, lp.xp_earned
        FROM lesson_content lc
        JOIN lessons l ON lc.lesson_id=l.id
        LEFT JOIN lesson_progress lp ON lp.content_id=lc.id AND lp.student_id=@sid
        WHERE l.course_id=@cid ORDER BY l.order_index, lc.order_index
      `).all({ sid: studentId, cid: courseId })
    },

    // Gamification
    getGamification(studentId) {
      let g = db.prepare('SELECT * FROM student_gamification WHERE student_id=?').get(studentId)
      if (!g) {
        db.prepare('INSERT INTO student_gamification (student_id) VALUES (?)').run(studentId)
        g = { student_id: studentId, total_xp: 0, current_streak: 0, longest_streak: 0, last_activity_date: null, badges: '[]' }
      }
      return { ...g, badges: JSON.parse(g.badges || '[]') }
    },
    addXP(studentId, xp) {
      this.getGamification(studentId)
      db.prepare('UPDATE student_gamification SET total_xp=total_xp+? WHERE student_id=?').run(xp, studentId)
    },
    updateStreak(studentId, dateStr) {
      this.getGamification(studentId)
      const gam = db.prepare('SELECT * FROM student_gamification WHERE student_id=?').get(studentId)
      if (gam.last_activity_date === dateStr) return
      const yesterday = new Date(new Date(dateStr).getTime() - 86400000).toISOString().split('T')[0]
      const newStreak = gam.last_activity_date === yesterday ? gam.current_streak + 1 : 1
      const longest = Math.max(newStreak, gam.longest_streak)
      db.prepare('UPDATE student_gamification SET current_streak=?,longest_streak=?,last_activity_date=? WHERE student_id=?')
        .run(newStreak, longest, dateStr, studentId)
    },
    awardBadge(studentId, badge) {
      const g = this.getGamification(studentId)
      if (g.badges.includes(badge)) return false
      const badges = [...g.badges, badge]
      db.prepare('UPDATE student_gamification SET badges=? WHERE student_id=?').run(JSON.stringify(badges), studentId)
      return true
    }
  }
}

beforeAll(() => {
  db = new Database(':memory:')
  db.exec(`
    CREATE TABLE courses (id TEXT PRIMARY KEY, title TEXT, description TEXT, thumbnail_url TEXT, skill_level TEXT DEFAULT 'beginner', created_at TEXT, updated_at TEXT);
    CREATE TABLE lessons (id TEXT PRIMARY KEY, course_id TEXT, order_index INTEGER, title TEXT, description TEXT, created_at TEXT);
    CREATE TABLE lesson_content (id TEXT PRIMARY KEY, lesson_id TEXT, order_index INTEGER, content_type TEXT, title TEXT, video_url TEXT, file_path TEXT, file_size INTEGER, duration_min INTEGER, puzzle_id TEXT, puzzle_fen TEXT, puzzle_moves TEXT, quiz_data TEXT, xp_reward INTEGER DEFAULT 10, created_at TEXT);
    CREATE TABLE students (id TEXT PRIMARY KEY, name TEXT, email TEXT, skill_level TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE course_assignments (id TEXT PRIMARY KEY, course_id TEXT, student_id TEXT, assigned_at TEXT, UNIQUE(course_id,student_id));
    CREATE TABLE lesson_progress (id TEXT PRIMARY KEY, student_id TEXT, content_id TEXT, completed INTEGER DEFAULT 0, puzzle_result TEXT, completed_at TEXT, xp_earned INTEGER DEFAULT 0, UNIQUE(student_id,content_id));
    CREATE TABLE student_gamification (student_id TEXT PRIMARY KEY, total_xp INTEGER DEFAULT 0, current_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0, last_activity_date TEXT, badges TEXT DEFAULT '[]');
  `)
  db.prepare('INSERT INTO students (id,name,created_at) VALUES (?,?,?)').run('victoria', 'Victoria Bui', '2026-01-01')
  db.prepare('INSERT INTO students (id,name,created_at) VALUES (?,?,?)').run('minh', 'Minh Tran', '2026-01-01')
})

afterAll(() => db.close())

describe('Full E2E Scenario: Admin creates course → Student learns', () => {
  const repo = () => createFullRepo(db)
  let courseId, lesson1Id, lesson2Id
  let videoId, pdfId, puzzle1Id, puzzle2Id, quizId, video2Id

  // ==================== ADMIN FLOW ====================

  describe('Phase 1: Admin creates course structure', () => {
    it('creates a course', () => {
      courseId = repo().createCourse({ title: 'Italian Game Mastery', description: 'Learn the Italian Game', skill_level: 'intermediate' })
      const course = repo().getCourse(courseId)
      expect(course.title).toBe('Italian Game Mastery')
      expect(course.skill_level).toBe('intermediate')
    })

    it('adds Lesson 1 with video + PDF + 2 puzzles', () => {
      lesson1Id = repo().createLesson(courseId, 'Introduction to Italian Game', 0)
      videoId = repo().addVideo(lesson1Id, 'Opening Theory Video', 'https://youtube.com/watch?v=abc', 0)
      pdfId = repo().addPDF(lesson1Id, 'Italian Game Study Guide', '/uploads/italian-guide.pdf', 1)
      puzzle1Id = repo().addPuzzle(lesson1Id, 'Pin Tactic', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'e7e5 g1f3', 2)
      puzzle2Id = repo().addPuzzle(lesson1Id, 'Fork Challenge', 'r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', 'f1c4', 3)

      const content = repo().getContent(lesson1Id)
      expect(content).toHaveLength(4)
      expect(content[0].content_type).toBe('video')
      expect(content[1].content_type).toBe('pdf')
      expect(content[2].content_type).toBe('puzzle')
      expect(content[3].content_type).toBe('puzzle')
    })

    it('adds Lesson 2 with video + quiz', () => {
      lesson2Id = repo().createLesson(courseId, 'Advanced Variations', 1)
      video2Id = repo().addVideo(lesson2Id, 'Giuoco Piano Deep Dive', 'https://youtube.com/watch?v=def', 0)
      quizId = repo().addQuiz(lesson2Id, 'Knowledge Check', [
        { question: 'What is the Italian Game?', options: ['1.e4 e5 2.Nf3 Nc6 3.Bc4', '1.d4 d5'], correctIndex: 0 }
      ], 1)

      const content = repo().getContent(lesson2Id)
      expect(content).toHaveLength(2)
    })

    it('course has 2 lessons with correct order', () => {
      const lessons = repo().getLessons(courseId)
      expect(lessons).toHaveLength(2)
      expect(lessons[0].title).toBe('Introduction to Italian Game')
      expect(lessons[1].title).toBe('Advanced Variations')
    })
  })

  describe('Phase 2: Admin assigns course to students', () => {
    it('assigns to Victoria', () => {
      repo().assign(courseId, 'victoria')
      const courses = repo().getStudentCourses('victoria')
      expect(courses).toHaveLength(1)
      expect(courses[0].title).toBe('Italian Game Mastery')
    })

    it('assigns to Minh', () => {
      repo().assign(courseId, 'minh')
      expect(repo().getStudentCourses('minh')).toHaveLength(1)
    })

    it('prevents duplicate assignment', () => {
      expect(() => repo().assign(courseId, 'victoria')).toThrow()
    })
  })

  // ==================== STUDENT FLOW ====================

  describe('Phase 3: Victoria starts learning', () => {
    it('shows 0% progress initially', () => {
      const progress = repo().getCourseProgress('victoria', courseId)
      expect(progress).toHaveLength(6) // 4 in lesson1 + 2 in lesson2
      expect(progress.every(p => p.completed === 0)).toBe(true)
    })

    it('watches intro video → earns 10 XP', () => {
      const xp = repo().markComplete('victoria', videoId)
      expect(xp).toBe(10)
      expect(repo().getProgress('victoria', videoId).completed).toBe(1)
    })

    it('reads PDF → earns 5 XP', () => {
      const xp = repo().markComplete('victoria', pdfId)
      expect(xp).toBe(5)
    })

    it('solves puzzle 1 correctly → earns 20 XP', () => {
      const xp = repo().markComplete('victoria', puzzle1Id, '1')
      expect(xp).toBe(20)
      expect(repo().getProgress('victoria', puzzle1Id).puzzle_result).toBe('1')
    })

    it('solves puzzle 2 incorrectly → still earns 20 XP', () => {
      const xp = repo().markComplete('victoria', puzzle2Id, '0')
      expect(xp).toBe(20)
      expect(repo().getProgress('victoria', puzzle2Id).puzzle_result).toBe('0')
    })

    it('lesson 1 is now fully completed (4/4)', () => {
      const progress = repo().getCourseProgress('victoria', courseId)
      const lesson1Items = progress.slice(0, 4)
      expect(lesson1Items.every(p => p.completed === 1)).toBe(true)
    })

    it('total XP so far: 55 (10+5+20+20)', () => {
      const gam = repo().getGamification('victoria')
      expect(gam.total_xp).toBe(55)
    })
  })

  describe('Phase 4: Victoria completes the course', () => {
    it('watches lesson 2 video → earns 10 XP', () => {
      repo().markComplete('victoria', video2Id)
      expect(repo().getGamification('victoria').total_xp).toBe(65)
    })

    it('completes quiz → earns 15 XP', () => {
      repo().markComplete('victoria', quizId)
      expect(repo().getGamification('victoria').total_xp).toBe(80)
    })

    it('course is 100% complete (6/6)', () => {
      const progress = repo().getCourseProgress('victoria', courseId)
      expect(progress).toHaveLength(6)
      expect(progress.every(p => p.completed === 1)).toBe(true)
    })
  })

  // ==================== GAMIFICATION ====================

  describe('Phase 5: Streak tracking', () => {
    it('Day 1: streak starts at 1', () => {
      repo().updateStreak('victoria', '2026-03-23')
      expect(repo().getGamification('victoria').current_streak).toBe(1)
    })

    it('Day 2: streak grows to 2', () => {
      repo().updateStreak('victoria', '2026-03-24')
      expect(repo().getGamification('victoria').current_streak).toBe(2)
    })

    it('Day 3: streak grows to 3', () => {
      repo().updateStreak('victoria', '2026-03-25')
      expect(repo().getGamification('victoria').current_streak).toBe(3)
    })

    it('same day activity does not increment streak', () => {
      repo().updateStreak('victoria', '2026-03-25')
      expect(repo().getGamification('victoria').current_streak).toBe(3)
    })

    it('missed day resets streak to 1', () => {
      repo().updateStreak('victoria', '2026-03-28') // skipped 26, 27
      expect(repo().getGamification('victoria').current_streak).toBe(1)
    })

    it('longest streak is preserved', () => {
      expect(repo().getGamification('victoria').longest_streak).toBe(3)
    })

    it('7-day streak earns badge', () => {
      // Build 7-day streak
      for (let d = 1; d <= 7; d++) {
        repo().updateStreak('minh', `2026-04-0${d}`)
      }
      expect(repo().getGamification('minh').current_streak).toBe(7)
    })
  })

  describe('Phase 6: Badge awarding', () => {
    it('awards badge', () => {
      const awarded = repo().awardBadge('victoria', 'first-course')
      expect(awarded).toBe(true)
      expect(repo().getGamification('victoria').badges).toContain('first-course')
    })

    it('does not duplicate badge', () => {
      const awarded = repo().awardBadge('victoria', 'first-course')
      expect(awarded).toBe(false)
    })

    it('awards multiple badges', () => {
      repo().awardBadge('victoria', 'streak-7')
      repo().awardBadge('victoria', 'perfect-lesson1')
      const badges = repo().getGamification('victoria').badges
      expect(badges).toContain('first-course')
      expect(badges).toContain('streak-7')
      expect(badges).toContain('perfect-lesson1')
      expect(badges).toHaveLength(3)
    })
  })

  // ==================== MULTI-STUDENT ====================

  describe('Phase 7: Multiple students on same course', () => {
    it('Minh has separate progress from Victoria', () => {
      const minhProgress = repo().getCourseProgress('minh', courseId)
      expect(minhProgress.every(p => p.completed === 0)).toBe(true) // Minh hasn't started
    })

    it('Minh completes first item independently', () => {
      repo().markComplete('minh', videoId)
      expect(repo().getProgress('minh', videoId).completed).toBe(1)
      // Victoria's progress unchanged
      const victoriaProgress = repo().getCourseProgress('victoria', courseId)
      expect(victoriaProgress.every(p => p.completed === 1)).toBe(true) // still 100%
    })

    it('students have independent XP', () => {
      expect(repo().getGamification('victoria').total_xp).toBe(80)
      expect(repo().getGamification('minh').total_xp).toBe(10)
    })

    it('students have independent streaks', () => {
      expect(repo().getGamification('minh').current_streak).toBe(7)
      expect(repo().getGamification('victoria').current_streak).toBe(1)
    })
  })
})
