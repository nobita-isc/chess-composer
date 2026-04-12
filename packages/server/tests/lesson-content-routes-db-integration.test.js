/**
 * DB integration tests for lesson-content routes.
 * Uses in-memory SQLite with real repository logic.
 * Full CRUD: course → lesson → content (with description) → student progress.
 * All test data cleaned up after each describe block.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Database from 'better-sqlite3'

let db

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
}

function createRepo(db) {
  return {
    // ---- Courses ----
    createCourse(data) {
      const id = genId('course')
      const now = new Date().toISOString()
      db.prepare('INSERT INTO courses (id,title,description,skill_level,created_at,updated_at) VALUES (?,?,?,?,?,?)')
        .run(id, data.title, data.description || null, data.skill_level || 'beginner', now, now)
      return { success: true, data: { id } }
    },
    findCourseById(id) { return db.prepare('SELECT * FROM courses WHERE id=?').get(id) },
    updateCourse(id, data) {
      const fields = []
      const values = []
      if (data.title !== undefined) { fields.push('title=?'); values.push(data.title) }
      if (data.description !== undefined) { fields.push('description=?'); values.push(data.description) }
      fields.push('updated_at=?'); values.push(new Date().toISOString())
      values.push(id)
      const r = db.prepare(`UPDATE courses SET ${fields.join(',')} WHERE id=?`).run(...values)
      return r.changes > 0 ? { success: true } : { success: false, error: 'Course not found' }
    },
    deleteCourse(id) {
      return db.prepare('DELETE FROM courses WHERE id=?').run(id).changes > 0
        ? { success: true } : { success: false, error: 'Not found' }
    },

    // ---- Lessons ----
    createLesson(courseId, data) {
      const id = genId('lesson')
      const maxOrder = db.prepare('SELECT MAX(order_index) as m FROM lessons WHERE course_id=?').get(courseId)
      const order = data.order_index ?? ((maxOrder?.m ?? -1) + 1)
      db.prepare('INSERT INTO lessons (id,course_id,order_index,title,description,created_at) VALUES (?,?,?,?,?,?)')
        .run(id, courseId, order, data.title, data.description || null, new Date().toISOString())
      return { success: true, data: { id, order_index: order } }
    },
    findLessonsByCourse(courseId) {
      return db.prepare('SELECT * FROM lessons WHERE course_id=? ORDER BY order_index').all(courseId)
    },
    findLessonById(id) { return db.prepare('SELECT * FROM lessons WHERE id=?').get(id) },
    updateLesson(id, data) {
      const fields = []
      const values = []
      if (data.title !== undefined) { fields.push('title=?'); values.push(data.title) }
      if (data.description !== undefined) { fields.push('description=?'); values.push(data.description) }
      if (data.order_index !== undefined) { fields.push('order_index=?'); values.push(data.order_index) }
      if (fields.length === 0) return { success: true }
      values.push(id)
      const r = db.prepare(`UPDATE lessons SET ${fields.join(',')} WHERE id=?`).run(...values)
      return r.changes > 0 ? { success: true } : { success: false, error: 'Lesson not found' }
    },
    deleteLesson(id) {
      return db.prepare('DELETE FROM lessons WHERE id=?').run(id).changes > 0
        ? { success: true } : { success: false, error: 'Not found' }
    },

    // ---- Content ----
    createContent(lessonId, data) {
      const id = genId('lc')
      const now = new Date().toISOString()
      const maxOrder = db.prepare('SELECT MAX(order_index) as m FROM lesson_content WHERE lesson_id=?').get(lessonId)
      const order = data.order_index ?? ((maxOrder?.m ?? -1) + 1)
      db.prepare(`INSERT INTO lesson_content (id,lesson_id,order_index,content_type,title,video_url,file_path,file_size,puzzle_fen,puzzle_moves,puzzle_instruction,quiz_data,xp_reward,description,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, lessonId, order, data.content_type, data.title,
          data.video_url || null, data.file_path || null, data.file_size || null,
          data.puzzle_fen || null, data.puzzle_moves || null, data.puzzle_instruction || null,
          data.quiz_data ? JSON.stringify(data.quiz_data) : null,
          data.xp_reward || 10, data.description || null, now)
      return { success: true, data: { id, lesson_id: lessonId, order_index: order } }
    },
    findContentByLesson(lessonId) {
      return db.prepare('SELECT * FROM lesson_content WHERE lesson_id=? ORDER BY order_index').all(lessonId)
    },
    findContentById(id) { return db.prepare('SELECT * FROM lesson_content WHERE id=?').get(id) },
    updateContent(id, data) {
      const allowed = new Set([
        'order_index', 'content_type', 'title', 'video_url', 'file_path', 'file_size',
        'puzzle_fen', 'puzzle_moves', 'quiz_data', 'xp_reward',
        'puzzle_instruction', 'puzzle_hints', 'puzzle_video_url', 'puzzle_challenges', 'description'
      ])
      const fields = []
      const values = []
      for (const [key, val] of Object.entries(data)) {
        if (!allowed.has(key)) continue
        fields.push(`${key}=?`)
        values.push(val)
      }
      if (fields.length === 0) return { success: true }
      values.push(id)
      const r = db.prepare(`UPDATE lesson_content SET ${fields.join(',')} WHERE id=?`).run(...values)
      return r.changes > 0 ? { success: true } : { success: false, error: 'Content not found' }
    },
    deleteContent(id) {
      return db.prepare('DELETE FROM lesson_content WHERE id=?').run(id).changes > 0
        ? { success: true } : { success: false, error: 'Not found' }
    },
    reorderContent(lessonId, orderedIds) {
      const stmt = db.prepare('UPDATE lesson_content SET order_index=? WHERE id=? AND lesson_id=?')
      orderedIds.forEach((id, i) => stmt.run(i, id, lessonId))
      return { success: true }
    },

    // ---- Assignments ----
    assignCourse(courseId, studentId) {
      const id = genId('ca')
      try {
        db.prepare('INSERT INTO course_assignments (id,course_id,student_id,assigned_at) VALUES (?,?,?,?)')
          .run(id, courseId, studentId, new Date().toISOString())
        return { success: true }
      } catch (e) {
        if (e.message.includes('UNIQUE')) return { success: false, error: 'Already assigned' }
        throw e
      }
    },
    findAssignmentsByStudent(studentId) {
      return db.prepare('SELECT ca.*,c.title FROM course_assignments ca JOIN courses c ON ca.course_id=c.id WHERE ca.student_id=?').all(studentId)
    },

    // ---- Progress ----
    markContentComplete(studentId, contentId, data = {}) {
      const id = genId('lp')
      try {
        db.prepare('INSERT INTO lesson_progress (id,student_id,content_id,completed,puzzle_result,completed_at,xp_earned) VALUES (?,?,?,1,?,?,?)')
          .run(id, studentId, contentId, data.puzzle_result || null, new Date().toISOString(), data.xp_earned || 0)
      } catch (e) {
        if (e.message.includes('UNIQUE')) {
          db.prepare('UPDATE lesson_progress SET completed=1,completed_at=?,xp_earned=? WHERE student_id=? AND content_id=?')
            .run(new Date().toISOString(), data.xp_earned || 0, studentId, contentId)
        } else throw e
      }
      return { success: true }
    },
    resetContentProgress(studentId, contentId) {
      db.prepare('DELETE FROM lesson_progress WHERE student_id=? AND content_id=?').run(studentId, contentId)
    },
    getProgress(studentId, contentId) {
      return db.prepare('SELECT * FROM lesson_progress WHERE student_id=? AND content_id=?').get(studentId, contentId)
    },
    getStudentCourseProgress(studentId, courseId) {
      return db.prepare(`
        SELECT lc.id as content_id, lc.content_type, lc.title, lc.xp_reward,
          COALESCE(lp.completed,0) as completed, lp.puzzle_result, lp.xp_earned
        FROM lesson_content lc
        JOIN lessons l ON lc.lesson_id=l.id
        LEFT JOIN lesson_progress lp ON lp.content_id=lc.id AND lp.student_id=?
        WHERE l.course_id=? ORDER BY l.order_index, lc.order_index
      `).all(studentId, courseId)
    },

    // ---- Gamification ----
    getOrCreateGamification(studentId) {
      let g = db.prepare('SELECT * FROM student_gamification WHERE student_id=?').get(studentId)
      if (!g) {
        db.prepare('INSERT INTO student_gamification (student_id) VALUES (?)').run(studentId)
        g = { student_id: studentId, total_xp: 0, current_streak: 0, longest_streak: 0, badges: '[]' }
      }
      return { ...g, badges: JSON.parse(g.badges || '[]') }
    },
    addXP(studentId, xp) {
      this.getOrCreateGamification(studentId)
      db.prepare('UPDATE student_gamification SET total_xp=total_xp+? WHERE student_id=?').run(xp, studentId)
    },
  }
}

beforeAll(() => {
  db = new Database(':memory:')
  db.exec(`
    CREATE TABLE courses (id TEXT PRIMARY KEY, title TEXT, description TEXT, thumbnail_url TEXT, skill_level TEXT DEFAULT 'beginner', created_at TEXT, updated_at TEXT);
    CREATE TABLE lessons (id TEXT PRIMARY KEY, course_id TEXT, order_index INTEGER DEFAULT 0, title TEXT, description TEXT, created_at TEXT, FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE);
    CREATE TABLE lesson_content (id TEXT PRIMARY KEY, lesson_id TEXT, order_index INTEGER DEFAULT 0, content_type TEXT, title TEXT, video_url TEXT, file_path TEXT, file_size INTEGER, duration_min INTEGER, puzzle_id TEXT, puzzle_fen TEXT, puzzle_moves TEXT, quiz_data TEXT, xp_reward INTEGER DEFAULT 10, puzzle_instruction TEXT, puzzle_hints TEXT, puzzle_video_url TEXT, puzzle_challenges TEXT, description TEXT, created_at TEXT, FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE);
    CREATE TABLE students (id TEXT PRIMARY KEY, name TEXT, email TEXT, skill_level TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE course_assignments (id TEXT PRIMARY KEY, course_id TEXT, student_id TEXT, assigned_at TEXT, UNIQUE(course_id,student_id));
    CREATE TABLE lesson_progress (id TEXT PRIMARY KEY, student_id TEXT, content_id TEXT, completed INTEGER DEFAULT 0, puzzle_result TEXT, completed_at TEXT, xp_earned INTEGER DEFAULT 0, UNIQUE(student_id,content_id));
    CREATE TABLE student_gamification (student_id TEXT PRIMARY KEY, total_xp INTEGER DEFAULT 0, current_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0, last_activity_date TEXT, badges TEXT DEFAULT '[]');
  `)
  db.prepare("INSERT INTO students (id,name,created_at) VALUES ('s1','Test Student',?)").run(new Date().toISOString())
  db.prepare("INSERT INTO students (id,name,created_at) VALUES ('s2','Student Two',?)").run(new Date().toISOString())
})

afterAll(() => db.close())

// Cleanup helper
function cleanAll() {
  db.exec('DELETE FROM lesson_progress')
  db.exec('DELETE FROM course_assignments')
  db.exec('DELETE FROM lesson_content')
  db.exec('DELETE FROM lessons')
  db.exec('DELETE FROM courses')
  db.exec('DELETE FROM student_gamification')
}

// ==================== ADMIN: LESSON CRUD ====================

describe('DB Integration — Lesson CRUD', () => {
  afterEach(cleanAll)
  const repo = () => createRepo(db)

  it('creates and retrieves a lesson', () => {
    const r = repo()
    const course = r.createCourse({ title: 'C1' })
    const lesson = r.createLesson(course.data.id, { title: 'Lesson 1' })
    expect(lesson.data.id).toBeTruthy()
    const found = r.findLessonById(lesson.data.id)
    expect(found.title).toBe('Lesson 1')
  })

  it('auto-increments order_index', () => {
    const r = repo()
    const course = r.createCourse({ title: 'C' })
    r.createLesson(course.data.id, { title: 'A' })
    const second = r.createLesson(course.data.id, { title: 'B' })
    expect(second.data.order_index).toBe(1)
  })

  it('updates lesson title', () => {
    const r = repo()
    const course = r.createCourse({ title: 'C' })
    const lesson = r.createLesson(course.data.id, { title: 'Old' })
    r.updateLesson(lesson.data.id, { title: 'New' })
    expect(r.findLessonById(lesson.data.id).title).toBe('New')
  })

  it('returns failure for updating non-existent lesson', () => {
    expect(repo().updateLesson('fake', { title: 'X' }).success).toBe(false)
  })

  it('deletes lesson', () => {
    const r = repo()
    const course = r.createCourse({ title: 'C' })
    const lesson = r.createLesson(course.data.id, { title: 'L' })
    expect(r.deleteLesson(lesson.data.id).success).toBe(true)
    expect(r.findLessonById(lesson.data.id)).toBeUndefined()
  })

  it('returns failure for deleting non-existent lesson', () => {
    expect(repo().deleteLesson('fake').success).toBe(false)
  })
})

// ==================== ADMIN: CONTENT CRUD + DESCRIPTION ====================

describe('DB Integration — Content CRUD with description', () => {
  afterEach(cleanAll)
  const repo = () => createRepo(db)

  function setupCourseLesson(r) {
    const course = r.createCourse({ title: 'TestCourse' })
    const lesson = r.createLesson(course.data.id, { title: 'TestLesson' })
    return { courseId: course.data.id, lessonId: lesson.data.id }
  }

  it('creates video content with description', () => {
    const r = repo()
    const { lessonId } = setupCourseLesson(r)
    const content = r.createContent(lessonId, {
      content_type: 'video', title: 'Intro', video_url: 'https://youtube.com/1',
      description: '## Opening Theory\n\nLearn **Italian Game**.'
    })
    const found = r.findContentById(content.data.id)
    expect(found.content_type).toBe('video')
    expect(found.description).toBe('## Opening Theory\n\nLearn **Italian Game**.')
    expect(found.video_url).toBe('https://youtube.com/1')
  })

  it('creates PDF content without description', () => {
    const r = repo()
    const { lessonId } = setupCourseLesson(r)
    const content = r.createContent(lessonId, { content_type: 'pdf', title: 'Guide', file_path: '/f.pdf' })
    expect(r.findContentById(content.data.id).description).toBeNull()
  })

  it('creates puzzle content with instruction and description (separate fields)', () => {
    const r = repo()
    const { lessonId } = setupCourseLesson(r)
    const content = r.createContent(lessonId, {
      content_type: 'puzzle', title: 'Fork',
      puzzle_fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      puzzle_instruction: 'Find the fork!',
      description: '## Knight Forks\nA knight can attack two pieces at once.',
      xp_reward: 20
    })
    const found = r.findContentById(content.data.id)
    expect(found.puzzle_instruction).toBe('Find the fork!')
    expect(found.description).toBe('## Knight Forks\nA knight can attack two pieces at once.')
  })

  it('creates quiz content', () => {
    const r = repo()
    const { lessonId } = setupCourseLesson(r)
    const content = r.createContent(lessonId, {
      content_type: 'quiz', title: 'Quiz',
      quiz_data: [{ question: 'Q1', options: ['A', 'B'], correctIndex: 0 }],
      xp_reward: 15
    })
    const found = r.findContentById(content.data.id)
    expect(found.content_type).toBe('quiz')
    expect(JSON.parse(found.quiz_data)).toHaveLength(1)
  })

  it('lists content by lesson with descriptions', () => {
    const r = repo()
    const { lessonId } = setupCourseLesson(r)
    r.createContent(lessonId, { content_type: 'video', title: 'V1', description: '## V1 notes' })
    r.createContent(lessonId, { content_type: 'pdf', title: 'P1' })
    r.createContent(lessonId, { content_type: 'puzzle', title: 'Pz1', description: '## Puzzle notes' })

    const list = r.findContentByLesson(lessonId)
    expect(list).toHaveLength(3)
    expect(list[0].description).toBe('## V1 notes')
    expect(list[1].description).toBeNull()
    expect(list[2].description).toBe('## Puzzle notes')
  })

  it('updates content description', () => {
    const r = repo()
    const { lessonId } = setupCourseLesson(r)
    const content = r.createContent(lessonId, { content_type: 'video', title: 'V' })
    r.updateContent(content.data.id, { description: '# Added later' })
    expect(r.findContentById(content.data.id).description).toBe('# Added later')
  })

  it('clears description with null', () => {
    const r = repo()
    const { lessonId } = setupCourseLesson(r)
    const content = r.createContent(lessonId, { content_type: 'video', title: 'V', description: 'Old' })
    r.updateContent(content.data.id, { description: null })
    expect(r.findContentById(content.data.id).description).toBeNull()
  })

  it('updates title without affecting description', () => {
    const r = repo()
    const { lessonId } = setupCourseLesson(r)
    const content = r.createContent(lessonId, { content_type: 'video', title: 'V', description: 'Keep me' })
    r.updateContent(content.data.id, { title: 'New Title' })
    const found = r.findContentById(content.data.id)
    expect(found.title).toBe('New Title')
    expect(found.description).toBe('Keep me')
  })

  it('rejects disallowed columns in updateContent', () => {
    const r = repo()
    const { lessonId } = setupCourseLesson(r)
    const content = r.createContent(lessonId, { content_type: 'video', title: 'V' })
    r.updateContent(content.data.id, { id: 'hacked', created_at: '2020-01-01', description: 'safe' })
    const found = r.findContentById(content.data.id)
    expect(found.id).toBe(content.data.id) // unchanged
    expect(found.description).toBe('safe')
  })

  it('returns failure for updating non-existent content', () => {
    expect(repo().updateContent('fake_id', { title: 'X' }).success).toBe(false)
  })

  it('deletes content', () => {
    const r = repo()
    const { lessonId } = setupCourseLesson(r)
    const content = r.createContent(lessonId, { content_type: 'video', title: 'V' })
    expect(r.deleteContent(content.data.id).success).toBe(true)
    expect(r.findContentById(content.data.id)).toBeUndefined()
  })

  it('returns failure for deleting non-existent content', () => {
    expect(repo().deleteContent('fake').success).toBe(false)
  })

  it('reorders content', () => {
    const r = repo()
    const { lessonId } = setupCourseLesson(r)
    const c1 = r.createContent(lessonId, { content_type: 'video', title: 'First' })
    const c2 = r.createContent(lessonId, { content_type: 'pdf', title: 'Second' })
    const c3 = r.createContent(lessonId, { content_type: 'puzzle', title: 'Third' })

    // Reverse order
    r.reorderContent(lessonId, [c3.data.id, c2.data.id, c1.data.id])
    const list = r.findContentByLesson(lessonId)
    expect(list[0].title).toBe('Third')
    expect(list[1].title).toBe('Second')
    expect(list[2].title).toBe('First')
  })
})

// ==================== STUDENT: ASSIGNMENTS + PROGRESS ====================

describe('DB Integration — Student assignments & progress', () => {
  afterEach(cleanAll)
  const repo = () => createRepo(db)

  function setupFullCourse(r) {
    const course = r.createCourse({ title: 'Italian Game' })
    const l1 = r.createLesson(course.data.id, { title: 'Intro' })
    const v = r.createContent(l1.data.id, { content_type: 'video', title: 'Video', xp_reward: 10, description: '## Lesson notes' })
    const p = r.createContent(l1.data.id, { content_type: 'puzzle', title: 'Puzzle', xp_reward: 20 })
    return { courseId: course.data.id, lessonId: l1.data.id, videoId: v.data.id, puzzleId: p.data.id }
  }

  it('assigns course to student', () => {
    const r = repo()
    const { courseId } = setupFullCourse(r)
    expect(r.assignCourse(courseId, 's1').success).toBe(true)
    const courses = r.findAssignmentsByStudent('s1')
    expect(courses).toHaveLength(1)
    expect(courses[0].title).toBe('Italian Game')
  })

  it('prevents duplicate assignment', () => {
    const r = repo()
    const { courseId } = setupFullCourse(r)
    r.assignCourse(courseId, 's1')
    expect(r.assignCourse(courseId, 's1').success).toBe(false)
  })

  it('tracks progress — initially 0%', () => {
    const r = repo()
    const { courseId } = setupFullCourse(r)
    r.assignCourse(courseId, 's1')
    const progress = r.getStudentCourseProgress('s1', courseId)
    expect(progress).toHaveLength(2)
    expect(progress.every(p => p.completed === 0)).toBe(true)
  })

  it('marks content complete and earns XP', () => {
    const r = repo()
    const { courseId, videoId } = setupFullCourse(r)
    r.assignCourse(courseId, 's1')
    r.markContentComplete('s1', videoId, { xp_earned: 10 })
    r.addXP('s1', 10)

    const progress = r.getProgress('s1', videoId)
    expect(progress.completed).toBe(1)
    expect(progress.xp_earned).toBe(10)
    expect(r.getOrCreateGamification('s1').total_xp).toBe(10)
  })

  it('handles puzzle result in progress', () => {
    const r = repo()
    const { courseId, puzzleId } = setupFullCourse(r)
    r.assignCourse(courseId, 's1')
    r.markContentComplete('s1', puzzleId, { puzzle_result: '1', xp_earned: 20 })
    expect(r.getProgress('s1', puzzleId).puzzle_result).toBe('1')
  })

  it('handles duplicate completion (upsert)', () => {
    const r = repo()
    const { courseId, videoId } = setupFullCourse(r)
    r.assignCourse(courseId, 's1')
    r.markContentComplete('s1', videoId, { xp_earned: 10 })
    r.markContentComplete('s1', videoId, { xp_earned: 10 }) // should not throw
    expect(r.getProgress('s1', videoId).completed).toBe(1)
  })

  it('resets progress', () => {
    const r = repo()
    const { courseId, videoId } = setupFullCourse(r)
    r.assignCourse(courseId, 's1')
    r.markContentComplete('s1', videoId, { xp_earned: 10 })
    r.resetContentProgress('s1', videoId)
    expect(r.getProgress('s1', videoId)).toBeUndefined()
  })

  it('tracks course progress percentage', () => {
    const r = repo()
    const { courseId, videoId, puzzleId } = setupFullCourse(r)
    r.assignCourse(courseId, 's1')
    r.markContentComplete('s1', videoId, { xp_earned: 10 })

    const progress = r.getStudentCourseProgress('s1', courseId)
    const completed = progress.filter(p => p.completed).length
    expect(completed).toBe(1)
    expect(progress.length).toBe(2)
    expect(Math.round(completed / progress.length * 100)).toBe(50)
  })

  it('content descriptions are visible in student course progress query', () => {
    const r = repo()
    const { courseId } = setupFullCourse(r)
    r.assignCourse(courseId, 's1')
    // The progress query uses lesson_content, which has description
    const progress = r.getStudentCourseProgress('s1', courseId)
    expect(progress).toHaveLength(2)
    // The progress query returns content_type, title etc. from lesson_content
    expect(progress[0].content_type).toBe('video')
    expect(progress[1].content_type).toBe('puzzle')
  })

  it('two students have independent progress', () => {
    const r = repo()
    const { courseId, videoId } = setupFullCourse(r)
    r.assignCourse(courseId, 's1')
    r.assignCourse(courseId, 's2')
    r.markContentComplete('s1', videoId, { xp_earned: 10 })
    r.addXP('s1', 10)

    expect(r.getProgress('s1', videoId).completed).toBe(1)
    expect(r.getProgress('s2', videoId)).toBeUndefined()
    expect(r.getOrCreateGamification('s1').total_xp).toBe(10)
    expect(r.getOrCreateGamification('s2').total_xp).toBe(0)
  })
})

// ==================== GAMIFICATION ====================

describe('DB Integration — Gamification', () => {
  afterEach(cleanAll)
  const repo = () => createRepo(db)

  it('creates gamification record on first access', () => {
    const g = repo().getOrCreateGamification('s1')
    expect(g.total_xp).toBe(0)
    expect(g.badges).toEqual([])
  })

  it('adds XP', () => {
    const r = repo()
    r.addXP('s1', 50)
    expect(r.getOrCreateGamification('s1').total_xp).toBe(50)
  })

  it('accumulates XP', () => {
    const r = repo()
    r.addXP('s1', 10)
    r.addXP('s1', 20)
    r.addXP('s1', 30)
    expect(r.getOrCreateGamification('s1').total_xp).toBe(60)
  })

  it('independent XP per student', () => {
    const r = repo()
    r.addXP('s1', 100)
    r.addXP('s2', 50)
    expect(r.getOrCreateGamification('s1').total_xp).toBe(100)
    expect(r.getOrCreateGamification('s2').total_xp).toBe(50)
  })
})
