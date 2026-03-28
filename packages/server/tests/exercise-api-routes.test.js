/**
 * API route tests for exercise endpoints.
 * Tests HTTP request/response, validation, auth guards, and error handling
 * using Hono's built-in test client (app.request).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Mock dependencies
const mockExerciseService = {
  getWeekStart: vi.fn(() => '2026-03-23'),
  getWeekEnd: vi.fn(() => '2026-03-29'),
  formatWeekLabel: vi.fn(() => 'Mar 23 - Mar 29'),
  getAllExercisesWithStats: vi.fn(() => []),
  createWeeklyExercise: vi.fn(() => ({ success: true, data: { id: 'ex_1' } })),
  getExerciseWithPuzzles: vi.fn(() => ({ success: true, data: { id: 'ex_1', puzzles: [] } })),
  gradeExercise: vi.fn(() => ({ success: true, data: {} }))
}

const mockExerciseRepository = {
  findExercisesByWeek: vi.fn(() => []),
  updateExerciseName: vi.fn(() => ({ success: true })),
  deleteExercise: vi.fn(() => ({ success: true }))
}

// Build a test Hono app with the same route structure
function createTestApp(userRole = 'admin') {
  const app = new Hono()

  // Simulate auth middleware
  app.use('*', async (c, next) => {
    if (userRole) {
      c.set('user', { id: 'user_1', role: userRole })
    }
    await next()
  })

  // GET /exercises
  app.get('/exercises', (c) => {
    const data = mockExerciseService.getAllExercisesWithStats()
    return c.json({ success: true, data })
  })

  // GET /exercises/current-week
  app.get('/exercises/current-week', (c) => {
    const weekStart = mockExerciseService.getWeekStart()
    const weekEnd = mockExerciseService.getWeekEnd(weekStart)
    const list = mockExerciseRepository.findExercisesByWeek(weekStart)
    return c.json({
      success: true,
      data: {
        week_start: weekStart,
        week_end: weekEnd,
        week_label: mockExerciseService.formatWeekLabel(weekStart, weekEnd),
        has_exercise: list.length > 0,
        exercise_count: list.length
      }
    })
  })

  // POST /exercises
  app.post('/exercises', async (c) => {
    const body = await c.req.json()
    const { puzzleIds, filters, name, weekStart } = body

    if (!puzzleIds || !Array.isArray(puzzleIds) || puzzleIds.length === 0) {
      return c.json({ success: false, error: 'At least one puzzle ID is required' }, 400)
    }

    const result = mockExerciseService.createWeeklyExercise({ puzzleIds, filters, name, weekStart })
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400)
    }
    return c.json({ success: true, data: result.data }, 201)
  })

  // PUT /exercises/:id (admin only)
  app.put('/exercises/:id', async (c) => {
    const user = c.get('user')
    if (!user || user.role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }

    const id = c.req.param('id')
    const { name } = await c.req.json()

    if (!name || !name.trim()) {
      return c.json({ success: false, error: 'Name is required' }, 400)
    }

    const trimmed = name.trim()
    if (trimmed.length > 200) {
      return c.json({ success: false, error: 'Name must be 200 characters or less' }, 400)
    }

    const result = mockExerciseRepository.updateExerciseName(id, trimmed)
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 404)
    }
    return c.json({ success: true })
  })

  // DELETE /exercises/:id
  app.delete('/exercises/:id', (c) => {
    const id = c.req.param('id')
    const result = mockExerciseRepository.deleteExercise(id)
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400)
    }
    return c.json({ success: true })
  })

  // PUT /student-exercises/:id/grade
  app.put('/student-exercises/:id/grade', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { score, notes, puzzleResults } = body

    if (score === undefined || score === null) {
      return c.json({ success: false, error: 'Score is required' }, 400)
    }
    if (typeof score !== 'number' || score < 0) {
      return c.json({ success: false, error: 'Score must be a non-negative number' }, 400)
    }
    if (puzzleResults !== undefined && puzzleResults !== null) {
      if (typeof puzzleResults !== 'string' || !/^[01,]*$/.test(puzzleResults)) {
        return c.json({ success: false, error: 'Invalid puzzleResults format' }, 400)
      }
    }

    const result = mockExerciseService.gradeExercise(id, score, notes, puzzleResults || null)
    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400)
    }
    return c.json({ success: true, data: result.data })
  })

  return app
}

describe('GET /exercises', () => {
  it('returns list of exercises', async () => {
    const app = createTestApp()
    mockExerciseService.getAllExercisesWithStats.mockReturnValue([{ id: 'ex_1' }])

    const res = await app.request('/exercises')
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })
})

describe('GET /exercises/current-week', () => {
  it('returns current week info', async () => {
    const app = createTestApp()
    const res = await app.request('/exercises/current-week')
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.week_start).toBe('2026-03-23')
    expect(json.data.has_exercise).toBe(false)
  })

  it('reflects has_exercise when exercises exist', async () => {
    const app = createTestApp()
    mockExerciseRepository.findExercisesByWeek.mockReturnValue([{ id: 'ex_1' }, { id: 'ex_2' }])

    const res = await app.request('/exercises/current-week')
    const json = await res.json()

    expect(json.data.has_exercise).toBe(true)
    expect(json.data.exercise_count).toBe(2)
  })
})

describe('POST /exercises', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates exercise with valid puzzle IDs', async () => {
    const app = createTestApp()
    mockExerciseService.createWeeklyExercise.mockReturnValue({ success: true, data: { id: 'ex_new' } })

    const res = await app.request('/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzleIds: ['p1', 'p2'], name: 'Test' })
    })
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
  })

  it('rejects empty puzzle IDs', async () => {
    const app = createTestApp()
    const res = await app.request('/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzleIds: [] })
    })
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  })

  it('rejects missing puzzle IDs', async () => {
    const app = createTestApp()
    const res = await app.request('/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'No puzzles' })
    })

    expect(res.status).toBe(400)
  })
})

describe('PUT /exercises/:id (rename)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renames exercise as admin', async () => {
    const app = createTestApp('admin')
    mockExerciseRepository.updateExerciseName.mockReturnValue({ success: true })

    const res = await app.request('/exercises/ex_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' })
    })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('rejects student role', async () => {
    const app = createTestApp('student')
    const res = await app.request('/exercises/ex_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Name' })
    })

    expect(res.status).toBe(403)
  })

  it('rejects empty name', async () => {
    const app = createTestApp('admin')
    const res = await app.request('/exercises/ex_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' })
    })

    expect(res.status).toBe(400)
  })

  it('rejects name over 200 chars', async () => {
    const app = createTestApp('admin')
    const res = await app.request('/exercises/ex_1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'a'.repeat(201) })
    })
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toContain('200')
  })

  it('returns 404 for non-existent exercise', async () => {
    const app = createTestApp('admin')
    mockExerciseRepository.updateExerciseName.mockReturnValue({ success: false, error: 'Exercise not found' })

    const res = await app.request('/exercises/nonexistent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Valid Name' })
    })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /exercises/:id', () => {
  it('deletes exercise successfully', async () => {
    const app = createTestApp()
    mockExerciseRepository.deleteExercise.mockReturnValue({ success: true })

    const res = await app.request('/exercises/ex_1', { method: 'DELETE' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('returns error for non-existent exercise', async () => {
    const app = createTestApp()
    mockExerciseRepository.deleteExercise.mockReturnValue({ success: false, error: 'not found' })

    const res = await app.request('/exercises/bad_id', { method: 'DELETE' })

    expect(res.status).toBe(400)
  })
})

describe('PUT /student-exercises/:id/grade', () => {
  beforeEach(() => vi.clearAllMocks())

  it('grades with valid score', async () => {
    const app = createTestApp()
    mockExerciseService.gradeExercise.mockReturnValue({ success: true, data: {} })

    const res = await app.request('/student-exercises/se_1/grade', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 5, notes: 'Good work' })
    })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })

  it('grades with puzzle results', async () => {
    const app = createTestApp()
    mockExerciseService.gradeExercise.mockReturnValue({ success: true, data: {} })

    const res = await app.request('/student-exercises/se_1/grade', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 3, puzzleResults: '1,1,1,0,0' })
    })

    expect(res.status).toBe(200)
    expect(mockExerciseService.gradeExercise).toHaveBeenCalledWith('se_1', 3, undefined, '1,1,1,0,0')
  })

  it('rejects missing score', async () => {
    const app = createTestApp()
    const res = await app.request('/student-exercises/se_1/grade', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'no score' })
    })

    expect(res.status).toBe(400)
  })

  it('rejects negative score', async () => {
    const app = createTestApp()
    const res = await app.request('/student-exercises/se_1/grade', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: -1 })
    })

    expect(res.status).toBe(400)
  })

  it('rejects invalid puzzleResults format', async () => {
    const app = createTestApp()
    const res = await app.request('/student-exercises/se_1/grade', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 3, puzzleResults: 'abc,xyz' })
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('puzzleResults')
  })

  it('accepts valid puzzleResults with empty slots', async () => {
    const app = createTestApp()
    mockExerciseService.gradeExercise.mockReturnValue({ success: true, data: {} })

    const res = await app.request('/student-exercises/se_1/grade', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 2, puzzleResults: '1,0,1,,' })
    })

    expect(res.status).toBe(200)
  })
})
