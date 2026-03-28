/**
 * Tests for AuthService: token generation, verification, password validation, hashing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock userRepository before importing AuthService
vi.mock('../src/users/UserRepository.js', () => ({
  userRepository: {
    findByUsername: vi.fn(),
    findById: vi.fn()
  }
}))

const { AuthService } = await import('../src/auth/AuthService.js')
const { userRepository } = await import('../src/users/UserRepository.js')

describe('AuthService', () => {
  let service

  beforeEach(() => {
    service = new AuthService()
    vi.clearAllMocks()
  })

  describe('generateAccessToken + verifyToken', () => {
    it('generates a valid JWT that can be verified', () => {
      const payload = { id: 'u1', username: 'admin', role: 'admin', student_id: null }
      const token = service.generateAccessToken(payload)

      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')

      const decoded = service.verifyToken(token)
      expect(decoded.id).toBe('u1')
      expect(decoded.username).toBe('admin')
      expect(decoded.role).toBe('admin')
    })

    it('returns null for invalid token', () => {
      const result = service.verifyToken('invalid.token.here')
      expect(result).toBeNull()
    })

    it('returns null for empty token', () => {
      expect(service.verifyToken('')).toBeNull()
    })
  })

  describe('generateRefreshToken', () => {
    it('includes type=refresh in payload', () => {
      const token = service.generateRefreshToken({ id: 'u1', username: 'test', role: 'student' })
      const decoded = service.verifyToken(token)
      expect(decoded.type).toBe('refresh')
    })
  })

  describe('refreshAccessToken', () => {
    it('issues new tokens from valid refresh token', () => {
      const refreshToken = service.generateRefreshToken({ id: 'u1', username: 'test', role: 'admin' })
      userRepository.findById.mockReturnValue({ id: 'u1', username: 'test', role: 'admin', student_id: null })

      const result = service.refreshAccessToken(refreshToken)

      expect(result.success).toBe(true)
      expect(result.data.access_token).toBeTruthy()
      expect(result.data.refresh_token).toBeTruthy()
    })

    it('rejects access token used as refresh token', () => {
      const accessToken = service.generateAccessToken({ id: 'u1', username: 'test', role: 'admin' })
      const result = service.refreshAccessToken(accessToken)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid refresh token')
    })

    it('rejects if user no longer exists', () => {
      const refreshToken = service.generateRefreshToken({ id: 'deleted_user', username: 'ghost', role: 'student' })
      userRepository.findById.mockReturnValue(null)

      const result = service.refreshAccessToken(refreshToken)
      expect(result.success).toBe(false)
      expect(result.error).toContain('no longer exists')
    })

    it('rejects invalid refresh token', () => {
      const result = service.refreshAccessToken('garbage')
      expect(result.success).toBe(false)
    })
  })

  describe('login', () => {
    it('rejects missing username', async () => {
      const result = await service.login('', 'password')
      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('rejects missing password', async () => {
      const result = await service.login('admin', '')
      expect(result.success).toBe(false)
    })

    it('rejects unknown username', async () => {
      userRepository.findByUsername.mockReturnValue(null)
      const result = await service.login('unknown', 'password')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid')
    })

    it('rejects wrong password', async () => {
      const hash = await service.hashPassword('correct_password')
      userRepository.findByUsername.mockReturnValue({ id: 'u1', username: 'admin', password_hash: hash, role: 'admin' })

      const result = await service.login('admin', 'wrong_password')
      expect(result.success).toBe(false)
    })

    it('succeeds with correct credentials', async () => {
      const hash = await service.hashPassword('Correct1')
      userRepository.findByUsername.mockReturnValue({ id: 'u1', username: 'admin', password_hash: hash, role: 'admin', student_id: null })

      const result = await service.login('admin', 'Correct1')
      expect(result.success).toBe(true)
      expect(result.data.access_token).toBeTruthy()
      expect(result.data.refresh_token).toBeTruthy()
      expect(result.data.user.username).toBe('admin')
    })
  })

  describe('hashPassword + comparePassword', () => {
    it('hashes and verifies password correctly', async () => {
      const hash = await service.hashPassword('TestPass1')
      expect(hash).not.toBe('TestPass1')

      const match = await service.comparePassword('TestPass1', hash)
      expect(match).toBe(true)

      const noMatch = await service.comparePassword('WrongPass1', hash)
      expect(noMatch).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('accepts valid password', () => {
      const result = service.validatePassword('StrongPass1')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects short password', () => {
      const result = service.validatePassword('Ab1')
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(expect.stringContaining('8 characters'))
    })

    it('rejects missing uppercase', () => {
      const result = service.validatePassword('lowercase1')
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(expect.stringContaining('uppercase'))
    })

    it('rejects missing lowercase', () => {
      const result = service.validatePassword('UPPERCASE1')
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(expect.stringContaining('lowercase'))
    })

    it('rejects missing number', () => {
      const result = service.validatePassword('NoNumberHere')
      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(expect.stringContaining('number'))
    })

    it('rejects null password', () => {
      const result = service.validatePassword(null)
      expect(result.valid).toBe(false)
    })

    it('reports multiple errors', () => {
      const result = service.validatePassword('ab')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })
})
