/**
 * Tests for course API routes — CRUD, assignments, content management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

const mockRepo = {
  findAllCourses: vi.fn(() => []),
  findCourseById: vi.fn(() => null),
  createCourse: vi.fn(() => ({ success: true, data: { id: 'c1' } })),
  updateCourse: vi.fn(() => ({ success: true })),
  deleteCourse: vi.fn(() => ({ success: true })),
  findLessonsByCourse: vi.fn(() => []),
  createLesson: vi.fn(() => ({ success: true, data: { id: 'l1' } })),
  updateLesson: vi.fn(() => ({ success: true })),
  deleteLesson: vi.fn(() => ({ success: true })),
  findContentByLesson: vi.fn(() => []),
  createContent: vi.fn(() => ({ success: true, data: { id: 'lc1' } })),
  updateContent: vi.fn(() => ({ success: true })),
  deleteContent: vi.fn(() => ({ success: true })),
  assignCourse: vi.fn(() => ({ success: true })),
  findAssignmentsByCourse: vi.fn(() => []),
  findAssignmentsByStudent: vi.fn(() => []),
  getStudentCourseProgress: vi.fn(() => []),
  markContentComplete: vi.fn(() => ({ success: true })),
  addXP: vi.fn(),
  checkAndAwardBadges: vi.fn(() => []),
  getOrCreateGamification: vi.fn(() => ({ total_xp: 100, current_streak: 3, longest_streak: 7, badges: [] }))
}

function createApp(role = 'admin', studentId = null) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { id: 'u1', role, student_id: studentId })
    await next()
  })

  // Admin routes
  app.get('/courses', (c) => c.json({ success: true, data: mockRepo.findAllCourses() }))
  app.post('/courses', async (c) => {
    if (c.get('user').role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
    const { title } = await c.req.json()
    if (!title?.trim()) return c.json({ error: 'Title required' }, 400)
    return c.json({ success: true, data: mockRepo.createCourse({ title }).data }, 201)
  })
  app.put('/courses/:id', async (c) => {
    if (c.get('user').role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
    const result = mockRepo.updateCourse(c.req.param('id'), await c.req.json())
    return result.success ? c.json({ success: true }) : c.json(result, 404)
  })
  app.delete('/courses/:id', (c) => {
    if (c.get('user').role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
    const result = mockRepo.deleteCourse(c.req.param('id'))
    return result.success ? c.json({ success: true }) : c.json(result, 404)
  })
  app.post('/courses/:id/assign', async (c) => {
    if (c.get('user').role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
    const { studentIds } = await c.req.json()
    if (!Array.isArray(studentIds) || !studentIds.length) return c.json({ error: 'studentIds required' }, 400)
    const results = studentIds.map(sid => mockRepo.assignCourse(c.req.param('id'), sid))
    return c.json({ success: true, assigned: results.filter(r => r.success).length })
  })
  app.post('/lessons/:id/content', async (c) => {
    if (c.get('user').role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
    const data = await c.req.json()
    if (!data.content_type) return c.json({ error: 'content_type required' }, 400)
    if (!data.title?.trim()) return c.json({ error: 'title required' }, 400)
    return c.json({ success: true, data: mockRepo.createContent(c.req.param('id'), data).data }, 201)
  })

  // Student routes
  app.get('/my/courses', (c) => {
    const user = c.get('user')
    if (!user.student_id) return c.json({ error: 'Student required' }, 403)
    return c.json({ success: true, data: mockRepo.findAssignmentsByStudent(user.student_id) })
  })
  app.put('/my/content/:id/complete', async (c) => {
    const user = c.get('user')
    if (!user.student_id) return c.json({ error: 'Student required' }, 403)
    mockRepo.markContentComplete(user.student_id, c.req.param('id'), {})
    mockRepo.addXP(user.student_id, 10)
    return c.json({ success: true, xp_earned: 10 })
  })
  app.get('/my/gamification', (c) => {
    const user = c.get('user')
    if (!user.student_id) return c.json({ error: 'Student required' }, 403)
    return c.json({ success: true, data: mockRepo.getOrCreateGamification(user.student_id) })
  })

  return app
}

describe('Course API Routes', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('GET /courses', () => {
    it('returns course list', async () => {
      mockRepo.findAllCourses.mockReturnValue([{ id: 'c1', title: 'Test' }])
      const res = await createApp().request('/courses')
      expect(res.status).toBe(200)
      expect((await res.json()).data).toHaveLength(1)
    })
  })

  describe('POST /courses', () => {
    it('creates course with valid title', async () => {
      const res = await createApp().request('/courses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Course' })
      })
      expect(res.status).toBe(201)
    })

    it('rejects empty title', async () => {
      const res = await createApp().request('/courses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '' })
      })
      expect(res.status).toBe(400)
    })

    it('rejects student role', async () => {
      const res = await createApp('student').request('/courses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Hack' })
      })
      expect(res.status).toBe(403)
    })
  })

  describe('PUT /courses/:id', () => {
    it('updates course', async () => {
      const res = await createApp().request('/courses/c1', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' })
      })
      expect(res.status).toBe(200)
    })

    it('returns 404 for non-existent', async () => {
      mockRepo.updateCourse.mockReturnValue({ success: false, error: 'Not found' })
      const res = await createApp().request('/courses/bad', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'X' })
      })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /courses/:id', () => {
    it('deletes course', async () => {
      const res = await createApp().request('/courses/c1', { method: 'DELETE' })
      expect(res.status).toBe(200)
    })
  })

  describe('POST /courses/:id/assign', () => {
    it('assigns to students', async () => {
      const res = await createApp().request('/courses/c1/assign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: ['s1', 's2'] })
      })
      const json = await res.json()
      expect(json.assigned).toBe(2)
    })

    it('rejects empty array', async () => {
      const res = await createApp().request('/courses/c1/assign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: [] })
      })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /lessons/:id/content', () => {
    it('creates content item', async () => {
      const res = await createApp().request('/lessons/l1/content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type: 'video', title: 'Intro' })
      })
      expect(res.status).toBe(201)
    })

    it('rejects missing content_type', async () => {
      const res = await createApp().request('/lessons/l1/content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'No type' })
      })
      expect(res.status).toBe(400)
    })

    it('rejects missing title', async () => {
      const res = await createApp().request('/lessons/l1/content', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type: 'video' })
      })
      expect(res.status).toBe(400)
    })
  })

  describe('Student routes', () => {
    it('GET /my/courses requires student_id', async () => {
      const res = await createApp('admin', null).request('/my/courses')
      expect(res.status).toBe(403)
    })

    it('GET /my/courses returns assignments', async () => {
      mockRepo.findAssignmentsByStudent.mockReturnValue([{ course_id: 'c1', title: 'Test' }])
      const res = await createApp('student', 's1').request('/my/courses')
      expect(res.status).toBe(200)
      expect((await res.json()).data).toHaveLength(1)
    })

    it('PUT /my/content/:id/complete marks complete + adds XP', async () => {
      const res = await createApp('student', 's1').request('/my/content/lc1/complete', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const json = await res.json()
      expect(json.xp_earned).toBe(10)
      expect(mockRepo.markContentComplete).toHaveBeenCalled()
      expect(mockRepo.addXP).toHaveBeenCalledWith('s1', 10)
    })

    it('GET /my/gamification returns stats', async () => {
      const res = await createApp('student', 's1').request('/my/gamification')
      const json = await res.json()
      expect(json.data.total_xp).toBe(100)
      expect(json.data.current_streak).toBe(3)
    })
  })
})
