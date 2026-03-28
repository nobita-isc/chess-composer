/**
 * Tests for puzzle grading context logic.
 * Covers grade result tracking, score calculation, and puzzle results format.
 */

import { describe, it, expect } from 'vitest'

// Test the grading logic patterns used in ExercisePuzzleViewer
// (extracted as pure functions to test without DOM)

function createGradingContext(puzzleCount, existingResults = null) {
  const results = new Array(puzzleCount).fill(null)

  if (existingResults) {
    const existing = existingResults.split(',')
    existing.forEach((v, i) => {
      if (i < puzzleCount) {
        results[i] = v === '1' ? true : v === '0' ? false : null
      }
    })
  }

  return { results }
}

function calculateScore(results) {
  return results.filter(r => r === true).length
}

function formatPuzzleResults(results) {
  return results.map(r => r === true ? '1' : r === false ? '0' : '').join(',')
}

function gradeSummary(results) {
  return {
    correct: results.filter(r => r === true).length,
    wrong: results.filter(r => r === false).length,
    remaining: results.filter(r => r === null).length
  }
}

function findNextUngraded(results, afterIndex) {
  return results.findIndex((r, i) => r === null && i > afterIndex)
}

describe('createGradingContext', () => {
  it('creates empty context with all null results', () => {
    const ctx = createGradingContext(5)
    expect(ctx.results).toEqual([null, null, null, null, null])
  })

  it('loads existing results from comma-separated string', () => {
    const ctx = createGradingContext(5, '1,0,1,,0')
    expect(ctx.results).toEqual([true, false, true, null, false])
  })

  it('handles more puzzles than existing results', () => {
    const ctx = createGradingContext(5, '1,0')
    expect(ctx.results).toEqual([true, false, null, null, null])
  })

  it('handles empty string results', () => {
    const ctx = createGradingContext(3, ',,,')
    expect(ctx.results).toEqual([null, null, null])
  })

  it('handles all correct', () => {
    const ctx = createGradingContext(3, '1,1,1')
    expect(ctx.results).toEqual([true, true, true])
  })

  it('handles all wrong', () => {
    const ctx = createGradingContext(3, '0,0,0')
    expect(ctx.results).toEqual([false, false, false])
  })
})

describe('calculateScore', () => {
  it('counts only true values', () => {
    expect(calculateScore([true, false, true, null, false])).toBe(2)
  })

  it('returns 0 for all wrong', () => {
    expect(calculateScore([false, false, false])).toBe(0)
  })

  it('returns full count for all correct', () => {
    expect(calculateScore([true, true, true])).toBe(3)
  })

  it('returns 0 for all ungraded', () => {
    expect(calculateScore([null, null, null])).toBe(0)
  })
})

describe('formatPuzzleResults', () => {
  it('formats mixed results correctly', () => {
    expect(formatPuzzleResults([true, false, true, null, false])).toBe('1,0,1,,0')
  })

  it('formats all correct', () => {
    expect(formatPuzzleResults([true, true, true])).toBe('1,1,1')
  })

  it('formats all ungraded', () => {
    expect(formatPuzzleResults([null, null, null])).toBe(',,')
  })

  it('roundtrips with createGradingContext', () => {
    const original = '1,0,,1,0'
    const ctx = createGradingContext(5, original)
    const formatted = formatPuzzleResults(ctx.results)
    expect(formatted).toBe(original)
  })
})

describe('gradeSummary', () => {
  it('counts each category', () => {
    const summary = gradeSummary([true, false, true, null, false])
    expect(summary).toEqual({ correct: 2, wrong: 2, remaining: 1 })
  })

  it('handles all graded', () => {
    const summary = gradeSummary([true, true, false])
    expect(summary.remaining).toBe(0)
  })
})

describe('findNextUngraded', () => {
  it('finds next null after current index', () => {
    expect(findNextUngraded([true, false, null, true, null], 1)).toBe(2)
  })

  it('skips already-graded puzzles', () => {
    expect(findNextUngraded([true, true, true, null], 0)).toBe(3)
  })

  it('returns -1 when all graded', () => {
    expect(findNextUngraded([true, false, true], 0)).toBe(-1)
  })

  it('returns -1 when no ungraded after index', () => {
    expect(findNextUngraded([null, null, true, true], 2)).toBe(-1)
  })
})
