/**
 * Tests for requireRole middleware.
 * Covers auth enforcement and role-based access control.
 */

import { describe, it, expect, vi } from 'vitest'
import { requireRole } from '../src/middleware/roleMiddleware.js'

function createMockContext(user = null) {
  const ctx = {
    _store: { user },
    get: (key) => ctx._store[key],
    set: (key, val) => { ctx._store[key] = val },
    json: vi.fn((body, status) => ({ body, status }))
  }
  return ctx
}

describe('requireRole', () => {
  it('returns 401 when no user is set', async () => {
    const middleware = requireRole('admin')
    const ctx = createMockContext(null)
    const next = vi.fn()

    await middleware(ctx, next)

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Authentication') }),
      401
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when user role is not allowed', async () => {
    const middleware = requireRole('admin')
    const ctx = createMockContext({ role: 'student', id: '1' })
    const next = vi.fn()

    await middleware(ctx, next)

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Forbidden') }),
      403
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next when user has allowed role', async () => {
    const middleware = requireRole('admin')
    const ctx = createMockContext({ role: 'admin', id: '1' })
    const next = vi.fn()

    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.json).not.toHaveBeenCalled()
  })

  it('supports multiple allowed roles', async () => {
    const middleware = requireRole('admin', 'student')
    const ctx = createMockContext({ role: 'student', id: '2' })
    const next = vi.fn()

    await middleware(ctx, next)

    expect(next).toHaveBeenCalled()
  })

  it('rejects role not in allowed list', async () => {
    const middleware = requireRole('admin')
    const ctx = createMockContext({ role: 'guest', id: '3' })
    const next = vi.fn()

    await middleware(ctx, next)

    expect(ctx.json).toHaveBeenCalledWith(expect.anything(), 403)
  })
})
