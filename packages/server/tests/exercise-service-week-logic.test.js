/**
 * Tests for ExerciseService week calculation and formatting logic.
 * Covers timezone-safe date handling (getWeekStart, getWeekEnd, formatWeekLabel).
 */

import { describe, it, expect } from 'vitest'
import { ExerciseService } from '../src/exercises/ExerciseService.js'

const service = new ExerciseService()

describe('ExerciseService.getWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    // 2026-03-25 is a Wednesday
    const result = service.getWeekStart(new Date(2026, 2, 25))
    expect(result).toBe('2026-03-23')
  })

  it('returns Monday for a Monday', () => {
    const result = service.getWeekStart(new Date(2026, 2, 23))
    expect(result).toBe('2026-03-23')
  })

  it('returns previous Monday for a Sunday', () => {
    // 2026-03-29 is a Sunday
    const result = service.getWeekStart(new Date(2026, 2, 29))
    expect(result).toBe('2026-03-23')
  })

  it('returns Monday for a Saturday', () => {
    // 2026-03-28 is a Saturday
    const result = service.getWeekStart(new Date(2026, 2, 28))
    expect(result).toBe('2026-03-23')
  })

  it('handles month boundary (Friday Apr 3 → Monday Mar 30)', () => {
    const result = service.getWeekStart(new Date(2026, 3, 3))
    expect(result).toBe('2026-03-30')
  })

  it('handles year boundary (Thursday Jan 1 2026 → Monday Dec 29 2025)', () => {
    const result = service.getWeekStart(new Date(2026, 0, 1))
    expect(result).toBe('2025-12-29')
  })

  it('formats date with zero-padded month and day', () => {
    // 2026-01-05 is a Monday
    const result = service.getWeekStart(new Date(2026, 0, 5))
    expect(result).toBe('2026-01-05')
  })
})

describe('ExerciseService.getWeekEnd', () => {
  it('returns Sunday (6 days after Monday)', () => {
    const result = service.getWeekEnd('2026-03-23')
    expect(result).toBe('2026-03-29')
  })

  it('handles month boundary', () => {
    const result = service.getWeekEnd('2026-03-30')
    expect(result).toBe('2026-04-05')
  })

  it('handles year boundary', () => {
    const result = service.getWeekEnd('2025-12-29')
    expect(result).toBe('2026-01-04')
  })
})

describe('ExerciseService.formatWeekLabel', () => {
  it('formats a week label with month and day', () => {
    const result = service.formatWeekLabel('2026-03-23', '2026-03-29')
    expect(result).toContain('Mar')
    expect(result).toContain('23')
    expect(result).toContain('29')
  })

  it('formats cross-month week correctly', () => {
    const result = service.formatWeekLabel('2026-03-30', '2026-04-05')
    expect(result).toContain('Mar')
    expect(result).toContain('Apr')
  })

  it('uses correct local dates (not UTC-shifted)', () => {
    // This would fail if using new Date('2026-03-23') which parses as UTC midnight
    const result = service.formatWeekLabel('2026-03-23', '2026-03-29')
    // Should NOT show Mar 22 (UTC off-by-one in positive TZ offsets)
    expect(result).not.toContain('22')
  })
})
