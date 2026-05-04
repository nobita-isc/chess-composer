/**
 * courses.js — Admin course management + student course access routes
 */

import { Hono } from 'hono'
import { courseRepository } from '../lessons/CourseRepository.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const courses = new Hono()

// ==================== Admin Routes ====================

courses.get('/', async (c) => {
  try {
    const courseList = await courseRepository.findAllCourses()
    return c.json({ success: true, data: courseList })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

courses.post('/', requireRole('admin'), async (c) => {
  try {
    const { title, description, skill_level, thumbnail_url } = await c.req.json()
    if (!title?.trim()) return c.json({ success: false, error: 'Title is required' }, 400)
    const result = await courseRepository.createCourse({ title: title.trim(), description, skill_level, thumbnail_url })
    return c.json({ success: true, data: result.data }, 201)
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

courses.get('/:id', async (c) => {
  try {
    const course = await courseRepository.findCourseById(c.req.param('id'))
    if (!course) return c.json({ success: false, error: 'Course not found' }, 404)
    const lessons = await courseRepository.findLessonsByCourse(course.id)
    return c.json({ success: true, data: { ...course, lessons } })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

courses.put('/:id', requireRole('admin'), async (c) => {
  try {
    const data = await c.req.json()
    const result = await courseRepository.updateCourse(c.req.param('id'), data)
    if (!result.success) return c.json(result, 404)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

courses.delete('/:id', requireRole('admin'), async (c) => {
  try {
    const result = await courseRepository.deleteCourse(c.req.param('id'))
    if (!result.success) return c.json(result, 404)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== Lessons ====================

courses.get('/:id/lessons', async (c) => {
  try {
    const lessons = await courseRepository.findLessonsByCourse(c.req.param('id'))
    return c.json({ success: true, data: lessons })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

courses.post('/:id/lessons', requireRole('admin'), async (c) => {
  try {
    const data = await c.req.json()
    if (!data.title?.trim()) return c.json({ success: false, error: 'Title is required' }, 400)
    const result = await courseRepository.createLesson(c.req.param('id'), { ...data, title: data.title.trim() })
    return c.json({ success: true, data: result.data }, 201)
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== Assignments ====================

courses.post('/:id/assign', requireRole('admin'), async (c) => {
  try {
    const { studentIds } = await c.req.json()
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return c.json({ success: false, error: 'studentIds array is required' }, 400)
    }
    const results = await Promise.all(studentIds.map(sid => courseRepository.assignCourse(c.req.param('id'), sid)))
    return c.json({ success: true, assigned: results.filter(r => r.success).length })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

courses.get('/:id/assignments', requireRole('admin'), async (c) => {
  try {
    const assignments = await courseRepository.findAssignmentsByCourse(c.req.param('id'))
    return c.json({ success: true, data: assignments })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== Preview ====================

courses.get('/:id/preview', requireRole('admin'), async (c) => {
  try {
    const course = await courseRepository.findCourseById(c.req.param('id'))
    if (!course) return c.json({ success: false, error: 'Course not found' }, 404)
    const lessons = await courseRepository.findLessonsByCourse(course.id)
    const lessonsWithContent = await Promise.all(lessons.map(async lesson => ({
      ...lesson,
      content: await courseRepository.findContentByLesson(lesson.id)
    })))
    return c.json({ success: true, data: { ...course, lessons: lessonsWithContent } })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default courses
