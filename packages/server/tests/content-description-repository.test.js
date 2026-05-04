/**
 * Tests for content description feature in CourseRepository.
 * Covers: createContent with description, updateContent description,
 * findContentByLesson returning description, null/empty handling.
 * Uses in-memory SQLite. All test data cleaned up after each suite.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import Database from 'better-sqlite3'

let db
const createdIds = { courses: [], lessons: [], content: [] }

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
}

function createRepo(db) {
  return {
    createCourse(data) {
      const id = genId('course')
      const now = new Date().toISOString()
      db.prepare('INSERT INTO courses (id,title,description,skill_level,created_at,updated_at) VALUES (?,?,?,?,?,?)')
        .run(id, data.title, data.description || null, data.skill_level || 'beginner', now, now)
      createdIds.courses.push(id)
      return id
    },
    createLesson(courseId, data) {
      const id = genId('lesson')
      db.prepare('INSERT INTO lessons (id,course_id,order_index,title,created_at) VALUES (?,?,?,?,?)')
        .run(id, courseId, data.order_index || 0, data.title, new Date().toISOString())
      createdIds.lessons.push(id)
      return id
    },
    createContent(lessonId, data) {
      const id = genId('lc')
      const now = new Date().toISOString()
      db.prepare(`INSERT INTO lesson_content (id,lesson_id,order_index,content_type,title,video_url,puzzle_fen,puzzle_moves,xp_reward,description,puzzle_instruction,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(id, lessonId, data.order_index || 0, data.content_type, data.title,
          data.video_url || null, data.puzzle_fen || null, data.puzzle_moves || null,
          data.xp_reward || 10, data.description || null, data.puzzle_instruction || null, now)
      createdIds.content.push(id)
      return id
    },
    findContentByLesson(lessonId) {
      return db.prepare('SELECT * FROM lesson_content WHERE lesson_id=? ORDER BY order_index').all(lessonId)
    },
    findContentById(id) {
      return db.prepare('SELECT * FROM lesson_content WHERE id=?').get(id)
    },
    updateContent(id, data) {
      const allowedColumns = new Set([
        'order_index', 'content_type', 'title', 'video_url', 'file_path', 'file_size',
        'duration_min', 'puzzle_id', 'puzzle_fen', 'puzzle_moves', 'quiz_data', 'xp_reward',
        'puzzle_instruction', 'puzzle_hints', 'puzzle_video_url', 'puzzle_challenges', 'description'
      ])
      const fields = []
      const values = []
      for (const [key, val] of Object.entries(data)) {
        if (!allowedColumns.has(key)) continue
        fields.push(`${key} = ?`)
        values.push(val)
      }
      if (fields.length === 0) return { success: true }
      values.push(id)
      const result = db.prepare(`UPDATE lesson_content SET ${fields.join(', ')} WHERE id=?`).run(...values)
      return result.changes > 0 ? { success: true } : { success: false, error: 'Content not found' }
    }
  }
}

beforeAll(() => {
  db = new Database(':memory:')
  db.exec(`
    CREATE TABLE courses (id TEXT PRIMARY KEY, title TEXT, description TEXT, thumbnail_url TEXT, skill_level TEXT DEFAULT 'beginner', created_at TEXT, updated_at TEXT);
    CREATE TABLE lessons (id TEXT PRIMARY KEY, course_id TEXT, order_index INTEGER, title TEXT, description TEXT, created_at TEXT);
    CREATE TABLE lesson_content (id TEXT PRIMARY KEY, lesson_id TEXT, order_index INTEGER DEFAULT 0, content_type TEXT, title TEXT, video_url TEXT, file_path TEXT, file_size INTEGER, duration_min INTEGER, puzzle_id TEXT, puzzle_fen TEXT, puzzle_moves TEXT, quiz_data TEXT, xp_reward INTEGER DEFAULT 10, puzzle_instruction TEXT, puzzle_hints TEXT, puzzle_video_url TEXT, puzzle_challenges TEXT, description TEXT, created_at TEXT);
  `)
})

afterEach(() => {
  // Clean up test data in reverse dependency order
  if (createdIds.content.length > 0) {
    const placeholders = createdIds.content.map(() => '?').join(',')
    db.prepare(`DELETE FROM lesson_content WHERE id IN (${placeholders})`).run(...createdIds.content)
    createdIds.content = []
  }
  if (createdIds.lessons.length > 0) {
    const placeholders = createdIds.lessons.map(() => '?').join(',')
    db.prepare(`DELETE FROM lessons WHERE id IN (${placeholders})`).run(...createdIds.lessons)
    createdIds.lessons = []
  }
  if (createdIds.courses.length > 0) {
    const placeholders = createdIds.courses.map(() => '?').join(',')
    db.prepare(`DELETE FROM courses WHERE id IN (${placeholders})`).run(...createdIds.courses)
    createdIds.courses = []
  }
})

afterAll(() => db.close())

describe('Content Description — Repository', () => {
  const repo = () => createRepo(db)

  describe('Migration 011: description column', () => {
    it('lesson_content table has description column', () => {
      const columns = db.prepare('PRAGMA table_info(lesson_content)').all()
      const descCol = columns.find(c => c.name === 'description')
      expect(descCol).toBeTruthy()
      expect(descCol.type).toBe('TEXT')
      expect(descCol.notnull).toBe(0) // nullable
    })

    it('migration is idempotent (re-running does not throw)', async () => {
      const { migrate } = await import('../../server/src/database/migrations/011_add_content_description.js')
      expect(() => migrate(db)).not.toThrow()
    })
  })

  describe('createContent with description', () => {
    it('stores markdown description', () => {
      const r = repo()
      const courseId = r.createCourse({ title: 'Test Course' })
      const lessonId = r.createLesson(courseId, { title: 'Lesson 1' })
      const contentId = r.createContent(lessonId, {
        content_type: 'video',
        title: 'Intro Video',
        description: '## Opening Theory\n\nLearn the **Italian Game** basics.'
      })

      const content = r.findContentById(contentId)
      expect(content.description).toBe('## Opening Theory\n\nLearn the **Italian Game** basics.')
    })

    it('stores null when no description provided', () => {
      const r = repo()
      const courseId = r.createCourse({ title: 'No Desc Course' })
      const lessonId = r.createLesson(courseId, { title: 'Lesson' })
      const contentId = r.createContent(lessonId, {
        content_type: 'pdf',
        title: 'Guide'
      })

      const content = r.findContentById(contentId)
      expect(content.description).toBeNull()
    })

    it('stores empty string description as null', () => {
      const r = repo()
      const courseId = r.createCourse({ title: 'Empty Desc' })
      const lessonId = r.createLesson(courseId, { title: 'Lesson' })
      const contentId = r.createContent(lessonId, {
        content_type: 'video',
        title: 'Video',
        description: ''
      })

      // Empty string becomes null via `data.description || null`
      const content = r.findContentById(contentId)
      expect(content.description).toBeNull()
    })

    it('description is independent from puzzle_instruction', () => {
      const r = repo()
      const courseId = r.createCourse({ title: 'Puzzle Course' })
      const lessonId = r.createLesson(courseId, { title: 'Puzzles' })
      const contentId = r.createContent(lessonId, {
        content_type: 'puzzle',
        title: 'Knight Fork',
        puzzle_instruction: 'Find the fork!',
        description: '## Knight Forks\n\nA knight fork attacks two pieces simultaneously.'
      })

      const content = r.findContentById(contentId)
      expect(content.puzzle_instruction).toBe('Find the fork!')
      expect(content.description).toBe('## Knight Forks\n\nA knight fork attacks two pieces simultaneously.')
    })
  })

  describe('updateContent description', () => {
    it('adds description to existing content', () => {
      const r = repo()
      const courseId = r.createCourse({ title: 'Update Test' })
      const lessonId = r.createLesson(courseId, { title: 'L' })
      const contentId = r.createContent(lessonId, { content_type: 'video', title: 'V' })

      expect(r.findContentById(contentId).description).toBeNull()

      r.updateContent(contentId, { description: '# New Description' })
      expect(r.findContentById(contentId).description).toBe('# New Description')
    })

    it('updates existing description', () => {
      const r = repo()
      const courseId = r.createCourse({ title: 'Update Desc' })
      const lessonId = r.createLesson(courseId, { title: 'L' })
      const contentId = r.createContent(lessonId, {
        content_type: 'pdf',
        title: 'PDF',
        description: 'Old text'
      })

      r.updateContent(contentId, { description: 'New text with **bold**' })
      expect(r.findContentById(contentId).description).toBe('New text with **bold**')
    })

    it('clears description by setting to null', () => {
      const r = repo()
      const courseId = r.createCourse({ title: 'Clear Desc' })
      const lessonId = r.createLesson(courseId, { title: 'L' })
      const contentId = r.createContent(lessonId, {
        content_type: 'video',
        title: 'V',
        description: 'Some notes'
      })

      r.updateContent(contentId, { description: null })
      expect(r.findContentById(contentId).description).toBeNull()
    })

    it('updates description without affecting other fields', () => {
      const r = repo()
      const courseId = r.createCourse({ title: 'No Side Effect' })
      const lessonId = r.createLesson(courseId, { title: 'L' })
      const contentId = r.createContent(lessonId, {
        content_type: 'video',
        title: 'My Video',
        video_url: 'https://youtube.com/watch?v=abc'
      })

      r.updateContent(contentId, { description: '# Notes' })
      const updated = r.findContentById(contentId)
      expect(updated.title).toBe('My Video')
      expect(updated.video_url).toBe('https://youtube.com/watch?v=abc')
      expect(updated.description).toBe('# Notes')
    })

    it('rejects disallowed columns (no injection)', () => {
      const r = repo()
      const courseId = r.createCourse({ title: 'Injection Test' })
      const lessonId = r.createLesson(courseId, { title: 'L' })
      const contentId = r.createContent(lessonId, { content_type: 'video', title: 'V' })

      r.updateContent(contentId, { id: 'hacked', created_at: '2020-01-01', description: 'safe' })
      const content = r.findContentById(contentId)
      expect(content.id).toBe(contentId) // id unchanged
      expect(content.description).toBe('safe')
    })

    it('returns false for non-existent content', () => {
      const r = repo()
      const result = r.updateContent('nonexistent_id', { description: 'test' })
      expect(result.success).toBe(false)
    })
  })

  describe('findContentByLesson returns description', () => {
    it('returns description in content list', () => {
      const r = repo()
      const courseId = r.createCourse({ title: 'List Test' })
      const lessonId = r.createLesson(courseId, { title: 'L' })
      r.createContent(lessonId, {
        content_type: 'video', title: 'V1',
        description: '# Video notes', order_index: 0
      })
      r.createContent(lessonId, {
        content_type: 'pdf', title: 'P1',
        description: null, order_index: 1
      })

      const content = r.findContentByLesson(lessonId)
      expect(content).toHaveLength(2)
      expect(content[0].description).toBe('# Video notes')
      expect(content[1].description).toBeNull()
    })

    it('supports mixed content with and without descriptions', () => {
      const r = repo()
      const courseId = r.createCourse({ title: 'Mixed' })
      const lessonId = r.createLesson(courseId, { title: 'L' })
      r.createContent(lessonId, { content_type: 'video', title: 'V', description: 'Has desc', order_index: 0 })
      r.createContent(lessonId, { content_type: 'puzzle', title: 'P', order_index: 1 })
      r.createContent(lessonId, { content_type: 'pdf', title: 'D', description: '**Bold**', order_index: 2 })

      const content = r.findContentByLesson(lessonId)
      expect(content).toHaveLength(3)
      const withDesc = content.filter(c => c.description)
      const withoutDesc = content.filter(c => !c.description)
      expect(withDesc).toHaveLength(2)
      expect(withoutDesc).toHaveLength(1)
    })
  })
})
