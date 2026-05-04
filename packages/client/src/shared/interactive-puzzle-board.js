/**
 * interactive-puzzle-board.js
 * Shared Chessground lifecycle + puzzle interaction logic.
 * Consumers provide puzzle data + callbacks; this module owns the board.
 * No UI rendering — consumers own all DOM outside the board element.
 *
 * NOTE: Uses board recreation (destroy+create) after opponent moves instead of
 * Chessground's set() API. Chessground's set() corrupts internal interaction
 * state after multiple updates in certain DOM contexts (e.g., modals with
 * extra content), making pieces unselectable despite correct state values.
 */

import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import { parseUciMove, getLegalMoves } from './chess-puzzle-utils.js'

/**
 * @typedef {Object} PuzzleBoardConfig
 * @property {string} fen - Starting FEN position
 * @property {string[]} solutionMoves - UCI move strings (full solution line including opponent's first move)
 * @property {HTMLElement} boardEl - DOM element for Chessground mount
 * @property {number} [opponentMoveDelay=500] - ms delay before opponent auto-play
 * @property {number} [initialDelay=600] - ms delay before first opponent move
 * @property {number} [animationDuration=200] - ms for move animation
 * @property {Function} [onCorrectMove] - (moveSan, moveIndex) => void
 * @property {Function} [onWrongMove] - (attemptedSan, expectedUci) => void
 * @property {Function} [onOpponentMove] - (moveSan, moveIndex) => void
 * @property {Function} [onPuzzleComplete] - () => void
 * @property {Function} [onBoardReady] - () => void — called after board init + first opponent move
 */
export class InteractivePuzzleBoard {
  constructor(config) {
    this._config = config
    this._chess = new Chess(config.fen)
    this._board = null
    this._boardEl = config.boardEl
    this._solutionMoves = config.solutionMoves || []
    this._moveIndex = 0
    this._isComplete = false
    this._opponentDelay = config.opponentMoveDelay ?? 500
    this._initialDelay = config.initialDelay ?? 600
    this._animDuration = config.animationDuration ?? 200
    this._timers = []

    // Determine player color: opponent moves first, so player is whoever moves second
    const fenTurn = this._chess.turn()
    this._playerColor = fenTurn === 'w' ? 'black' : 'white'
    this._orientation = this._playerColor
  }

  /** Initialize board and auto-play opponent's first move after delay */
  init() {
    this._createBoard()
    if (this._solutionMoves.length > 0) {
      this._schedule(() => this._playFirstOpponentMove(), this._initialDelay)
    }
  }

  /** Destroy Chessground instance and clean up pending timers */
  destroy() {
    this._timers.forEach(clearTimeout)
    this._timers = []
    if (this._board) {
      this._board.destroy()
      this._board = null
    }
  }

  /** Reset puzzle to initial state */
  reset() {
    this._chess = new Chess(this._config.fen)
    this._moveIndex = 0
    this._isComplete = false
    this.destroy()
    this._createBoard()
    if (this._solutionMoves.length > 0) {
      this._schedule(() => this._playFirstOpponentMove(), this._initialDelay)
    }
  }

  /** Flip board orientation */
  flip() {
    this._orientation = this._orientation === 'white' ? 'black' : 'white'
    if (this._board) {
      this._board.set({ orientation: this._orientation })
      this._board.state.dom.bounds.clear()
    }
  }

  /** Get current state (read-only snapshot) */
  getState() {
    return {
      fen: this._chess.fen(),
      currentMoveIndex: this._moveIndex,
      isComplete: this._isComplete,
      playerColor: this._playerColor,
      orientation: this._orientation,
      totalMoves: this._solutionMoves.length
    }
  }

  /** Get the expected next move as UCI (for hints) */
  getExpectedMove() {
    if (this._moveIndex >= this._solutionMoves.length) return null
    return this._solutionMoves[this._moveIndex]
  }

  /** Get the Chessground instance (for setAutoShapes, etc.) */
  getBoard() { return this._board }

  /** Get the chess.js instance (for FEN, turn, etc.) */
  getChess() { return this._chess }

  // ---- Private methods ----

  /** Schedule a timer and track it for cleanup on destroy/reset */
  _schedule(fn, delay) {
    const id = setTimeout(() => {
      this._timers = this._timers.filter(t => t !== id)
      fn()
    }, delay)
    this._timers.push(id)
  }

  /** Create a fresh Chessground instance with current chess.js state */
  _createBoard() {
    this._board = Chessground(this._boardEl, {
      fen: this._chess.fen(),
      orientation: this._orientation,
      coordinates: true,
      turnColor: this._chess.turn() === 'w' ? 'white' : 'black',
      check: this._chess.inCheck(),
      movable: {
        free: false,
        color: this._isComplete ? undefined : this._playerColor,
        dests: this._isComplete ? new Map() : getLegalMoves(this._chess),
        events: { after: (from, to) => this._handlePlayerMove(from, to) }
      },
      draggable: { enabled: true, showGhost: true },
      animation: { enabled: true, duration: this._animDuration },
      highlight: { lastMove: true, check: true },
      selectable: { enabled: true },
      premovable: { enabled: false }
    })
  }

  _playFirstOpponentMove() {
    const uci = this._solutionMoves[0]
    const parsed = parseUciMove(uci)
    if (!parsed) return

    try {
      const move = this._chess.move(parsed)
      if (!move) return
      this._moveIndex = 1

      this._updateBoardAfterOpponent(move)

      this._config.onOpponentMove?.(move.san, 0)
      this._config.onBoardReady?.()
    } catch { /* invalid move in solution data */ }
  }

  _handlePlayerMove(from, to) {
    if (this._isComplete) return

    const expectedUci = this._solutionMoves[this._moveIndex]
    const expected = parseUciMove(expectedUci)

    // Try the move in chess.js (use solution's promotion piece for under-promotion support)
    let move
    try {
      move = this._chess.move({ from, to, promotion: expected?.promotion || 'q' })
    } catch { return }
    if (!move) return

    // Validate against solution (UCI from/to comparison)
    const isCorrect = expected && move.from === expected.from && move.to === expected.to

    if (isCorrect) {
      this._moveIndex++
      this._config.onCorrectMove?.(move.san, this._moveIndex - 1)

      if (this._moveIndex >= this._solutionMoves.length) {
        this._isComplete = true
        this._disableBoard()
        this._config.onPuzzleComplete?.()
        return
      }

      // Disable interaction while waiting for opponent (minimal set() call)
      this._board.set({ movable: { dests: new Map() } })
      this._board.state.dom.bounds.clear()

      // Play opponent's response after delay
      this._schedule(() => this._playOpponentMove(), this._opponentDelay)
    } else {
      // Wrong move — undo and restore board
      this._chess.undo()
      this._board.set({
        fen: this._chess.fen(),
        turnColor: this._playerColor,
        movable: { color: this._playerColor, dests: getLegalMoves(this._chess) }
      })
      this._board.state.dom.bounds.clear()
      this._config.onWrongMove?.(move.san, expectedUci)
    }
  }

  _playOpponentMove() {
    if (this._moveIndex >= this._solutionMoves.length) return

    const uci = this._solutionMoves[this._moveIndex]
    const parsed = parseUciMove(uci)
    if (!parsed) return

    try {
      const move = this._chess.move(parsed)
      if (!move) return
      this._moveIndex++

      this._updateBoardAfterOpponent(move)

      this._config.onOpponentMove?.(move.san, this._moveIndex - 1)

      if (this._moveIndex >= this._solutionMoves.length) {
        this._isComplete = true
        this._disableBoard()
        this._config.onPuzzleComplete?.()
      }
    } catch { /* invalid move in solution data */ }
  }

  /** Update board after an opponent move with bounds cache clear */
  _updateBoardAfterOpponent(move) {
    this._board.move(move.from, move.to)
      this._board.set({
        fen: this._chess.fen(),
        lastMove: [move.from, move.to],
        turnColor: this._playerColor,
        check: this._chess.inCheck(),
        movable: {
          color: this._playerColor,
          dests: getLegalMoves(this._chess)
        }
      })
      // Clear cached bounds — layout may shift when moves panel grows
      this._board.state.dom.bounds.clear()
  }

  _disableBoard() {
    if (this._board) {
      this._board.set({
        movable: { color: undefined, dests: new Map() }
      })
    }
  }
}
