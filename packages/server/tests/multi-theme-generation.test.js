/**
 * Tests for multi-theme puzzle generation and buildGenerateParams.
 * Covers: theme parsing, even distribution, deduplication, shuffling, fallback.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ==================== DatabaseGenerator multi-theme logic ====================

// Create a minimal mock generator to test the generatePuzzles logic
function createMockGenerator(puzzlesByTheme = {}) {
  const mockLoader = {
    queryPuzzles: vi.fn(({ themes, limit }) => {
      // Return puzzles tagged with the first theme queried
      const tag = themes[0] || 'all'
      const pool = puzzlesByTheme[tag] || puzzlesByTheme['all'] || []
      return pool.slice(0, limit)
    }),
    shuffleArray: vi.fn(arr => [...arr]) // identity shuffle for predictable tests
  }

  const generator = {
    initialized: true,
    loader: mockLoader,
    toLichessTag(theme) {
      const map = {
        'pin': ['pin', 'pinning'],
        'fork': ['fork', 'knightfork'],
        'skewer': ['skewer'],
        'backrankmate': ['backrankmate']
      }
      return map[theme] || [theme.toLowerCase()]
    },
    // Copy the actual generatePuzzles logic
    generatePuzzles(theme, count = 10, options = {}) {
      if (!this.initialized) return []

      const { minRating = 1200, maxRating = 2400, minPopularity = 85 } = options

      const themeList = theme
        ? (theme.includes(',') ? theme.split(',').map(t => t.trim()).filter(Boolean) : [theme])
        : []

      let selected

      if (themeList.length > 1) {
        const perTheme = Math.ceil(count / themeList.length)
        const allCandidates = []
        const usedIds = new Set()

        for (const t of themeList) {
          const lichessTags = this.toLichessTag(t)
          const tags = Array.isArray(lichessTags) ? lichessTags : [lichessTags]
          let candidates = this.loader.queryPuzzles({ themes: tags, minRating, maxRating, minPopularity, limit: perTheme * 2 })
          candidates = candidates.filter(p => !usedIds.has(p.id))
          const picked = candidates.slice(0, perTheme)
          picked.forEach(p => usedIds.add(p.id))
          allCandidates.push(...picked)
        }
        selected = this.loader.shuffleArray(allCandidates).slice(0, count)
      } else {
        let themes = []
        if (themeList.length === 1) {
          const lichessTags = this.toLichessTag(themeList[0])
          themes = Array.isArray(lichessTags) ? lichessTags : [lichessTags]
        }

        let candidates = this.loader.queryPuzzles({ themes, minRating, maxRating, minPopularity, limit: count * 2 })

        if (candidates.length < count) {
          candidates = this.loader.queryPuzzles({
            themes,
            minRating: minRating - 200,
            maxRating: maxRating + 200,
            minPopularity: Math.max(70, minPopularity - 15),
            limit: count * 2
          })
        }

        selected = candidates.slice(0, count)
      }

      return selected
    }
  }

  return { generator, mockLoader }
}

function makePuzzle(id, theme) {
  return { id, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: 'e2e4', themes: theme, rating: 1500 }
}

describe('generatePuzzles multi-theme', () => {
  it('returns empty when not initialized', () => {
    const { generator } = createMockGenerator()
    generator.initialized = false
    expect(generator.generatePuzzles('pin', 5)).toEqual([])
  })

  it('single theme queries with mapped Lichess tags', () => {
    const pinPuzzles = Array.from({ length: 10 }, (_, i) => makePuzzle(`pin_${i}`, 'pin'))
    const { generator, mockLoader } = createMockGenerator({ pin: pinPuzzles })

    const result = generator.generatePuzzles('pin', 5)

    expect(mockLoader.queryPuzzles).toHaveBeenCalledWith(
      expect.objectContaining({ themes: ['pin', 'pinning'] })
    )
    expect(result.length).toBe(5)
  })

  it('no theme queries without theme filter', () => {
    const allPuzzles = Array.from({ length: 10 }, (_, i) => makePuzzle(`all_${i}`, 'mixed'))
    const { generator, mockLoader } = createMockGenerator({ all: allPuzzles })
    // Override to return from 'all' key when themes is empty
    mockLoader.queryPuzzles.mockImplementation(({ themes, limit }) => {
      return allPuzzles.slice(0, limit)
    })

    const result = generator.generatePuzzles(null, 5)

    expect(mockLoader.queryPuzzles).toHaveBeenCalledWith(
      expect.objectContaining({ themes: [] })
    )
    expect(result.length).toBe(5)
  })

  it('multi-theme distributes evenly across themes', () => {
    const pinPuzzles = Array.from({ length: 10 }, (_, i) => makePuzzle(`pin_${i}`, 'pin'))
    const forkPuzzles = Array.from({ length: 10 }, (_, i) => makePuzzle(`fork_${i}`, 'fork'))

    const { generator, mockLoader } = createMockGenerator()
    mockLoader.queryPuzzles.mockImplementation(({ themes, limit }) => {
      if (themes.includes('pin')) return pinPuzzles.slice(0, limit)
      if (themes.includes('fork')) return forkPuzzles.slice(0, limit)
      return []
    })

    const result = generator.generatePuzzles('pin,fork', 10)

    const pinCount = result.filter(p => p.id.startsWith('pin_')).length
    const forkCount = result.filter(p => p.id.startsWith('fork_')).length

    expect(pinCount).toBeGreaterThanOrEqual(4)
    expect(forkCount).toBeGreaterThanOrEqual(4)
    expect(result.length).toBe(10)
  })

  it('multi-theme deduplicates puzzles across themes', () => {
    // Same puzzle appears in both themes
    const shared = makePuzzle('shared_1', 'pin,fork')
    const pinOnly = [shared, makePuzzle('pin_1', 'pin'), makePuzzle('pin_2', 'pin')]
    const forkOnly = [shared, makePuzzle('fork_1', 'fork'), makePuzzle('fork_2', 'fork')]

    const { generator, mockLoader } = createMockGenerator()
    mockLoader.queryPuzzles.mockImplementation(({ themes, limit }) => {
      if (themes.includes('pin')) return pinOnly.slice(0, limit)
      if (themes.includes('fork')) return forkOnly.slice(0, limit)
      return []
    })

    const result = generator.generatePuzzles('pin,fork', 6)

    // shared_1 should only appear once
    const sharedCount = result.filter(p => p.id === 'shared_1').length
    expect(sharedCount).toBeLessThanOrEqual(1)

    // All IDs should be unique
    const ids = result.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('multi-theme handles 3+ themes', () => {
    const { generator, mockLoader } = createMockGenerator()
    mockLoader.queryPuzzles.mockImplementation(({ themes, limit }) => {
      const tag = themes[0]
      return Array.from({ length: 5 }, (_, i) => makePuzzle(`${tag}_${i}`, tag)).slice(0, limit)
    })

    const result = generator.generatePuzzles('pin,fork,skewer', 9)

    expect(result.length).toBe(9)
    // Each theme should have ~3 puzzles
    const pinCount = result.filter(p => p.id.startsWith('pin')).length
    const forkCount = result.filter(p => p.id.startsWith('fork')).length
    const skewerCount = result.filter(p => p.id.startsWith('skewer')).length
    expect(pinCount).toBeGreaterThanOrEqual(2)
    expect(forkCount).toBeGreaterThanOrEqual(2)
    expect(skewerCount).toBeGreaterThanOrEqual(2)
  })

  it('multi-theme trims and filters empty themes', () => {
    const { generator, mockLoader } = createMockGenerator()
    mockLoader.queryPuzzles.mockImplementation(({ themes, limit }) => {
      return Array.from({ length: 5 }, (_, i) => makePuzzle(`${themes[0]}_${i}`, themes[0])).slice(0, limit)
    })

    const result = generator.generatePuzzles('pin, fork, ', 6)
    expect(result.length).toBe(6)
    // Should only query pin and fork (empty filtered out)
    const calls = mockLoader.queryPuzzles.mock.calls
    expect(calls.length).toBe(2)
  })

  it('single theme relaxes criteria when not enough puzzles', () => {
    const { generator, mockLoader } = createMockGenerator()
    let callCount = 0
    mockLoader.queryPuzzles.mockImplementation(({ minRating, limit }) => {
      callCount++
      if (callCount === 1) return [makePuzzle('p1', 'pin')] // too few
      return Array.from({ length: 10 }, (_, i) => makePuzzle(`relaxed_${i}`, 'pin')).slice(0, limit)
    })

    const result = generator.generatePuzzles('pin', 5)

    expect(callCount).toBe(2) // second call with relaxed criteria
    expect(result.length).toBe(5)
  })

  it('calls shuffleArray for multi-theme results', () => {
    const { generator, mockLoader } = createMockGenerator()
    mockLoader.queryPuzzles.mockImplementation(({ themes, limit }) => {
      return Array.from({ length: 5 }, (_, i) => makePuzzle(`${themes[0]}_${i}`, themes[0])).slice(0, limit)
    })

    generator.generatePuzzles('pin,fork', 6)

    expect(mockLoader.shuffleArray).toHaveBeenCalled()
  })
})

// ==================== buildGenerateParams ====================

// Import the actual function
const { buildGenerateParams } = await import('../../client/src/puzzles/puzzleGeneration.js')

describe('buildGenerateParams', () => {
  it('handles array of themes', () => {
    const params = buildGenerateParams(['pin', 'fork'], '1500-2000', 10)
    expect(params.theme).toBe('pin,fork')
    expect(params.count).toBe(10)
    expect(params.minRating).toBe(1500)
    expect(params.maxRating).toBe(2000)
  })

  it('handles single theme string', () => {
    const params = buildGenerateParams('pin', '', 5)
    expect(params.theme).toBe('pin')
  })

  it('handles empty array', () => {
    const params = buildGenerateParams([], '', 10)
    expect(params.theme).toBeNull()
  })

  it('handles null', () => {
    const params = buildGenerateParams(null, '', 10)
    expect(params.theme).toBeNull()
  })

  it('parses rating range correctly', () => {
    const params = buildGenerateParams(null, '2000-2500', 10)
    expect(params.minRating).toBe(2000)
    expect(params.maxRating).toBe(2500)
  })

  it('uses defaults for empty rating range', () => {
    const params = buildGenerateParams(null, '', 10)
    expect(params.minRating).toBe(1000)
    expect(params.maxRating).toBe(3000)
  })

  it('sets minPopularity to 80', () => {
    const params = buildGenerateParams(null, '', 10)
    expect(params.minPopularity).toBe(80)
  })
})
