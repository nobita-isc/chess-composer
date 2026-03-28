/**
 * Tests for MoveConverter: SAN↔UCI conversion, FEN validation, move sequence validation.
 */

import { describe, it, expect } from 'vitest'
import { sanToUCI, uciToSAN, validateFEN, validateMoveSequence } from '../src/shared/MoveConverter.js'

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('sanToUCI', () => {
  it('converts opening moves correctly', () => {
    const result = sanToUCI(STARTING_FEN, ['e4', 'e5', 'Nf3'])
    expect(result.success).toBe(true)
    expect(result.uci).toBe('e2e4 e7e5 g1f3')
  })

  it('handles promotion', () => {
    const promoFen = '8/P7/8/8/8/8/8/4K2k w - - 0 1'
    const result = sanToUCI(promoFen, ['a8=Q'])
    expect(result.success).toBe(true)
    expect(result.uci).toBe('a7a8q')
  })

  it('returns error for invalid move', () => {
    const result = sanToUCI(STARTING_FEN, ['e4', 'Nf6', 'Qh5'])
    // Qh5 is not legal on move 3 (queen can't reach h5 after e4 Nf6)
    // Actually Qh5 IS legal: 1.e4 Nf6 2.Qh5 is the Scholar's idea start
    // Let's use truly invalid
    const result2 = sanToUCI(STARTING_FEN, ['e4', 'e5', 'Ke2'])
    // Ke2 is illegal because king can't move there with queen blocking? Actually it can.
    // Use clearly illegal move
    const result3 = sanToUCI(STARTING_FEN, ['e4', 'e5', 'Rh3'])
    expect(result3.success).toBe(false)
    expect(result3.error).toContain('Invalid move')
  })

  it('handles empty move array', () => {
    const result = sanToUCI(STARTING_FEN, [])
    expect(result.success).toBe(true)
    expect(result.uci).toBe('')
  })
})

describe('uciToSAN', () => {
  it('converts UCI to SAN correctly', () => {
    const result = uciToSAN(STARTING_FEN, 'e2e4 e7e5 g1f3')
    expect(result.success).toBe(true)
    expect(result.san).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('returns error for invalid UCI move', () => {
    const result = uciToSAN(STARTING_FEN, 'e2e4 a1a8')
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('handles single move', () => {
    const result = uciToSAN(STARTING_FEN, 'e2e4')
    expect(result.success).toBe(true)
    expect(result.san).toEqual(['e4'])
  })

  it('handles promotion in UCI', () => {
    const promoFen = '8/P7/8/8/8/8/8/4K2k w - - 0 1'
    const result = uciToSAN(promoFen, 'a7a8q')
    expect(result.success).toBe(true)
    expect(result.san[0]).toContain('=Q')
  })
})

describe('sanToUCI + uciToSAN roundtrip', () => {
  it('roundtrips opening moves', () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']
    const toUci = sanToUCI(STARTING_FEN, moves)
    expect(toUci.success).toBe(true)

    const backToSan = uciToSAN(STARTING_FEN, toUci.uci)
    expect(backToSan.success).toBe(true)
    expect(backToSan.san).toEqual(moves)
  })
})

describe('validateFEN', () => {
  it('accepts valid starting position', () => {
    expect(validateFEN(STARTING_FEN).valid).toBe(true)
  })

  it('accepts valid mid-game position', () => {
    const fen = 'r1bqkbnr/pppppppp/2n5/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2'
    expect(validateFEN(fen).valid).toBe(true)
  })

  it('rejects invalid FEN', () => {
    const result = validateFEN('not-a-fen')
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('rejects empty string', () => {
    expect(validateFEN('').valid).toBe(false)
  })
})

describe('validateMoveSequence', () => {
  it('validates legal move sequence', () => {
    const result = validateMoveSequence(STARTING_FEN, ['e4', 'e5', 'Nf3'])
    expect(result.valid).toBe(true)
    expect(result.finalFen).toBeTruthy()
    expect(result.finalFen).not.toBe(STARTING_FEN)
  })

  it('rejects illegal move in sequence', () => {
    const result = validateMoveSequence(STARTING_FEN, ['e4', 'e5', 'Rh3'])
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it('handles empty move sequence', () => {
    const result = validateMoveSequence(STARTING_FEN, [])
    expect(result.valid).toBe(true)
    expect(result.finalFen).toBe(STARTING_FEN)
  })

  it('rejects move from invalid FEN', () => {
    const result = validateMoveSequence('bad-fen', ['e4'])
    expect(result.valid).toBe(false)
  })
})
