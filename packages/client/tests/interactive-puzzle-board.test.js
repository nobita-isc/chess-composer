// @vitest-environment jsdom

/**
 * interactive-puzzle-board.test.js
 * Unit tests for InteractivePuzzleBoard class.
 * Chessground is mocked — we test the board's state machine logic, not Chessground internals.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---- Chessground mock ----
// Must be hoisted before any import that pulls in interactive-puzzle-board.js

let lastChessgroundConfig = null
let mockBoardInstance = null

vi.mock('chessground', () => {
  return {
    Chessground: vi.fn((el, config) => {
      lastChessgroundConfig = config
      // Capture the move handler at creation time — board.set() may overwrite
      // movable in a shallow merge, so we keep the original events reference.
      const moveAfterHandler = config?.movable?.events?.after
      mockBoardInstance = {
        el,
        config: { ...config },
        set: vi.fn(),
        move: vi.fn(),
        destroy: vi.fn(),
        state: { dom: { bounds: { clear: vi.fn() } } },
        // Trigger the player-move handler captured at Chessground() creation time.
        _triggerMove: (from, to) => {
          moveAfterHandler?.(from, to)
        },
      }
      return mockBoardInstance
    }),
  }
})

import { InteractivePuzzleBoard } from '../src/shared/interactive-puzzle-board.js'
import { makeBoard, cleanupBoard, SIMPLE_PUZZLE, START_FEN } from './helpers/make-board.js'

// ==================== Constructor / getState ====================

describe('InteractivePuzzleBoard — constructor', () => {
  let boardEl, board, spies

  beforeEach(() => {
    vi.useFakeTimers()
    ;({ boardEl, board, spies } = makeBoard())
  })

  afterEach(() => {
    board.destroy()
    cleanupBoard(boardEl)
    vi.useRealTimers()
  })

  it('sets playerColor to black when FEN is white-to-move (opponent goes first)', () => {
    // START_FEN is white to move => opponent = white => player = black
    expect(board.getState().playerColor).toBe('black')
  })

  it('sets playerColor to white when FEN is black-to-move', () => {
    const blackToMoveFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const { board: b2, boardEl: el2 } = makeBoard({ fen: blackToMoveFen, solutionMoves: ['e7e5'] })
    expect(b2.getState().playerColor).toBe('white')
    b2.destroy()
    cleanupBoard(el2)
  })

  it('initial state: moveIndex=0, isComplete=false', () => {
    const state = board.getState()
    expect(state.currentMoveIndex).toBe(0)
    expect(state.isComplete).toBe(false)
  })

  it('totalMoves matches solutionMoves length', () => {
    expect(board.getState().totalMoves).toBe(SIMPLE_PUZZLE.solutionMoves.length)
  })
})

// ==================== init() + Chessground creation ====================

describe('InteractivePuzzleBoard — init()', () => {
  let boardEl, board, spies

  beforeEach(() => {
    vi.useFakeTimers()
    ;({ boardEl, board, spies } = makeBoard())
    board.init()
  })

  afterEach(() => {
    board.destroy()
    cleanupBoard(boardEl)
    vi.useRealTimers()
  })

  it('creates a Chessground instance on the boardEl', () => {
    expect(mockBoardInstance).not.toBeNull()
    expect(mockBoardInstance.el).toBe(boardEl)
  })

  it('passes correct orientation to Chessground (player color)', () => {
    // player = black, so orientation = black
    expect(lastChessgroundConfig.orientation).toBe('black')
  })

  it('Chessground config has movable.free = false', () => {
    expect(lastChessgroundConfig.movable.free).toBe(false)
  })

  it('Chessground config has movable.color = playerColor', () => {
    expect(lastChessgroundConfig.movable.color).toBe('black')
  })

  it('schedules first opponent move after initialDelay (0 in test config)', () => {
    // initialDelay=0 — flush timers
    vi.runAllTimers()
    // onOpponentMove should have been called for solution[0] = e2e4
    expect(spies.onOpponentMove).toHaveBeenCalledOnce()
    expect(spies.onOpponentMove).toHaveBeenCalledWith('e4', 0)
  })

  it('calls onBoardReady after first opponent move', () => {
    vi.runAllTimers()
    expect(spies.onBoardReady).toHaveBeenCalledOnce()
  })
})

// ==================== Player move — correct ====================

describe('InteractivePuzzleBoard — correct player move', () => {
  let boardEl, board, spies

  beforeEach(() => {
    vi.useFakeTimers()
    ;({ boardEl, board, spies } = makeBoard())
    board.init()
    vi.runAllTimers() // play opponent's first move (e2e4), moveIndex = 1
  })

  afterEach(() => {
    board.destroy()
    cleanupBoard(boardEl)
    vi.useRealTimers()
  })

  it('triggers onCorrectMove when player plays the expected move', () => {
    // solution[1] = e7e5, player is black
    mockBoardInstance._triggerMove('e7', 'e5')
    expect(spies.onCorrectMove).toHaveBeenCalledOnce()
    expect(spies.onCorrectMove).toHaveBeenCalledWith('e5', 1)
  })

  it('advances moveIndex after correct move', () => {
    mockBoardInstance._triggerMove('e7', 'e5')
    // solution has 2 moves total, both played → isComplete
    expect(board.getState().isComplete).toBe(true)
  })

  it('triggers onPuzzleComplete when last move is correct', () => {
    mockBoardInstance._triggerMove('e7', 'e5')
    expect(spies.onPuzzleComplete).toHaveBeenCalledOnce()
  })
})

// ==================== Player move — wrong ====================

describe('InteractivePuzzleBoard — wrong player move', () => {
  let boardEl, board, spies

  beforeEach(() => {
    vi.useFakeTimers()
    ;({ boardEl, board, spies } = makeBoard())
    board.init()
    vi.runAllTimers() // play e2e4, moveIndex = 1
  })

  afterEach(() => {
    board.destroy()
    cleanupBoard(boardEl)
    vi.useRealTimers()
  })

  it('triggers onWrongMove when player plays a wrong move', () => {
    // e7e6 is legal but not the expected e7e5
    mockBoardInstance._triggerMove('e7', 'e6')
    expect(spies.onWrongMove).toHaveBeenCalledOnce()
  })

  it('does NOT trigger onCorrectMove on wrong move', () => {
    mockBoardInstance._triggerMove('e7', 'e6')
    expect(spies.onCorrectMove).not.toHaveBeenCalled()
  })

  it('does NOT trigger onPuzzleComplete on wrong move', () => {
    mockBoardInstance._triggerMove('e7', 'e6')
    expect(spies.onPuzzleComplete).not.toHaveBeenCalled()
  })

  it('keeps isComplete = false after wrong move', () => {
    mockBoardInstance._triggerMove('e7', 'e6')
    expect(board.getState().isComplete).toBe(false)
  })

  it('restores board position after wrong move (calls board.set)', () => {
    const setCallsBefore = mockBoardInstance.set.mock.calls.length
    mockBoardInstance._triggerMove('e7', 'e6')
    expect(mockBoardInstance.set.mock.calls.length).toBeGreaterThan(setCallsBefore)
  })
})

// ==================== Multi-step puzzle (opponent response after correct move) ====================

describe('InteractivePuzzleBoard — multi-step puzzle', () => {
  // 4-move solution: opp(e2e4) → player(e7e5) → opp(g1f3) → player(b8c6)
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const MOVES = ['e2e4', 'e7e5', 'g1f3', 'b8c6']

  let boardEl, board, spies

  beforeEach(() => {
    vi.useFakeTimers()
    ;({ boardEl, board, spies } = makeBoard({ fen: START, solutionMoves: MOVES }))
    board.init()
    vi.runAllTimers() // play e2e4, moveIndex=1
  })

  afterEach(() => {
    board.destroy()
    cleanupBoard(boardEl)
    vi.useRealTimers()
  })

  it('plays opponent response (Nf3) after player correct move (e7e5)', () => {
    mockBoardInstance._triggerMove('e7', 'e5')   // player correct, moveIndex=2
    vi.runAllTimers()                             // opponent plays g1f3, moveIndex=3
    expect(spies.onOpponentMove).toHaveBeenCalledTimes(2) // e2e4 + g1f3
    expect(spies.onOpponentMove).toHaveBeenLastCalledWith('Nf3', 2)
  })

  it('does NOT call onPuzzleComplete after intermediate correct move', () => {
    mockBoardInstance._triggerMove('e7', 'e5')
    vi.runAllTimers()
    expect(spies.onPuzzleComplete).not.toHaveBeenCalled()
    expect(board.getState().isComplete).toBe(false)
  })

  it('completes puzzle on final correct move (b8c6)', () => {
    mockBoardInstance._triggerMove('e7', 'e5')
    vi.runAllTimers()                             // opponent plays Nf3
    mockBoardInstance._triggerMove('b8', 'c6')   // player's final move
    expect(spies.onPuzzleComplete).toHaveBeenCalledOnce()
    expect(board.getState().isComplete).toBe(true)
  })
})

// ==================== getExpectedMove / getBoard / getChess ====================

describe('InteractivePuzzleBoard — getters', () => {
  let boardEl, board

  beforeEach(() => {
    vi.useFakeTimers()
    ;({ boardEl, board } = makeBoard())
    board.init()
  })

  afterEach(() => {
    board.destroy()
    cleanupBoard(boardEl)
    vi.useRealTimers()
  })

  it('getExpectedMove returns solution[0] before first opponent move', () => {
    // moveIndex is 0 before timers flush
    expect(board.getExpectedMove()).toBe('e2e4')
  })

  it('getExpectedMove returns solution[1] after first opponent move', () => {
    vi.runAllTimers()
    expect(board.getExpectedMove()).toBe('e7e5')
  })

  it('getBoard returns the Chessground instance', () => {
    expect(board.getBoard()).toBe(mockBoardInstance)
  })

  it('getChess returns a Chess instance with correct FEN', () => {
    const chess = board.getChess()
    expect(typeof chess.fen).toBe('function')
    expect(chess.fen()).toBe(START_FEN)
  })
})

// ==================== flip() ====================

describe('InteractivePuzzleBoard — flip()', () => {
  let boardEl, board

  beforeEach(() => {
    vi.useFakeTimers()
    ;({ boardEl, board } = makeBoard())
    board.init()
  })

  afterEach(() => {
    board.destroy()
    cleanupBoard(boardEl)
    vi.useRealTimers()
  })

  it('toggles orientation from black to white', () => {
    expect(board.getState().orientation).toBe('black')
    board.flip()
    expect(board.getState().orientation).toBe('white')
  })

  it('calls board.set with new orientation', () => {
    board.flip()
    const setCalls = mockBoardInstance.set.mock.calls
    const lastCall = setCalls[setCalls.length - 1][0]
    expect(lastCall.orientation).toBe('white')
  })

  it('double-flip restores original orientation', () => {
    board.flip()
    board.flip()
    expect(board.getState().orientation).toBe('black')
  })
})

// ==================== destroy() ====================

describe('InteractivePuzzleBoard — destroy()', () => {
  let boardEl, board

  beforeEach(() => {
    vi.useFakeTimers()
    ;({ boardEl, board } = makeBoard())
    board.init()
  })

  afterEach(() => {
    cleanupBoard(boardEl)
    vi.useRealTimers()
  })

  it('calls Chessground.destroy()', () => {
    board.destroy()
    expect(mockBoardInstance.destroy).toHaveBeenCalled()
  })

  it('getBoard returns null after destroy', () => {
    board.destroy()
    expect(board.getBoard()).toBeNull()
  })

  it('does not throw when destroyed twice', () => {
    expect(() => { board.destroy(); board.destroy() }).not.toThrow()
  })
})

// ==================== reset() ====================

describe('InteractivePuzzleBoard — reset()', () => {
  let boardEl, board, spies

  beforeEach(() => {
    vi.useFakeTimers()
    ;({ boardEl, board, spies } = makeBoard())
    board.init()
    vi.runAllTimers() // play opponent move, moveIndex=1
    mockBoardInstance._triggerMove('e7', 'e5') // correct move → complete
  })

  afterEach(() => {
    board.destroy()
    cleanupBoard(boardEl)
    vi.useRealTimers()
  })

  it('resets isComplete to false', () => {
    board.reset()
    expect(board.getState().isComplete).toBe(false)
  })

  it('resets moveIndex to 0', () => {
    board.reset()
    expect(board.getState().currentMoveIndex).toBe(0)
  })
})

// ==================== edge cases ====================

describe('InteractivePuzzleBoard — edge cases', () => {
  it('no solutionMoves: init does not throw', () => {
    vi.useFakeTimers()
    const { boardEl, board } = makeBoard({ solutionMoves: [] })
    expect(() => board.init()).not.toThrow()
    board.destroy()
    cleanupBoard(boardEl)
    vi.useRealTimers()
  })

  it('no callbacks: init and move do not throw', () => {
    vi.useFakeTimers()
    const boardEl = document.createElement('div')
    document.body.appendChild(boardEl)
    const board = new InteractivePuzzleBoard({
      fen: START_FEN,
      solutionMoves: ['e2e4', 'e7e5'],
      boardEl,
      opponentMoveDelay: 0,
      initialDelay: 0,
      animationDuration: 0,
      // No callbacks
    })
    expect(() => {
      board.init()
      vi.runAllTimers()
      mockBoardInstance._triggerMove('e7', 'e5')
    }).not.toThrow()
    board.destroy()
    cleanupBoard(boardEl)
    vi.useRealTimers()
  })

  it('player move ignored when puzzle is already complete', () => {
    vi.useFakeTimers()
    const { boardEl, board, spies } = makeBoard()
    board.init()
    vi.runAllTimers()
    mockBoardInstance._triggerMove('e7', 'e5') // complete
    spies.onCorrectMove.mockClear()
    spies.onWrongMove.mockClear()
    // Attempt another move after completion — should be silently ignored
    mockBoardInstance._triggerMove('d7', 'd5')
    expect(spies.onCorrectMove).not.toHaveBeenCalled()
    expect(spies.onWrongMove).not.toHaveBeenCalled()
    board.destroy()
    cleanupBoard(boardEl)
    vi.useRealTimers()
  })
})
