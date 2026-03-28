/**
 * Tests for authRequired middleware: Bearer token extraction, query token, JWT verification.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/users/UserRepository.js', () => ({
  userRepository: { findByUsername: vi.fn(), findById: vi.fn() }
}))

const { AuthService } = await import('../src/auth/AuthService.js')

const service = new AuthService()

// Import after AuthService is available
const { authRequired } = await import('../src/middleware/authMiddleware.js')

function createMockContext({ authHeader, queryToken } = {}) {
  const ctx = {
    _store: {},
    get: (key) => ctx._store[key],
    set: (key, val) => { ctx._store[key] = val },
    req: {
      header: (name) => name === 'Authorization' ? authHeader : undefined,
      query: (name) => name === 'token' ? queryToken : undefined
    },
    json: vi.fn((body, status) => ({ body, status }))
  }
  return ctx
}

describe('authRequired middleware', () => {
  const middleware = authRequired()
  const validToken = service.generateAccessToken({ id: 'u1', username: 'admin', role: 'admin', student_id: null })

  it('returns 401 when no token provided', async () => {
    const ctx = createMockContext({})
    const next = vi.fn()

    await middleware(ctx, next)

    expect(ctx.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Authentication') }), 401)
    expect(next).not.toHaveBeenCalled()
  })

  it('extracts token from Bearer header', async () => {
    const ctx = createMockContext({ authHeader: `Bearer ${validToken}` })
    const next = vi.fn()

    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx._store.user.id).toBe('u1')
    expect(ctx._store.user.role).toBe('admin')
  })

  it('extracts token from query parameter', async () => {
    const ctx = createMockContext({ queryToken: validToken })
    const next = vi.fn()

    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx._store.user.username).toBe('admin')
  })

  it('prefers Bearer header over query token', async () => {
    const otherToken = service.generateAccessToken({ id: 'u2', username: 'other', role: 'student', student_id: 's1' })
    const ctx = createMockContext({ authHeader: `Bearer ${validToken}`, queryToken: otherToken })
    const next = vi.fn()

    await middleware(ctx, next)

    expect(ctx._store.user.id).toBe('u1') // from Bearer, not query
  })

  it('returns 401 for invalid token', async () => {
    const ctx = createMockContext({ authHeader: 'Bearer invalid.jwt.token' })
    const next = vi.fn()

    await middleware(ctx, next)

    expect(ctx.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Invalid') }), 401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 for malformed Authorization header', async () => {
    const ctx = createMockContext({ authHeader: 'NotBearer token123' })
    const next = vi.fn()

    await middleware(ctx, next)

    expect(ctx.json).toHaveBeenCalledWith(expect.anything(), 401)
  })

  it('sets user properties from token payload', async () => {
    const token = service.generateAccessToken({ id: 'u5', username: 'student1', role: 'student', student_id: 's42' })
    const ctx = createMockContext({ authHeader: `Bearer ${token}` })
    const next = vi.fn()

    await middleware(ctx, next)

    expect(ctx._store.user).toEqual({
      id: 'u5',
      username: 'student1',
      role: 'student',
      student_id: 's42'
    })
  })
})
