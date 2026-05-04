/**
 * make-board.js
 * Test helper: builds a fake DOM container and instantiates InteractivePuzzleBoard
 * with a mocked Chessground. Chessground is mocked at the module level in tests;
 * this helper wires together common config for board unit tests.
 *
 * Returns { boardEl, board, spies } where spies = { onCorrectMove, onWrongMove,
 * onOpponentMove, onPuzzleComplete, onBoardReady }.
 */

import { vi } from 'vitest'
import { InteractivePuzzleBoard } from '../../src/shared/interactive-puzzle-board.js'

/**
 * Standard opening FEN (white to move) — opponent moves first, so player = black.
 */
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/**
 * A simple puzzle: white to move (opponent), player is black.
 * solution[0] = opponent's first move (e2e4), solution[1] = player's correct reply (e7e5)
 */
export const SIMPLE_PUZZLE = {
  fen: START_FEN,
  solutionMoves: ['e2e4', 'e7e5'],
}

/**
 * Build a board instance with all optional callbacks spied on.
 *
 * @param {object} [overrides] - Partial PuzzleBoardConfig overrides (fen, solutionMoves, etc.)
 * @returns {{ boardEl: HTMLElement, board: InteractivePuzzleBoard, spies: object }}
 */
export function makeBoard(overrides = {}) {
  const boardEl = document.createElement('div')
  document.body.appendChild(boardEl)

  const spies = {
    onCorrectMove: vi.fn(),
    onWrongMove: vi.fn(),
    onOpponentMove: vi.fn(),
    onPuzzleComplete: vi.fn(),
    onBoardReady: vi.fn(),
  }

  const config = {
    fen: SIMPLE_PUZZLE.fen,
    solutionMoves: SIMPLE_PUZZLE.solutionMoves,
    boardEl,
    opponentMoveDelay: 0,
    initialDelay: 0,
    animationDuration: 0,
    ...overrides,
    ...spies,
    // Allow overriding individual spies
    ...(overrides.onCorrectMove ? { onCorrectMove: overrides.onCorrectMove } : {}),
    ...(overrides.onWrongMove ? { onWrongMove: overrides.onWrongMove } : {}),
    ...(overrides.onOpponentMove ? { onOpponentMove: overrides.onOpponentMove } : {}),
    ...(overrides.onPuzzleComplete ? { onPuzzleComplete: overrides.onPuzzleComplete } : {}),
    ...(overrides.onBoardReady ? { onBoardReady: overrides.onBoardReady } : {}),
  }

  const board = new InteractivePuzzleBoard(config)
  return { boardEl, board, spies }
}

/**
 * Clean up boardEl from document.body after each test.
 */
export function cleanupBoard(boardEl) {
  if (boardEl && boardEl.parentNode) {
    boardEl.parentNode.removeChild(boardEl)
  }
}
