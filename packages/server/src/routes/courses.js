/**
 * courses.js — Admin course management + student course access routes
 */

import { Hono } from 'hono'
import { courseRepository } from '../lessons/CourseRepository.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const courses = new Hono()

// ==================== Admin Routes ====================

courses.get('/', (c) => {
  try {
    const courseList = courseRepository.findAllCourses()
    return c.json({ success: true, data: courseList })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

courses.post('/', requireRole('admin'), async (c) => {
  try {
    const { title, description, skill_level, thumbnail_url } = await c.req.json()
    if (!title?.trim()) return c.json({ success: false, error: 'Title is required' }, 400)
    const result = courseRepository.createCourse({ title: title.trim(), description, skill_level, thumbnail_url })
    return c.json({ success: true, data: result.data }, 201)
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

courses.get('/:id', (c) => {
  try {
    const course = courseRepository.findCourseById(c.req.param('id'))
    if (!course) return c.json({ success: false, error: 'Course not found' }, 404)
    const lessons = courseRepository.findLessonsByCourse(course.id)
    return c.json({ success: true, data: { ...course, lessons } })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

courses.put('/:id', requireRole('admin'), async (c) => {
  try {
    const data = await c.req.json()
    const result = courseRepository.updateCourse(c.req.param('id'), data)
    if (!result.success) return c.json(result, 404)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

courses.delete('/:id', requireRole('admin'), (c) => {
  try {
    const result = courseRepository.deleteCourse(c.req.param('id'))
    if (!result.success) return c.json(result, 404)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== Lessons ====================

courses.get('/:id/lessons', (c) => {
  try {
    const lessons = courseRepository.findLessonsByCourse(c.req.param('id'))
    return c.json({ success: true, data: lessons })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

courses.post('/:id/lessons', requireRole('admin'), async (c) => {
  try {
    const data = await c.req.json()
    if (!data.title?.trim()) return c.json({ success: false, error: 'Title is required' }, 400)
    const result = courseRepository.createLesson(c.req.param('id'), { ...data, title: data.title.trim() })
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
    const results = studentIds.map(sid => courseRepository.assignCourse(c.req.param('id'), sid))
    return c.json({ success: true, assigned: results.filter(r => r.success).length })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

courses.get('/:id/assignments', requireRole('admin'), (c) => {
  try {
    const assignments = courseRepository.findAssignmentsByCourse(c.req.param('id'))
    return c.json({ success: true, data: assignments })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== Preview ====================

courses.get('/:id/preview', requireRole('admin'), (c) => {
  try {
    const course = courseRepository.findCourseById(c.req.param('id'))
    if (!course) return c.json({ success: false, error: 'Course not found' }, 404)
    const lessons = courseRepository.findLessonsByCourse(course.id)
    const lessonsWithContent = lessons.map(lesson => ({
      ...lesson,
      content: courseRepository.findContentByLesson(lesson.id)
    }))
    return c.json({ success: true, data: { ...course, lessons: lessonsWithContent } })
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export default courses
