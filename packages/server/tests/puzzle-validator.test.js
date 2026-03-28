/**
 * Tests for PuzzleValidator: ID, source, themes, rating, and full puzzle validation.
 */

import { describe, it, expect } from 'vitest'
import {
  validatePuzzleId,
  validateSource,
  validateThemes,
  validateRating
} from '../src/puzzles/validation/PuzzleValidator.js'

describe('validatePuzzleId', () => {
  it('accepts valid alphanumeric ID', () => {
    expect(validatePuzzleId('abc123').valid).toBe(true)
  })

  it('accepts ID with hyphens and underscores', () => {
    expect(validatePuzzleId('my-puzzle_01').valid).toBe(true)
  })

  it('rejects null', () => {
    expect(validatePuzzleId(null).valid).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validatePuzzleId('').valid).toBe(false)
  })

  it('rejects too short (< 3 chars)', () => {
    expect(validatePuzzleId('ab').valid).toBe(false)
  })

  it('rejects too long (> 50 chars)', () => {
    expect(validatePuzzleId('a'.repeat(51)).valid).toBe(false)
  })

  it('rejects special characters', () => {
    expect(validatePuzzleId('abc<script>').valid).toBe(false)
    expect(validatePuzzleId('abc def').valid).toBe(false)
    expect(validatePuzzleId('abc@123').valid).toBe(false)
  })
})

describe('validateSource', () => {
  it('accepts valid sources', () => {
    expect(validateSource('manual').valid).toBe(true)
    expect(validateSource('lichess_import').valid).toBe(true)
    expect(validateSource('interactive').valid).toBe(true)
    expect(validateSource('pgn').valid).toBe(true)
    expect(validateSource('lichess').valid).toBe(true)
  })

  it('rejects invalid source', () => {
    expect(validateSource('unknown').valid).toBe(false)
  })

  it('rejects null', () => {
    expect(validateSource(null).valid).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateSource('').valid).toBe(false)
  })
})

describe('validateThemes', () => {
  it('accepts valid theme array', () => {
    const result = validateThemes(['pin', 'Fork', 'MATE'])
    expect(result.valid).toBe(true)
    expect(result.normalizedThemes).toEqual(['pin', 'fork', 'mate'])
  })

  it('accepts null (optional)', () => {
    const result = validateThemes(null)
    expect(result.valid).toBe(true)
    expect(result.normalizedThemes).toEqual([])
  })

  it('accepts undefined (optional)', () => {
    const result = validateThemes(undefined)
    expect(result.valid).toBe(true)
  })

  it('rejects non-array', () => {
    expect(validateThemes('pin').valid).toBe(false)
  })

  it('filters out empty strings', () => {
    const result = validateThemes(['pin', '', '  ', 'fork'])
    expect(result.valid).toBe(true)
    expect(result.normalizedThemes).toEqual(['pin', 'fork'])
  })

  it('trims and lowercases themes', () => {
    const result = validateThemes(['  Pin  ', 'FORK'])
    expect(result.normalizedThemes).toEqual(['pin', 'fork'])
  })
})

describe('validateRating', () => {
  it('accepts valid rating', () => {
    const result = validateRating(1500)
    expect(result.valid).toBe(true)
    expect(result.normalizedRating).toBe(1500)
  })

  it('accepts boundary values (500-3500)', () => {
    expect(validateRating(500).valid).toBe(true)
    expect(validateRating(3500).valid).toBe(true)
  })

  it('rejects out-of-range ratings', () => {
    expect(validateRating(0).valid).toBe(false)
    expect(validateRating(499).valid).toBe(false)
    expect(validateRating(3501).valid).toBe(false)
  })

  it('coerces string to number', () => {
    const result = validateRating('1500')
    expect(result.valid).toBe(true)
    expect(result.normalizedRating).toBe(1500)
  })

  it('defaults to 1500 for null/undefined', () => {
    const result = validateRating(null)
    expect(result.valid).toBe(true)
    expect(result.normalizedRating).toBe(1500)
  })

  it('rejects NaN', () => {
    expect(validateRating('abc').valid).toBe(false)
  })
})
