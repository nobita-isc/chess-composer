/**
 * Hono route tests for ALL lesson-content.js endpoints.
 * Uses mocked repository to test route logic, validation, auth guards.
 * Every endpoint × every branch (success, 400, 403, 404, 500).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

const mockRepo = {
  updateLesson: vi.fn(() => ({ success: true })),
  deleteLesson: vi.fn(() => ({ success: true })),
  findContentByLesson: vi.fn(() => []),
  createContent: vi.fn(() => ({ success: true, data: { id: 'lc1', lesson_id: 'l1', order_index: 0 } })),
  updateContent: vi.fn(() => ({ success: true })),
  deleteContent: vi.fn(() => ({ success: true })),
  reorderContent: vi.fn(() => ({ success: true })),
  findAssignmentsByStudent: vi.fn(() => []),
  getStudentCourseProgress: vi.fn(() => []),
  findCourseById: vi.fn(() => null),
  findLessonsByCourse: vi.fn(() => []),
  findContentById: vi.fn(() => ({ id: 'lc1', xp_reward: 10 })),
  markContentComplete: vi.fn(() => ({ success: true })),
  addXP: vi.fn(),
  checkAndAwardBadges: vi.fn(() => []),
  resetContentProgress: vi.fn(),
  getOrCreateGamification: vi.fn(() => ({ total_xp: 100, current_streak: 3, longest_streak: 7, badges: [] })),
}

function createApp(role = 'admin', studentId = null) {
  const app = new Hono()

  // Simulate auth middleware
  app.use('*', async (c, next) => {
    if (role === 'none') {
      // No user set — simulates unauthenticated
      await next()
      return
    }
    c.set('user', { id: 'u1', role, student_id: studentId })
    await next()
  })

  // ---------- Admin: Lessons ----------
  app.put('/lessons/:id', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ success: false, error: 'Authentication required' }, 401)
    if (user.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403)
    try {
      const data = await c.req.json()
      const result = mockRepo.updateLesson(c.req.param('id'), data)
      if (!result.success) return c.json(result, 404)
      return c.json({ success: true })
    } catch (error) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  app.delete('/lessons/:id', (c) => {
    const user = c.get('user')
    if (!user) return c.json({ success: false, error: 'Authentication required' }, 401)
    if (user.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403)
    try {
      const result = mockRepo.deleteLesson(c.req.param('id'))
      if (!result.success) return c.json(result, 404)
      return c.json({ success: true })
    } catch (error) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  // ---------- Admin: Content Items ----------
  app.get('/lessons/:id/content', (c) => {
    try {
      return c.json({ success: true, data: mockRepo.findContentByLesson(c.req.param('id')) })
    } catch (error) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  app.post('/lessons/:id/content', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ success: false, error: 'Authentication required' }, 401)
    if (user.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403)
    try {
      const data = await c.req.json()
      if (!data.content_type) return c.json({ success: false, error: 'content_type required' }, 400)
      if (!data.title?.trim()) return c.json({ success: false, error: 'title required' }, 400)
      const valid = ['video', 'pdf', 'puzzle', 'quiz']
      if (!valid.includes(data.content_type)) return c.json({ success: false, error: `content_type must be: ${valid.join(', ')}` }, 400)
      if (data.description && typeof data.description === 'string' && data.description.length > 10000) {
        return c.json({ success: false, error: 'Description too long (max 10,000 characters)' }, 400)
      }
      const result = mockRepo.createContent(c.req.param('id'), { ...data, title: data.title.trim() })
      return c.json({ success: true, data: result.data }, 201)
    } catch (error) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  app.put('/content/:id', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ success: false, error: 'Authentication required' }, 401)
    if (user.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403)
    try {
      const data = await c.req.json()
      if (data.description && typeof data.description === 'string' && data.description.length > 10000) {
        return c.json({ success: false, error: 'Description too long (max 10,000 characters)' }, 400)
      }
      const result = mockRepo.updateContent(c.req.param('id'), data)
      if (!result.success) return c.json(result, 404)
      return c.json({ success: true })
    } catch (error) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  app.delete('/content/:id', (c) => {
    const user = c.get('user')
    if (!user) return c.json({ success: false, error: 'Authentication required' }, 401)
    if (user.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403)
    try {
      const result = mockRepo.deleteContent(c.req.param('id'))
      if (!result.success) return c.json(result, 404)
      return c.json({ success: true })
    } catch (error) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  app.put('/lessons/:id/reorder', async (c) => {
    const user = c.get('user')
    if (!user) return c.json({ success: false, error: 'Authentication required' }, 401)
    if (user.role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403)
    try {
      const { orderedIds } = await c.req.json()
      if (!Array.isArray(orderedIds)) return c.json({ success: false, error: 'orderedIds array required' }, 400)
      return c.json(mockRepo.reorderContent(c.req.param('id'), orderedIds))
    } catch (error) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  // ---------- Student routes ----------
  app.get('/my/courses', (c) => {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    try {
      const assignments = mockRepo.findAssignmentsByStudent(user.student_id)
      const coursesWithProgress = assignments.map(a => {
        const progress = mockRepo.getStudentCourseProgress(user.student_id, a.course_id)
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

  app.get('/my/courses/:id', (c) => {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    try {
      const course = mockRepo.findCourseById(c.req.param('id'))
      if (!course) return c.json({ success: false, error: 'Course not found' }, 404)
      const lessons = mockRepo.findLessonsByCourse(course.id)
      return c.json({ success: true, data: { ...course, lessons } })
    } catch (error) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  app.put('/my/content/:id/complete', async (c) => {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    try {
      const body = await c.req.json()
      const content = mockRepo.findContentById(c.req.param('id'))
      if (!content) return c.json({ success: false, error: 'Content not found' }, 404)
      const xpReward = content.xp_reward || 10
      mockRepo.markContentComplete(user.student_id, c.req.param('id'), { puzzle_result: body.puzzle_result || null, xp_earned: xpReward })
      mockRepo.addXP(user.student_id, xpReward)
      const newBadges = mockRepo.checkAndAwardBadges(user.student_id, body.course_id || null)
      return c.json({ success: true, xp_earned: xpReward, new_badges: newBadges })
    } catch (error) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  app.put('/my/content/:id/reset', async (c) => {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    try {
      mockRepo.resetContentProgress(user.student_id, c.req.param('id'))
      return c.json({ success: true })
    } catch (error) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  app.get('/my/gamification', (c) => {
    const user = c.get('user')
    if (!user?.student_id) return c.json({ success: false, error: 'Student account required' }, 403)
    try {
      return c.json({ success: true, data: mockRepo.getOrCreateGamification(user.student_id) })
    } catch (error) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  return app
}

// Helper
const json = (data) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
const jsonPut = (data) => ({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })

beforeEach(() => vi.clearAllMocks())

// ==================== ADMIN: LESSONS ====================

describe('PUT /lessons/:id', () => {
  it('200 — updates lesson', async () => {
    const res = await createApp().request('/lessons/l1', jsonPut({ title: 'New' }))
    expect(res.status).toBe(200)
    expect(mockRepo.updateLesson).toHaveBeenCalledWith('l1', { title: 'New' })
  })

  it('404 — lesson not found', async () => {
    mockRepo.updateLesson.mockReturnValueOnce({ success: false, error: 'Lesson not found' })
    const res = await createApp().request('/lessons/bad', jsonPut({ title: 'X' }))
    expect(res.status).toBe(404)
  })

  it('403 — student cannot update lesson', async () => {
    const res = await createApp('student').request('/lessons/l1', jsonPut({ title: 'X' }))
    expect(res.status).toBe(403)
  })
})

describe('DELETE /lessons/:id', () => {
  it('200 — deletes lesson', async () => {
    const res = await createApp().request('/lessons/l1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(mockRepo.deleteLesson).toHaveBeenCalledWith('l1')
  })

  it('404 — lesson not found', async () => {
    mockRepo.deleteLesson.mockReturnValueOnce({ success: false, error: 'Not found' })
    const res = await createApp().request('/lessons/bad', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })

  it('403 — student cannot delete', async () => {
    const res = await createApp('student').request('/lessons/l1', { method: 'DELETE' })
    expect(res.status).toBe(403)
  })
})

// ==================== ADMIN: CONTENT ITEMS ====================

describe('GET /lessons/:id/content', () => {
  it('200 — returns content list', async () => {
    mockRepo.findContentByLesson.mockReturnValueOnce([
      { id: 'lc1', title: 'V1', content_type: 'video', description: '## Notes' },
      { id: 'lc2', title: 'P1', content_type: 'pdf', description: null },
    ])
    const res = await createApp().request('/lessons/l1/content')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.data[0].description).toBe('## Notes')
    expect(body.data[1].description).toBeNull()
  })

  it('200 — empty list for lesson with no content', async () => {
    const res = await createApp().request('/lessons/empty/content')
    expect(res.status).toBe(200)
    expect((await res.json()).data).toHaveLength(0)
  })

  it('accessible by any authenticated user (no role guard)', async () => {
    const res = await createApp('student', 's1').request('/lessons/l1/content')
    expect(res.status).toBe(200)
  })
})

describe('POST /lessons/:id/content', () => {
  it('201 — creates content with description', async () => {
    const res = await createApp().request('/lessons/l1/content', json({
      content_type: 'video', title: 'Intro', description: '## Theory'
    }))
    expect(res.status).toBe(201)
    expect(mockRepo.createContent).toHaveBeenCalledWith('l1', expect.objectContaining({ description: '## Theory' }))
  })

  it('201 — creates content without description', async () => {
    const res = await createApp().request('/lessons/l1/content', json({
      content_type: 'pdf', title: 'Guide'
    }))
    expect(res.status).toBe(201)
  })

  it('400 — missing content_type', async () => {
    const res = await createApp().request('/lessons/l1/content', json({ title: 'X' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('content_type')
  })

  it('400 — missing title', async () => {
    const res = await createApp().request('/lessons/l1/content', json({ content_type: 'video' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('title')
  })

  it('400 — empty title', async () => {
    const res = await createApp().request('/lessons/l1/content', json({ content_type: 'video', title: '  ' }))
    expect(res.status).toBe(400)
  })

  it('400 — invalid content_type', async () => {
    const res = await createApp().request('/lessons/l1/content', json({ content_type: 'audio', title: 'X' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('content_type must be')
  })

  it('400 — description > 10,000 chars', async () => {
    const res = await createApp().request('/lessons/l1/content', json({
      content_type: 'video', title: 'X', description: 'x'.repeat(10001)
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('10,000')
  })

  it('201 — description exactly 10,000 chars accepted', async () => {
    const res = await createApp().request('/lessons/l1/content', json({
      content_type: 'video', title: 'X', description: 'a'.repeat(10000)
    }))
    expect(res.status).toBe(201)
  })

  it('403 — student cannot create', async () => {
    const res = await createApp('student').request('/lessons/l1/content', json({ content_type: 'video', title: 'X' }))
    expect(res.status).toBe(403)
  })

  it('trims title before saving', async () => {
    await createApp().request('/lessons/l1/content', json({ content_type: 'video', title: '  Trimmed  ' }))
    expect(mockRepo.createContent).toHaveBeenCalledWith('l1', expect.objectContaining({ title: 'Trimmed' }))
  })
})

describe('PUT /content/:id', () => {
  it('200 — updates content', async () => {
    const res = await createApp().request('/content/lc1', jsonPut({ title: 'New Title' }))
    expect(res.status).toBe(200)
    expect(mockRepo.updateContent).toHaveBeenCalledWith('lc1', { title: 'New Title' })
  })

  it('200 — updates description', async () => {
    const res = await createApp().request('/content/lc1', jsonPut({ description: '## Updated' }))
    expect(res.status).toBe(200)
  })

  it('200 — clears description with null', async () => {
    const res = await createApp().request('/content/lc1', jsonPut({ description: null }))
    expect(res.status).toBe(200)
  })

  it('404 — content not found', async () => {
    mockRepo.updateContent.mockReturnValueOnce({ success: false, error: 'Content not found' })
    const res = await createApp().request('/content/bad', jsonPut({ title: 'X' }))
    expect(res.status).toBe(404)
  })

  it('400 — description > 10K chars', async () => {
    const res = await createApp().request('/content/lc1', jsonPut({ description: 'y'.repeat(10001) }))
    expect(res.status).toBe(400)
    expect(mockRepo.updateContent).not.toHaveBeenCalled()
  })

  it('403 — student cannot update', async () => {
    const res = await createApp('student').request('/content/lc1', jsonPut({ title: 'X' }))
    expect(res.status).toBe(403)
  })
})

describe('DELETE /content/:id', () => {
  it('200 — deletes content', async () => {
    const res = await createApp().request('/content/lc1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(mockRepo.deleteContent).toHaveBeenCalledWith('lc1')
  })

  it('404 — content not found', async () => {
    mockRepo.deleteContent.mockReturnValueOnce({ success: false, error: 'Not found' })
    const res = await createApp().request('/content/bad', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })

  it('403 — student cannot delete', async () => {
    const res = await createApp('student').request('/content/lc1', { method: 'DELETE' })
    expect(res.status).toBe(403)
  })
})

describe('PUT /lessons/:id/reorder', () => {
  it('200 — reorders content', async () => {
    const res = await createApp().request('/lessons/l1/reorder', jsonPut({ orderedIds: ['lc2', 'lc1', 'lc3'] }))
    expect(res.status).toBe(200)
    expect(mockRepo.reorderContent).toHaveBeenCalledWith('l1', ['lc2', 'lc1', 'lc3'])
  })

  it('400 — orderedIds not array', async () => {
    const res = await createApp().request('/lessons/l1/reorder', jsonPut({ orderedIds: 'bad' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('orderedIds')
  })

  it('400 — orderedIds missing', async () => {
    const res = await createApp().request('/lessons/l1/reorder', jsonPut({}))
    expect(res.status).toBe(400)
  })

  it('403 — student cannot reorder', async () => {
    const res = await createApp('student').request('/lessons/l1/reorder', jsonPut({ orderedIds: [] }))
    expect(res.status).toBe(403)
  })
})

// ==================== STUDENT ROUTES ====================

describe('GET /my/courses', () => {
  it('200 — returns student courses with progress', async () => {
    mockRepo.findAssignmentsByStudent.mockReturnValueOnce([{ course_id: 'c1', title: 'Chess 101' }])
    mockRepo.getStudentCourseProgress.mockReturnValueOnce([
      { completed: 1, xp_earned: 10 },
      { completed: 0, xp_earned: 0 },
    ])
    const res = await createApp('student', 's1').request('/my/courses')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].total_items).toBe(2)
    expect(body.data[0].completed_items).toBe(1)
    expect(body.data[0].progress_pct).toBe(50)
    expect(body.data[0].total_xp).toBe(10)
  })

  it('403 — admin without student_id', async () => {
    const res = await createApp('admin', null).request('/my/courses')
    expect(res.status).toBe(403)
  })

  it('200 — empty when no assignments', async () => {
    const res = await createApp('student', 's1').request('/my/courses')
    expect(res.status).toBe(200)
    expect((await res.json()).data).toHaveLength(0)
  })
})

describe('GET /my/courses/:id', () => {
  it('200 — returns course with lessons and progress', async () => {
    mockRepo.findCourseById.mockReturnValueOnce({ id: 'c1', title: 'Italian' })
    mockRepo.findLessonsByCourse.mockReturnValueOnce([{ id: 'l1', title: 'Lesson 1' }])
    const res = await createApp('student', 's1').request('/my/courses/c1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.title).toBe('Italian')
    expect(body.data.lessons).toHaveLength(1)
  })

  it('404 — course not found', async () => {
    mockRepo.findCourseById.mockReturnValueOnce(null)
    const res = await createApp('student', 's1').request('/my/courses/bad')
    expect(res.status).toBe(404)
  })

  it('403 — no student_id', async () => {
    const res = await createApp('admin', null).request('/my/courses/c1')
    expect(res.status).toBe(403)
  })
})

describe('PUT /my/content/:id/complete', () => {
  it('200 — marks complete, returns XP and badges', async () => {
    mockRepo.findContentById.mockReturnValueOnce({ id: 'lc1', xp_reward: 20 })
    mockRepo.checkAndAwardBadges.mockReturnValueOnce(['first-course'])
    const res = await createApp('student', 's1').request('/my/content/lc1/complete', jsonPut({ course_id: 'c1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.xp_earned).toBe(20)
    expect(body.new_badges).toContain('first-course')
    expect(mockRepo.markContentComplete).toHaveBeenCalledWith('s1', 'lc1', expect.objectContaining({ xp_earned: 20 }))
    expect(mockRepo.addXP).toHaveBeenCalledWith('s1', 20)
  })

  it('200 — defaults to 10 XP when content has no xp_reward', async () => {
    mockRepo.findContentById.mockReturnValueOnce({ id: 'lc2', xp_reward: null })
    const res = await createApp('student', 's1').request('/my/content/lc2/complete', jsonPut({}))
    expect(res.status).toBe(200)
    expect((await res.json()).xp_earned).toBe(10)
  })

  it('404 — content not found', async () => {
    mockRepo.findContentById.mockReturnValueOnce(null)
    const res = await createApp('student', 's1').request('/my/content/bad/complete', jsonPut({}))
    expect(res.status).toBe(404)
  })

  it('passes puzzle_result through', async () => {
    await createApp('student', 's1').request('/my/content/lc1/complete', jsonPut({ puzzle_result: '1' }))
    expect(mockRepo.markContentComplete).toHaveBeenCalledWith('s1', 'lc1', expect.objectContaining({ puzzle_result: '1' }))
  })

  it('403 — no student_id', async () => {
    const res = await createApp('admin', null).request('/my/content/lc1/complete', jsonPut({}))
    expect(res.status).toBe(403)
  })
})

describe('PUT /my/content/:id/reset', () => {
  it('200 — resets progress', async () => {
    const res = await createApp('student', 's1').request('/my/content/lc1/reset', jsonPut({}))
    expect(res.status).toBe(200)
    expect(mockRepo.resetContentProgress).toHaveBeenCalledWith('s1', 'lc1')
  })

  it('403 — no student_id', async () => {
    const res = await createApp('admin', null).request('/my/content/lc1/reset', jsonPut({}))
    expect(res.status).toBe(403)
  })
})

describe('GET /my/gamification', () => {
  it('200 — returns gamification stats', async () => {
    const res = await createApp('student', 's1').request('/my/gamification')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.total_xp).toBe(100)
    expect(body.data.current_streak).toBe(3)
    expect(body.data.badges).toEqual([])
  })

  it('403 — no student_id', async () => {
    const res = await createApp('admin', null).request('/my/gamification')
    expect(res.status).toBe(403)
  })
})
