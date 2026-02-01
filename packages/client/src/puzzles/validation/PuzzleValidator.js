/**
 * PuzzleValidator.js (Client-side)
 * Validation utilities for puzzle creation forms
 */

import { Chess } from 'chess.js';

/**
 * Validate FEN string
 * @param {string} fen - FEN to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFEN(fen) {
  if (!fen || typeof fen !== 'string') {
    return { valid: false, error: 'FEN is required' };
  }

  try {
    new Chess(fen);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid FEN position' };
  }
}

/**
 * Validate move sequence from a position
 * @param {string} fen - Starting FEN
 * @param {string[]} moves - Moves in SAN notation
 * @returns {{ valid: boolean, finalFen?: string, error?: string, validMoves?: number }}
 */
export function validateMoves(fen, moves) {
  if (!moves || !Array.isArray(moves) || moves.length === 0) {
    return { valid: false, error: 'At least one move is required' };
  }

  try {
    const chess = new Chess(fen);
    let validCount = 0;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i].trim();
      if (!move) continue;

      const result = chess.move(move);
      if (!result) {
        return {
          valid: false,
          error: `Invalid move at position ${i + 1}: "${move}"`,
          validMoves: validCount
        };
      }
      validCount++;
    }

    return {
      valid: true,
      finalFen: chess.fen(),
      validMoves: validCount
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate puzzle ID
 * @param {string} id - Puzzle ID
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePuzzleId(id) {
  if (!id) {
    return { valid: true }; // Optional - will be auto-generated
  }

  if (typeof id !== 'string') {
    return { valid: false, error: 'ID must be a string' };
  }

  if (id.length < 3 || id.length > 50) {
    return { valid: false, error: 'ID must be 3-50 characters' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return { valid: false, error: 'ID can only contain letters, numbers, hyphens, underscores' };
  }

  return { valid: true };
}

/**
 * Validate rating
 * @param {number} rating - Puzzle rating
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateRating(rating) {
  if (rating === undefined || rating === null || rating === '') {
    return { valid: true }; // Optional
  }

  const num = Number(rating);
  if (isNaN(num)) {
    return { valid: false, error: 'Rating must be a number' };
  }

  if (num < 500 || num > 3500) {
    return { valid: false, error: 'Rating must be between 500 and 3500' };
  }

  return { valid: true };
}

/**
 * Parse moves from text input
 * Handles various input formats: space-separated, comma-separated, newline-separated
 * @param {string} text - Raw moves text
 * @returns {string[]}
 */
export function parseMoves(text) {
  if (!text || typeof text !== 'string') return [];

  return text
    .split(/[\s,;\n]+/)
    .map(m => m.trim())
    .filter(m => m && m.length > 0);
}

/**
 * Validate complete puzzle data
 * @param {object} data - { id?, fen, moves, rating? }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePuzzle(data) {
  const errors = [];

  // Validate ID (optional)
  if (data.id) {
    const idResult = validatePuzzleId(data.id);
    if (!idResult.valid) errors.push(idResult.error);
  }

  // Validate FEN
  const fenResult = validateFEN(data.fen);
  if (!fenResult.valid) {
    errors.push(fenResult.error);
  } else {
    // Validate moves only if FEN is valid
    const movesResult = validateMoves(data.fen, data.moves);
    if (!movesResult.valid) {
      errors.push(movesResult.error);
    }
  }

  // Validate rating (optional)
  if (data.rating !== undefined) {
    const ratingResult = validateRating(data.rating);
    if (!ratingResult.valid) errors.push(ratingResult.error);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get the turn color from FEN
 * @param {string} fen - FEN string
 * @returns {'white'|'black'|null}
 */
export function getTurnFromFEN(fen) {
  try {
    const chess = new Chess(fen);
    return chess.turn() === 'w' ? 'white' : 'black';
  } catch {
    return null;
  }
}

/**
 * Check if position is checkmate after moves
 * @param {string} fen - Starting FEN
 * @param {string[]} moves - Moves to apply
 * @returns {{ isCheckmate: boolean, isCheck: boolean }}
 */
export function checkMateStatus(fen, moves) {
  try {
    const chess = new Chess(fen);
    for (const move of moves) {
      chess.move(move);
    }
    return {
      isCheckmate: chess.isCheckmate(),
      isCheck: chess.inCheck()
    };
  } catch {
    return { isCheckmate: false, isCheck: false };
  }
}
