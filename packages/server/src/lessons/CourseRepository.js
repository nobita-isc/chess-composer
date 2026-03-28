/**
 * CourseRepository.js
 * Data access layer for courses, lessons, content items, assignments, and progress.
 */

import { database } from '../database/SqliteDatabase.js'

function generateId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
}

export class CourseRepository {
  // ==================== Courses ====================

  createCourse(data) {
    const id = generateId('course')
    const now = new Date().toISOString()
    database.run(
      `INSERT INTO courses (id, title, description, thumbnail_url, skill_level, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.title, data.description || null, data.thumbnail_url || null, data.skill_level || 'beginner', now, now]
    )
    return { success: true, data: { id, ...data, created_at: now } }
  }

  findAllCourses() {
    return database.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as lesson_count,
        (SELECT COUNT(*) FROM course_assignments WHERE course_id = c.id) as assigned_count
      FROM courses c ORDER BY c.created_at DESC
    `)
  }

  findCourseById(id) {
    return database.queryOne('SELECT * FROM courses WHERE id = ?', [id])
  }

  updateCourse(id, data) {
    const now = new Date().toISOString()
    const fields = []
    const values = []
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
    if (data.thumbnail_url !== undefined) { fields.push('thumbnail_url = ?'); values.push(data.thumbnail_url) }
    if (data.skill_level !== undefined) { fields.push('skill_level = ?'); values.push(data.skill_level) }
    fields.push('updated_at = ?'); values.push(now)
    values.push(id)
    const result = database.run(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`, values)
    return result.changes > 0 ? { success: true } : { success: false, error: 'Course not found' }
  }

  deleteCourse(id) {
    const result = database.run('DELETE FROM courses WHERE id = ?', [id])
    return result.changes > 0 ? { success: true } : { success: false, error: 'Course not found' }
  }

  // ==================== Lessons ====================

  createLesson(courseId, data) {
    const id = generateId('lesson')
    const now = new Date().toISOString()
    const maxOrder = database.queryOne('SELECT MAX(order_index) as m FROM lessons WHERE course_id = ?', [courseId])
    const orderIndex = data.order_index ?? ((maxOrder?.m ?? -1) + 1)
    database.run(
      'INSERT INTO lessons (id, course_id, order_index, title, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, courseId, orderIndex, data.title, data.description || null, now]
    )
    return { success: true, data: { id, course_id: courseId, order_index: orderIndex } }
  }

  findLessonsByCourse(courseId) {
    return database.query(`
      SELECT l.*,
        (SELECT COUNT(*) FROM lesson_content WHERE lesson_id = l.id) as content_count
      FROM lessons l WHERE l.course_id = ? ORDER BY l.order_index
    `, [courseId])
  }

  findLessonById(id) {
    return database.queryOne('SELECT * FROM lessons WHERE id = ?', [id])
  }

  updateLesson(id, data) {
    const fields = []
    const values = []
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
    if (data.order_index !== undefined) { fields.push('order_index = ?'); values.push(data.order_index) }
    if (fields.length === 0) return { success: true }
    values.push(id)
    const result = database.run(`UPDATE lessons SET ${fields.join(', ')} WHERE id = ?`, values)
    return result.changes > 0 ? { success: true } : { success: false, error: 'Lesson not found' }
  }

  deleteLesson(id) {
    const result = database.run('DELETE FROM lessons WHERE id = ?', [id])
    return result.changes > 0 ? { success: true } : { success: false, error: 'Lesson not found' }
  }

  // ==================== Content Items ====================

  createContent(lessonId, data) {
    const id = generateId('lc')
    const now = new Date().toISOString()
    const maxOrder = database.queryOne('SELECT MAX(order_index) as m FROM lesson_content WHERE lesson_id = ?', [lessonId])
    const orderIndex = data.order_index ?? ((maxOrder?.m ?? -1) + 1)
    const hintsJson = data.puzzle_hints ? (typeof data.puzzle_hints === 'string' ? data.puzzle_hints : JSON.stringify(data.puzzle_hints)) : null
    database.run(
      `INSERT INTO lesson_content (id, lesson_id, order_index, content_type, title, video_url, file_path, file_size, duration_min, puzzle_id, puzzle_fen, puzzle_moves, quiz_data, xp_reward, puzzle_instruction, puzzle_hints, puzzle_video_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, lessonId, orderIndex, data.content_type, data.title, data.video_url || null, data.file_path || null,
       data.file_size || null, data.duration_min || null, data.puzzle_id || null, data.puzzle_fen || null,
       data.puzzle_moves || null, data.quiz_data ? JSON.stringify(data.quiz_data) : null, data.xp_reward || 10,
       data.puzzle_instruction || null, hintsJson, data.puzzle_video_url || null, now]
    )
    return { success: true, data: { id, lesson_id: lessonId, order_index: orderIndex } }
  }

  findContentById(id) {
    return database.queryOne('SELECT * FROM lesson_content WHERE id = ?', [id])
  }

  findContentByLesson(lessonId) {
    return database.query('SELECT * FROM lesson_content WHERE lesson_id = ? ORDER BY order_index', [lessonId])
  }

  updateContent(id, data) {
    const allowedColumns = new Set([
      'order_index', 'content_type', 'title', 'video_url', 'file_path', 'file_size',
      'duration_min', 'puzzle_id', 'puzzle_fen', 'puzzle_moves', 'quiz_data', 'xp_reward',
      'puzzle_instruction', 'puzzle_hints', 'puzzle_video_url'
    ])
    const jsonFields = new Set(['quiz_data', 'puzzle_hints'])
    const fields = []
    const values = []
    for (const [key, val] of Object.entries(data)) {
      if (!allowedColumns.has(key)) continue
      if (jsonFields.has(key)) { fields.push(`${key} = ?`); values.push(typeof val === 'string' ? val : JSON.stringify(val)) }
      else { fields.push(`${key} = ?`); values.push(val) }
    }
    if (fields.length === 0) return { success: true }
    values.push(id)
    const result = database.run(`UPDATE lesson_content SET ${fields.join(', ')} WHERE id = ?`, values)
    return result.changes > 0 ? { success: true } : { success: false, error: 'Content not found' }
  }

  deleteContent(id) {
    const result = database.run('DELETE FROM lesson_content WHERE id = ?', [id])
    return result.changes > 0 ? { success: true } : { success: false, error: 'Content not found' }
  }

  reorderContent(lessonId, orderedIds) {
    const stmt = database.db ? database.db.prepare('UPDATE lesson_content SET order_index = ? WHERE id = ? AND lesson_id = ?') : null
    if (!stmt) return { success: false, error: 'DB not ready' }
    orderedIds.forEach((id, index) => stmt.run(index, id, lessonId))
    return { success: true }
  }

  // ==================== Assignments ====================

  assignCourse(courseId, studentId) {
    const id = generateId('ca')
    const now = new Date().toISOString()
    try {
      database.run('INSERT INTO course_assignments (id, course_id, student_id, assigned_at) VALUES (?, ?, ?, ?)',
        [id, courseId, studentId, now])
      return { success: true }
    } catch (err) {
      if (err.message?.includes('UNIQUE')) return { success: false, error: 'Already assigned' }
      throw err
    }
  }

  findAssignmentsByStudent(studentId) {
    return database.query(`
      SELECT ca.*, c.title, c.description, c.thumbnail_url, c.skill_level,
        (SELECT COUNT(*) FROM lessons WHERE course_id = c.id) as lesson_count
      FROM course_assignments ca
      JOIN courses c ON ca.course_id = c.id
      WHERE ca.student_id = ? ORDER BY ca.assigned_at DESC
    `, [studentId])
  }

  findAssignmentsByCourse(courseId) {
    return database.query(`
      SELECT ca.*, s.name as student_name, s.skill_level as student_skill
      FROM course_assignments ca
      JOIN students s ON ca.student_id = s.id
      WHERE ca.course_id = ? ORDER BY ca.assigned_at
    `, [courseId])
  }

  // ==================== Progress ====================

  markContentComplete(studentId, contentId, data = {}) {
    const id = generateId('lp')
    const now = new Date().toISOString()
    try {
      database.run(
        `INSERT INTO lesson_progress (id, student_id, content_id, completed, puzzle_result, completed_at, xp_earned)
         VALUES (?, ?, ?, 1, ?, ?, ?)`,
        [id, studentId, contentId, data.puzzle_result || null, now, data.xp_earned || 0]
      )
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        database.run('UPDATE lesson_progress SET completed = 1, completed_at = ?, xp_earned = ? WHERE student_id = ? AND content_id = ?',
          [now, data.xp_earned || 0, studentId, contentId])
      } else { throw err }
    }
    return { success: true }
  }

  resetContentProgress(studentId, contentId) {
    database.run('DELETE FROM lesson_progress WHERE student_id = ? AND content_id = ?', [studentId, contentId])
  }

  getStudentCourseProgress(studentId, courseId) {
    return database.query(`
      SELECT lc.id as content_id, lc.content_type, lc.title, lc.lesson_id, lc.order_index, lc.xp_reward,
        COALESCE(lp.completed, 0) as completed, lp.puzzle_result, lp.completed_at, lp.xp_earned
      FROM lesson_content lc
      JOIN lessons l ON lc.lesson_id = l.id
      LEFT JOIN lesson_progress lp ON lp.content_id = lc.id AND lp.student_id = ?
      WHERE l.course_id = ?
      ORDER BY l.order_index, lc.order_index
    `, [studentId, courseId])
  }

  // ==================== Gamification ====================

  getOrCreateGamification(studentId) {
    let gam = database.queryOne('SELECT * FROM student_gamification WHERE student_id = ?', [studentId])
    if (!gam) {
      database.run('INSERT INTO student_gamification (student_id) VALUES (?)', [studentId])
      gam = { student_id: studentId, total_xp: 0, current_streak: 0, longest_streak: 0, last_activity_date: null, badges: '[]' }
    }
    return { ...gam, badges: JSON.parse(gam.badges || '[]') }
  }

  addXP(studentId, xp) {
    this.getOrCreateGamification(studentId)
    database.run('UPDATE student_gamification SET total_xp = total_xp + ? WHERE student_id = ?', [xp, studentId])

    // Update streak
    const today = new Date().toISOString().split('T')[0]
    const gam = database.queryOne('SELECT last_activity_date, current_streak, longest_streak FROM student_gamification WHERE student_id = ?', [studentId])
    if (gam.last_activity_date !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      const newStreak = gam.last_activity_date === yesterday ? gam.current_streak + 1 : 1
      const longest = Math.max(newStreak, gam.longest_streak)
      database.run('UPDATE student_gamification SET current_streak = ?, longest_streak = ?, last_activity_date = ? WHERE student_id = ?',
        [newStreak, longest, today, studentId])
    }
  }

  /**
   * Check and award badges based on current progress.
   * @param {string} studentId
   * @param {string} courseId - optional, to check course-specific badges
   */
  checkAndAwardBadges(studentId, courseId = null) {
    const gam = this.getOrCreateGamification(studentId)
    const badges = new Set(gam.badges)
    const initialCount = badges.size

    // Streak badges
    if (gam.current_streak >= 7) badges.add('streak-7')
    if (gam.current_streak >= 30) badges.add('streak-30')

    // Check course completion
    if (courseId) {
      const progress = this.getStudentCourseProgress(studentId, courseId)
      if (progress.length > 0 && progress.every(p => p.completed)) {
        badges.add(`course-${courseId}`)
        // First course badge
        if (!gam.badges.includes('first-course')) badges.add('first-course')
      }

      // Perfect score (all puzzles correct in a lesson)
      const lessons = database.query('SELECT id FROM lessons WHERE course_id = ?', [courseId])
      for (const lesson of lessons) {
        const items = database.query(
          `SELECT lc.id, lc.content_type, COALESCE(lp.completed, 0) as completed, lp.puzzle_result
           FROM lesson_content lc
           LEFT JOIN lesson_progress lp ON lp.content_id = lc.id AND lp.student_id = ?
           WHERE lc.lesson_id = ?`, [studentId, lesson.id]
        )
        const puzzles = items.filter(i => i.content_type === 'puzzle')
        if (puzzles.length > 0 && puzzles.every(p => p.completed && p.puzzle_result === '1')) {
          badges.add(`perfect-${lesson.id}`)
        }
      }
    }

    // Save if new badges were earned
    if (badges.size > initialCount) {
      database.run('UPDATE student_gamification SET badges = ? WHERE student_id = ?',
        [JSON.stringify([...badges]), studentId])
    }

    return [...badges].filter(b => !gam.badges.includes(b)) // return newly earned
  }
}

export const courseRepository = new CourseRepository()
