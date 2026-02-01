/**
 * MoveConverter.js
 * Utilities for converting between chess move notations
 */

import { Chess } from 'chess.js';

/**
 * Convert SAN moves to UCI notation
 * @param {string} fen - Starting FEN position
 * @param {string[]} sanMoves - Array of moves in SAN notation (e.g., ["e4", "e5", "Nf3"])
 * @returns {{ success: boolean, uci?: string, error?: string }}
 */
export function sanToUCI(fen, sanMoves) {
  try {
    const chess = new Chess(fen);
    const uciMoves = [];

    for (const san of sanMoves) {
      const move = chess.move(san);
      if (!move) {
        return {
          success: false,
          error: `Invalid move: ${san} at position ${chess.fen()}`
        };
      }
      const uci = `${move.from}${move.to}${move.promotion || ''}`;
      uciMoves.push(uci);
    }

    return {
      success: true,
      uci: uciMoves.join(' ')
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Convert UCI notation to SAN moves
 * @param {string} fen - Starting FEN position
 * @param {string} uciString - Space-separated UCI moves (e.g., "e2e4 e7e5 g1f3")
 * @returns {{ success: boolean, san?: string[], error?: string }}
 */
export function uciToSAN(fen, uciString) {
  try {
    const uciMoves = uciString.split(' ').filter(m => m.trim());
    const chess = new Chess(fen);
    const sanMoves = [];

    for (const uci of uciMoves) {
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;

      const move = chess.move({ from, to, promotion });
      if (!move) {
        return {
          success: false,
          error: `Invalid UCI move: ${uci}`
        };
      }
      sanMoves.push(move.san);
    }

    return {
      success: true,
      san: sanMoves
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate that a FEN string represents a legal chess position
 * @param {string} fen - FEN string to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFEN(fen) {
  try {
    new Chess(fen);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate a sequence of moves from a given position
 * @param {string} fen - Starting FEN
 * @param {string[]} sanMoves - Moves in SAN notation
 * @returns {{ valid: boolean, finalFen?: string, error?: string }}
 */
export function validateMoveSequence(fen, sanMoves) {
  try {
    const chess = new Chess(fen);

    for (let i = 0; i < sanMoves.length; i++) {
      const move = chess.move(sanMoves[i]);
      if (!move) {
        return {
          valid: false,
          error: `Illegal move at position ${i + 1}: ${sanMoves[i]}`
        };
      }
    }

    return {
      valid: true,
      finalFen: chess.fen()
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}
