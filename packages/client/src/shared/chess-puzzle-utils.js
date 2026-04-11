/**
 * chess-puzzle-utils.js
 * Pure utility functions for chess puzzle logic.
 * No Chessground dependency — only chess.js types used.
 */

import { Chess } from 'chess.js'

/**
 * Parse UCI move string to { from, to, promotion }
 * @param {string} uci - e.g. "e2e4", "e7e8q"
 * @returns {{ from: string, to: string, promotion?: string } | null}
 */
export function parseUciMove(uci) {
  if (!uci || uci.length < 4) return null
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined
  }
}

/**
 * Get legal moves as Map<from, to[]> for Chessground dests config
 * @param {import('chess.js').Chess} chess - chess.js instance
 * @returns {Map<string, string[]>}
 */
export function getLegalMoves(chess) {
  const dests = new Map()
  for (const move of chess.moves({ verbose: true })) {
    if (!dests.has(move.from)) dests.set(move.from, [])
    dests.get(move.from).push(move.to)
  }
  return dests
}

/**
 * Convert UCI move array to SAN array using chess.js
 * @param {string} fen - starting FEN position
 * @param {string[]} uciMoves - array of UCI strings
 * @returns {string[]} SAN moves (stops at first invalid move)
 */
export function uciMovesToSan(fen, uciMoves) {
  const chess = new Chess(fen)
  const sanMoves = []
  for (const uci of uciMoves) {
    const parsed = parseUciMove(uci)
    if (!parsed) break
    try {
      const move = chess.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion })
      if (move) sanMoves.push(move.san)
      else break
    } catch { break }
  }
  return sanMoves
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
