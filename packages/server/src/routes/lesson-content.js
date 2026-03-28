/**
 * lesson-content.js — Lesson CRUD, content management, and student progress routes
 */

import { Hono } from 'hono'
import { courseRepository } from '../lessons/CourseRepository.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const lessonContent = new Hono()

// ==================== Admin: Lesson Management ====================

lessonContent.put('/lessons/:id', requireRole('admin'), async (c) => {
  try {
    const data = await c.req.json()
    const result = courseRepository.updateLesson(c.req.param('id'), data)
    if (!result.success) return c.json(result, 404)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.delete('/lessons/:id', requireRole('admin'), (c) => {
  try {
    const result = courseRepository.deleteLesson(c.req.param('id'))
    if (!result.success) return c.json(result, 404)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== Admin: Content Items ====================

lessonContent.get('/lessons/:id/content', (c) => {
  try {
    const content = courseRepository.findContentByLesson(c.req.param('id'))
    return c.json({ success: true, data: content })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.post('/lessons/:id/content', requireRole('admin'), async (c) => {
  try {
    const data = await c.req.json()
    if (!data.content_type) return c.json({ success: false, error: 'content_type required' }, 400)
    if (!data.title?.trim()) return c.json({ success: false, error: 'title required' }, 400)
    const valid = ['video', 'pdf', 'puzzle', 'quiz']
    if (!valid.includes(data.content_type)) return c.json({ success: false, error: `content_type must be: ${valid.join(', ')}` }, 400)
    const result = courseRepository.createContent(c.req.param('id'), { ...data, title: data.title.trim() })
    return c.json({ success: true, data: result.data }, 201)
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.put('/content/:id', requireRole('admin'), async (c) => {
  try {
    const data = await c.req.json()
    const result = courseRepository.updateContent(c.req.param('id'), data)
    if (!result.success) return c.json(result, 404)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.delete('/content/:id', requireRole('admin'), (c) => {
  try {
    const result = courseRepository.deleteContent(c.req.param('id'))
    if (!result.success) return c.json(result, 404)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.put('/lessons/:id/reorder', requireRole('admin'), async (c) => {
  try {
    const { orderedIds } = await c.req.json()
    if (!Array.isArray(orderedIds)) return c.json({ success: false, error: 'orderedIds array required' }, 400)
    const result = courseRepository.reorderContent(c.req.param('id'), orderedIds)
    return c.json(result)
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== Student: My Courses ====================

lessonContent.get('/my/courses', (c) => {
  try {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    const assignments = courseRepository.findAssignmentsByStudent(user.student_id)

    // Add progress info per course
    const coursesWithProgress = assignments.map(a => {
      const progress = courseRepository.getStudentCourseProgress(user.student_id, a.course_id)
      const total = progress.length
      const completed = progress.filter(p => p.completed).length
      const totalXP = progress.reduce((sum, p) => sum + (p.xp_earned || 0), 0)
      return { ...a, total_items: total, completed_items: completed, progress_pct: total > 0 ? Math.round((completed / total) * 100) : 0, total_xp: totalXP }
    })

    return c.json({ success: true, data: coursesWithProgress })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.get('/my/courses/:id', (c) => {
  try {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    const course = courseRepository.findCourseById(c.req.param('id'))
    if (!course) return c.json({ success: false, error: 'Course not found' }, 404)

    const lessons = courseRepository.findLessonsByCourse(course.id)
    const progress = courseRepository.getStudentCourseProgress(user.student_id, course.id)
    const progressMap = new Map(progress.map(p => [p.content_id, p]))

    const lessonsWithProgress = lessons.map(lesson => {
      const content = courseRepository.findContentByLesson(lesson.id).map(item => ({
        ...item,
        completed: progressMap.get(item.id)?.completed || 0,
        puzzle_result: progressMap.get(item.id)?.puzzle_result || null
      }))
      const total = content.length
      const done = content.filter(c => c.completed).length
      return { ...lesson, content, total_items: total, completed_items: done }
    })

    return c.json({ success: true, data: { ...course, lessons: lessonsWithProgress } })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.put('/my/content/:id/complete', async (c) => {
  try {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    const body = await c.req.json()
    const contentId = c.req.param('id')

    // Get content item for XP
    const content = courseRepository.findContentByLesson ? null : null // lookup via direct query
    const xpReward = body.xp_earned || 10

    courseRepository.markContentComplete(user.student_id, contentId, {
      puzzle_result: body.puzzle_result || null,
      xp_earned: xpReward
    })

    // Add XP to gamification
    courseRepository.addXP(user.student_id, xpReward)

    return c.json({ success: true, xp_earned: xpReward })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.get('/my/gamification', (c) => {
  try {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    const gam = courseRepository.getOrCreateGamification(user.student_id)
    return c.json({ success: true, data: gam })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default lessonContent
