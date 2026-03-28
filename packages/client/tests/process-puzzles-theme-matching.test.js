/**
 * Tests for processPuzzles theme matching logic.
 * Verifies that puzzles display the correct theme from user's selection,
 * not just the first alphabetical theme from the database.
 */

import { describe, it, expect } from 'vitest'

// Mock chess.js to avoid importing the full library
import { vi } from 'vitest'
vi.mock('chess.js', () => ({
  Chess: class MockChess {
    constructor() {}
    turn() { return 'w' }
  }
}))

const { processPuzzles, formatThemeName } = await import('../src/puzzles/puzzleGeneration.js')

function makePuzzle(id, themes, rating = 1500) {
  return {
    id,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    themes,
    rating,
    moves: 'e2e4'
  }
}

describe('processPuzzles theme matching', () => {
  describe('single theme selection', () => {
    it('uses selected theme when it appears in puzzle themes', () => {
      const puzzles = [makePuzzle('p1', ['advantage', 'pin', 'endgame'])]
      const result = processPuzzles(puzzles, 'pin')

      expect(result[0].theme).toBe('pin')
      expect(result[0].themeName).toBe('Pin')
    })

    it('uses selected theme string even if not in puzzle themes (fallback)', () => {
      const puzzles = [makePuzzle('p1', ['advantage', 'endgame'])]
      const result = processPuzzles(puzzles, 'pin')

      expect(result[0].theme).toBe('pin')
    })
  })

  describe('multi-theme selection (array)', () => {
    it('matches correct selected theme per puzzle', () => {
      const puzzles = [
        makePuzzle('p1', ['advantage', 'pin', 'endgame']),
        makePuzzle('p2', ['crushing', 'fork', 'middlegame']),
        makePuzzle('p3', ['endgame', 'skewer', 'short'])
      ]
      const result = processPuzzles(puzzles, ['pin', 'fork', 'skewer'])

      expect(result[0].theme).toBe('pin')
      expect(result[1].theme).toBe('fork')
      expect(result[2].theme).toBe('skewer')
    })

    it('displays "Back Rank Mate" not "Advanced Pawn" for backrankmate puzzle', () => {
      const puzzles = [
        makePuzzle('p1', ['advancedpawn', 'backrankmate', 'crushing', 'endgame'])
      ]
      const result = processPuzzles(puzzles, ['backrankmate', 'smotheredmate'])

      expect(result[0].theme).toBe('backrankmate')
      expect(result[0].themeName).toBe('Back Rank Mate')
    })

    it('displays "Smothered Mate" for smotheredmate puzzle', () => {
      const puzzles = [
        makePuzzle('p1', ['mate', 'middlegame', 'smotheredmate'])
      ]
      const result = processPuzzles(puzzles, ['backrankmate', 'smotheredmate'])

      expect(result[0].theme).toBe('smotheredmate')
      expect(result[0].themeName).toBe('Smothered Mate')
    })

    it('falls back to first selected theme if no match in puzzle themes', () => {
      const puzzles = [
        makePuzzle('p1', ['advantage', 'endgame'])
      ]
      const result = processPuzzles(puzzles, ['pin', 'fork'])

      expect(result[0].theme).toBe('pin')
    })

    it('handles case-insensitive matching', () => {
      const puzzles = [
        makePuzzle('p1', ['Pin', 'Endgame'])
      ]
      const result = processPuzzles(puzzles, ['pin'])

      expect(result[0].theme).toBe('pin')
    })

    it('handles empty selected themes array (all themes mode)', () => {
      const puzzles = [
        makePuzzle('p1', ['advantage', 'pin', 'endgame'])
      ]
      const result = processPuzzles(puzzles, [])

      // Falls back to first theme from puzzle
      expect(result[0].theme).toBe('advantage')
    })
  })

  describe('no theme selection (null)', () => {
    it('uses first puzzle theme when no selection', () => {
      const puzzles = [
        makePuzzle('p1', ['crushing', 'fork', 'middlegame'])
      ]
      const result = processPuzzles(puzzles, null)

      expect(result[0].theme).toBe('crushing')
    })

    it('handles puzzle with no themes', () => {
      const puzzles = [makePuzzle('p1', [])]
      const result = processPuzzles(puzzles, null)

      expect(result[0].theme).toBeNull()
    })

    it('handles puzzle with undefined themes', () => {
      const puzzles = [{ id: 'p1', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: 'e2e4' }]
      const result = processPuzzles(puzzles, null)

      expect(result[0].theme).toBeNull()
    })
  })

  describe('mixed scenario (realistic)', () => {
    it('correctly labels all puzzles in a back-rank-mate + smothered-mate generation', () => {
      const puzzles = [
        makePuzzle('p1', ['advancedpawn', 'backrankmate', 'crushing', 'endgame']),
        makePuzzle('p2', ['mate', 'middlegame', 'smotheredmate', 'short']),
        makePuzzle('p3', ['backrankmate', 'mate', 'matein1', 'onemove']),
        makePuzzle('p4', ['crushing', 'middlegame', 'smotheredmate']),
        makePuzzle('p5', ['backrankmate', 'endgame', 'mate', 'matein2']),
        makePuzzle('p6', ['mate', 'smotheredmate', 'short'])
      ]

      const result = processPuzzles(puzzles, ['backrankmate', 'smotheredmate'])

      // Each puzzle should show the matching selected theme
      expect(result[0].themeName).toBe('Back Rank Mate')
      expect(result[1].themeName).toBe('Smothered Mate')
      expect(result[2].themeName).toBe('Back Rank Mate')
      expect(result[3].themeName).toBe('Smothered Mate')
      expect(result[4].themeName).toBe('Back Rank Mate')
      expect(result[5].themeName).toBe('Smothered Mate')

      // None should show "Advanced Pawn", "Crushing", "Mate", etc.
      result.forEach(p => {
        expect(p.themeName).not.toBe('Advanced Pawn')
        expect(p.themeName).not.toBe('Crushing')
        expect(p.themeName).not.toBe('Mate')
      })
    })
  })
})
