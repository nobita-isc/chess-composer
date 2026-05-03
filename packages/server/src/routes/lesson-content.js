/**
 * lesson-content.js — Lesson CRUD, content management, and student progress routes
 */

import { Hono } from 'hono'
import { courseRepository } from '../lessons/CourseRepository.js'
import { requireRole } from '../middleware/roleMiddleware.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const courseUploadsDir = path.join(__dirname, '../../uploads/courses')
if (!fs.existsSync(courseUploadsDir)) fs.mkdirSync(courseUploadsDir, { recursive: true })

const lessonContent = new Hono()

// ==================== Admin: Lesson Management ====================

lessonContent.put('/lessons/:id', requireRole('admin'), async (c) => {
  try {
    const data = await c.req.json()
    const result = await courseRepository.updateLesson(c.req.param('id'), data)
    if (!result.success) return c.json(result, 404)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.delete('/lessons/:id', requireRole('admin'), async (c) => {
  try {
    const result = await courseRepository.deleteLesson(c.req.param('id'))
    if (!result.success) return c.json(result, 404)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== Admin: Content Items ====================

lessonContent.get('/lessons/:id/content', async (c) => {
  try {
    const content = await courseRepository.findContentByLesson(c.req.param('id'))
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
    if (data.description && typeof data.description === 'string' && data.description.length > 10000) {
      return c.json({ success: false, error: 'Description too long (max 10,000 characters)' }, 400)
    }
    const result = await courseRepository.createContent(c.req.param('id'), { ...data, title: data.title.trim() })
    return c.json({ success: true, data: result.data }, 201)
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.put('/content/:id', requireRole('admin'), async (c) => {
  try {
    const data = await c.req.json()
    if (data.description && typeof data.description === 'string' && data.description.length > 10000) {
      return c.json({ success: false, error: 'Description too long (max 10,000 characters)' }, 400)
    }
    if (data.video_url !== undefined && data.video_url !== null && data.video_url !== '') {
      try {
        const u = new URL(data.video_url)
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Protocol not allowed')
      } catch {
        return c.json({ success: false, error: 'video_url must be a valid http or https URL' }, 400)
      }
    }
    const result = await courseRepository.updateContent(c.req.param('id'), data)
    if (!result.success) return c.json(result, 404)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.delete('/content/:id', requireRole('admin'), async (c) => {
  try {
    const result = await courseRepository.deleteContent(c.req.param('id'))
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
    const result = await courseRepository.reorderContent(c.req.param('id'), orderedIds)
    return c.json(result)
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== File Upload ====================

lessonContent.post('/content/upload', requireRole('admin'), async (c) => {
  try {
    const body = await c.req.parseBody()
    const file = body['file']
    if (!file || typeof file === 'string') return c.json({ success: false, error: 'No file uploaded' }, 400)

    const maxSize = 100 * 1024 * 1024
    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length > maxSize) return c.json({ success: false, error: 'File too large (max 100MB)' }, 400)

    const ext = path.extname(file.name || '').toLowerCase()
    const allowed = ['.mp4', '.pdf', '.png', '.jpg', '.jpeg', '.webm']
    if (!allowed.includes(ext)) return c.json({ success: false, error: `File type ${ext} not allowed` }, 400)

    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`
    const filePath = path.join(courseUploadsDir, filename)
    fs.writeFileSync(filePath, buffer)

    return c.json({
      success: true,
      data: { file_path: `/uploads/courses/${filename}`, file_name: file.name, file_size: buffer.length }
    })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== Student: My Courses ====================

lessonContent.get('/my/courses', async (c) => {
  try {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    const assignments = await courseRepository.findAssignmentsByStudent(user.student_id)

    const coursesWithProgress = await Promise.all(assignments.map(async a => {
      const progress = await courseRepository.getStudentCourseProgress(user.student_id, a.course_id)
      const total = progress.length
      const completed = progress.filter(p => p.completed).length
      const totalXP = progress.reduce((sum, p) => sum + (p.xp_earned || 0), 0)
      return { ...a, total_items: total, completed_items: completed, progress_pct: total > 0 ? Math.round((completed / total) * 100) : 0, total_xp: totalXP }
    }))

    return c.json({ success: true, data: coursesWithProgress })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.get('/my/courses/:id', async (c) => {
  try {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    const course = await courseRepository.findCourseById(c.req.param('id'))
    if (!course) return c.json({ success: false, error: 'Course not found' }, 404)

    const lessons = await courseRepository.findLessonsByCourse(course.id)
    const progress = await courseRepository.getStudentCourseProgress(user.student_id, course.id)
    const progressMap = new Map(progress.map(p => [p.content_id, p]))

    const lessonsWithProgress = await Promise.all(lessons.map(async lesson => {
      const content = (await courseRepository.findContentByLesson(lesson.id)).map(item => ({
        ...item,
        completed: progressMap.get(item.id)?.completed || 0,
        puzzle_result: progressMap.get(item.id)?.puzzle_result || null
      }))
      const total = content.length
      const done = content.filter(c => c.completed).length
      return { ...lesson, content, total_items: total, completed_items: done }
    }))

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

    const content = await courseRepository.findContentById(contentId)
    if (!content) return c.json({ success: false, error: 'Content not found' }, 404)
    const xpReward = content.xp_reward || 10

    await courseRepository.markContentComplete(user.student_id, contentId, {
      puzzle_result: body.puzzle_result || null,
      xp_earned: xpReward
    })

    await courseRepository.addXP(user.student_id, xpReward)
    const newBadges = await courseRepository.checkAndAwardBadges(user.student_id, body.course_id || null)

    return c.json({ success: true, xp_earned: xpReward, new_badges: newBadges })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.put('/my/content/:id/reset', async (c) => {
  try {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    const contentId = c.req.param('id')
    await courseRepository.resetContentProgress(user.student_id, contentId)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

lessonContent.get('/my/gamification', async (c) => {
  try {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    const gam = await courseRepository.getOrCreateGamification(user.student_id)
    return c.json({ success: true, data: gam })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default lessonContent
