/**
 * API route tests for content description feature.
 * Tests: description CRUD via API, 10K char validation, description in responses.
 * Uses Hono test client with mocked repository.
 * Cleans up all mock state after each test.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// In-memory store to simulate DB state, cleaned after each test
let store = {}

function resetStore() {
  store = {
    content: new Map()
  }
}

const mockRepo = {
  createContent: vi.fn((lessonId, data) => {
    const id = `lc_${Date.now().toString(36)}`
    store.content.set(id, { id, lesson_id: lessonId, ...data })
    return { success: true, data: { id, lesson_id: lessonId } }
  }),
  updateContent: vi.fn((id, data) => {
    const existing = store.content.get(id)
    if (!existing) return { success: false, error: 'Content not found' }
    store.content.set(id, { ...existing, ...data })
    return { success: true }
  }),
  findContentByLesson: vi.fn((lessonId) => {
    return [...store.content.values()].filter(c => c.lesson_id === lessonId)
  }),
  findContentById: vi.fn((id) => {
    return store.content.get(id) || null
  })
}

function createApp(role = 'admin') {
  const app = new Hono()

  // Auth middleware
  app.use('*', async (c, next) => {
    c.set('user', { id: 'u1', role, student_id: role === 'student' ? 's1' : null })
    await next()
  })

  // POST /lessons/:id/content — create content with description
  app.post('/lessons/:id/content', async (c) => {
    if (c.get('user').role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403)
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
  })

  // PUT /content/:id — update content description
  app.put('/content/:id', async (c) => {
    if (c.get('user').role !== 'admin') return c.json({ success: false, error: 'Forbidden' }, 403)
    const data = await c.req.json()
    if (data.description && typeof data.description === 'string' && data.description.length > 10000) {
      return c.json({ success: false, error: 'Description too long (max 10,000 characters)' }, 400)
    }
    const result = mockRepo.updateContent(c.req.param('id'), data)
    if (!result.success) return c.json(result, 404)
    return c.json({ success: true })
  })

  // GET /lessons/:id/content — list content with descriptions
  app.get('/lessons/:id/content', (c) => {
    const content = mockRepo.findContentByLesson(c.req.param('id'))
    return c.json({ success: true, data: content })
  })

  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  resetStore()
})

describe('Content Description — API Routes', () => {

  // ==================== CREATE with description ====================

  describe('POST /lessons/:id/content', () => {
    it('creates content with markdown description', async () => {
      const res = await createApp().request('/lessons/l1/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'video',
          title: 'Intro',
          description: '## Theory\n\nLearn the **Italian Game**.'
        })
      })

      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(mockRepo.createContent).toHaveBeenCalledWith('l1', expect.objectContaining({
        description: '## Theory\n\nLearn the **Italian Game**.'
      }))
    })

    it('creates content without description (null)', async () => {
      const res = await createApp().request('/lessons/l1/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type: 'pdf', title: 'Guide' })
      })

      expect(res.status).toBe(201)
      expect(mockRepo.createContent).toHaveBeenCalledWith('l1', expect.objectContaining({
        title: 'Guide'
      }))
      // description should be undefined (not in payload) which repo handles as null
      const callArgs = mockRepo.createContent.mock.calls[0][1]
      expect(callArgs.description).toBeUndefined()
    })

    it('rejects description exceeding 10,000 characters', async () => {
      const longDesc = 'x'.repeat(10001)
      const res = await createApp().request('/lessons/l1/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'video',
          title: 'Long',
          description: longDesc
        })
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toContain('10,000')
      expect(mockRepo.createContent).not.toHaveBeenCalled()
    })

    it('accepts description at exactly 10,000 characters', async () => {
      const exactDesc = 'a'.repeat(10000)
      const res = await createApp().request('/lessons/l1/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'video',
          title: 'Exact',
          description: exactDesc
        })
      })

      expect(res.status).toBe(201)
      expect(mockRepo.createContent).toHaveBeenCalled()
    })

    it('rejects student role', async () => {
      const res = await createApp('student').request('/lessons/l1/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'video',
          title: 'Hack',
          description: 'Should not save'
        })
      })

      expect(res.status).toBe(403)
    })
  })

  // ==================== UPDATE description ====================

  describe('PUT /content/:id', () => {
    it('updates description on existing content', async () => {
      // Seed content
      store.content.set('lc1', {
        id: 'lc1', lesson_id: 'l1', content_type: 'video',
        title: 'Video', description: null
      })

      const res = await createApp().request('/content/lc1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: '# Added Notes' })
      })

      expect(res.status).toBe(200)
      expect(store.content.get('lc1').description).toBe('# Added Notes')
    })

    it('clears description by setting null', async () => {
      store.content.set('lc2', {
        id: 'lc2', lesson_id: 'l1', content_type: 'pdf',
        title: 'PDF', description: 'Old notes'
      })

      const res = await createApp().request('/content/lc2', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: null })
      })

      expect(res.status).toBe(200)
      expect(store.content.get('lc2').description).toBeNull()
    })

    it('rejects description exceeding 10K on update', async () => {
      store.content.set('lc3', {
        id: 'lc3', lesson_id: 'l1', content_type: 'video',
        title: 'V', description: null
      })

      const res = await createApp().request('/content/lc3', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'y'.repeat(10001) })
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toContain('10,000')
      // Content should remain unchanged
      expect(store.content.get('lc3').description).toBeNull()
    })

    it('updates title and description together', async () => {
      store.content.set('lc4', {
        id: 'lc4', lesson_id: 'l1', content_type: 'video',
        title: 'Old Title', description: null
      })

      const res = await createApp().request('/content/lc4', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Title', description: '## Notes' })
      })

      expect(res.status).toBe(200)
      const updated = store.content.get('lc4')
      expect(updated.title).toBe('New Title')
      expect(updated.description).toBe('## Notes')
    })

    it('returns 404 for non-existent content', async () => {
      const res = await createApp().request('/content/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'test' })
      })

      expect(res.status).toBe(404)
    })
  })

  // ==================== GET content list with descriptions ====================

  describe('GET /lessons/:id/content', () => {
    it('returns content with descriptions', async () => {
      store.content.set('lc10', {
        id: 'lc10', lesson_id: 'l5', content_type: 'video',
        title: 'Video', description: '## Video Notes'
      })
      store.content.set('lc11', {
        id: 'lc11', lesson_id: 'l5', content_type: 'pdf',
        title: 'PDF', description: null
      })

      const res = await createApp().request('/lessons/l5/content')
      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json.data).toHaveLength(2)

      const video = json.data.find(c => c.content_type === 'video')
      const pdf = json.data.find(c => c.content_type === 'pdf')
      expect(video.description).toBe('## Video Notes')
      expect(pdf.description).toBeNull()
    })

    it('returns empty array for lesson with no content', async () => {
      const res = await createApp().request('/lessons/empty-lesson/content')
      expect(res.status).toBe(200)
      expect((await res.json()).data).toHaveLength(0)
    })
  })
})
