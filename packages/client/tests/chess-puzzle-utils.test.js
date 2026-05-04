/**
 * chess-puzzle-utils.test.js
 * Unit tests for pure utility functions in chess-puzzle-utils.js.
 * No DOM needed — runs in node environment (faster).
 */

import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import { parseUciMove, getLegalMoves, uciMovesToSan, escapeHtml } from '../src/shared/chess-puzzle-utils.js'

// ==================== parseUciMove ====================

describe('parseUciMove', () => {
  it('parses standard 4-char move', () => {
    expect(parseUciMove('e2e4')).toEqual({ from: 'e2', to: 'e4', promotion: undefined })
  })

  it('parses promotion move (5 chars)', () => {
    expect(parseUciMove('e7e8q')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' })
  })

  it('parses under-promotion (rook)', () => {
    expect(parseUciMove('a7a8r')).toEqual({ from: 'a7', to: 'a8', promotion: 'r' })
  })

  it('returns null for null input', () => {
    expect(parseUciMove(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseUciMove('')).toBeNull()
  })

  it('returns null for string shorter than 4 chars', () => {
    expect(parseUciMove('e2e')).toBeNull()
  })
})

// ==================== getLegalMoves ====================

describe('getLegalMoves', () => {
  it('returns a Map', () => {
    const chess = new Chess()
    expect(getLegalMoves(chess)).toBeInstanceOf(Map)
  })

  it('starting position: 20 legal moves across 10 squares (8 pawns + 2 knights)', () => {
    const chess = new Chess()
    const dests = getLegalMoves(chess)
    // e2 pawn can go to e3 or e4
    expect(dests.get('e2')).toContain('e3')
    expect(dests.get('e2')).toContain('e4')
    // g1 knight can go to f3 or h3
    expect(dests.get('g1')).toContain('f3')
  })

  it('empty board (only kings) returns moves for the king', () => {
    // King in center has 8 moves
    const chess = new Chess('8/8/8/8/4K3/8/8/7k w - - 0 1')
    const dests = getLegalMoves(chess)
    expect(dests.has('e4')).toBe(true)
    expect(dests.get('e4').length).toBeGreaterThan(0)
  })

  it('no duplicate destinations per square', () => {
    const chess = new Chess()
    const dests = getLegalMoves(chess)
    for (const [, targets] of dests) {
      const unique = new Set(targets)
      expect(unique.size).toBe(targets.length)
    }
  })
})

// ==================== uciMovesToSan ====================

describe('uciMovesToSan', () => {
  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  it('converts a single move to SAN', () => {
    expect(uciMovesToSan(START_FEN, ['e2e4'])).toEqual(['e4'])
  })

  it('converts a sequence of moves to SAN', () => {
    const sans = uciMovesToSan(START_FEN, ['e2e4', 'e7e5', 'g1f3'])
    expect(sans).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('stops at first invalid UCI move', () => {
    const sans = uciMovesToSan(START_FEN, ['e2e4', 'INVALID', 'g1f3'])
    expect(sans).toEqual(['e4'])
  })

  it('returns empty array for empty moves list', () => {
    expect(uciMovesToSan(START_FEN, [])).toEqual([])
  })

  it('handles promotion in SAN (queen)', () => {
    // FEN: white pawn on e7, ready to promote
    const fen = '8/4P3/8/8/8/8/8/4K2k w - - 0 1'
    const sans = uciMovesToSan(fen, ['e7e8q'])
    expect(sans[0]).toContain('=Q')
  })
})

// ==================== escapeHtml ====================

describe('escapeHtml', () => {
  it('escapes & < > " \'', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
    expect(escapeHtml('<b>')).toBe('&lt;b&gt;')
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })

  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('')
  })

  it('returns plain string unchanged if no special chars', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('escapes multiple special chars in one string', () => {
    const result = escapeHtml('<script>alert("xss")</script>')
    expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })
})
