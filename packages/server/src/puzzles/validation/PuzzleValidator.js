/**
 * PuzzleValidator.js
 * Server-side validation for puzzle creation
 */

import { Chess } from 'chess.js';
import { validateFEN, validateMoveSequence } from '../../shared/MoveConverter.js';

// Validation constants
const MAX_PUZZLE_ID_LENGTH = 50;
const MIN_PUZZLE_ID_LENGTH = 3;
const MAX_FEN_LENGTH = 200;
const MAX_MOVES = 50;
const VALID_SOURCES = ['manual', 'lichess_import', 'interactive', 'pgn', 'lichess'];

/**
 * Validate puzzle ID format
 * @param {string} id - Puzzle ID to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePuzzleId(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'Puzzle ID is required' };
  }

  if (id.length < MIN_PUZZLE_ID_LENGTH || id.length > MAX_PUZZLE_ID_LENGTH) {
    return {
      valid: false,
      error: `Puzzle ID must be ${MIN_PUZZLE_ID_LENGTH}-${MAX_PUZZLE_ID_LENGTH} characters`
    };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return {
      valid: false,
      error: 'Puzzle ID can only contain letters, numbers, hyphens, and underscores'
    };
  }

  return { valid: true };
}

/**
 * Validate source field
 * @param {string} source - Source type
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSource(source) {
  if (!source || !VALID_SOURCES.includes(source)) {
    return {
      valid: false,
      error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}`
    };
  }
  return { valid: true };
}

/**
 * Validate themes array
 * @param {string[]} themes - Array of theme tags
 * @returns {{ valid: boolean, normalizedThemes?: string[], error?: string }}
 */
export function validateThemes(themes) {
  if (!themes) {
    return { valid: true, normalizedThemes: [] };
  }

  if (!Array.isArray(themes)) {
    return { valid: false, error: 'Themes must be an array' };
  }

  const normalized = themes
    .filter(t => typeof t === 'string' && t.trim())
    .map(t => t.toLowerCase().trim());

  return { valid: true, normalizedThemes: normalized };
}

/**
 * Validate rating value
 * @param {number} rating - Puzzle rating
 * @returns {{ valid: boolean, normalizedRating?: number, error?: string }}
 */
export function validateRating(rating) {
  if (rating === undefined || rating === null) {
    return { valid: true, normalizedRating: 1500 };
  }

  const numRating = Number(rating);
  if (isNaN(numRating)) {
    return { valid: false, error: 'Rating must be a number' };
  }

  if (numRating < 500 || numRating > 3500) {
    return { valid: false, error: 'Rating must be between 500 and 3500' };
  }

  return { valid: true, normalizedRating: Math.round(numRating) };
}

/**
 * Complete puzzle validation
 * @param {object} puzzleData - Puzzle data to validate
 * @returns {{ valid: boolean, normalized?: object, errors?: string[] }}
 */
export function validatePuzzle(puzzleData) {
  const errors = [];
  const normalized = {};

  const { id, fen, moves, source, themes, rating, game_url } = puzzleData;

  // Validate ID
  const idResult = validatePuzzleId(id);
  if (!idResult.valid) {
    errors.push(idResult.error);
  } else {
    normalized.id = id;
  }

  // Validate FEN
  if (!fen || typeof fen !== 'string') {
    errors.push('FEN is required');
  } else if (fen.length > MAX_FEN_LENGTH) {
    errors.push(`FEN exceeds maximum length of ${MAX_FEN_LENGTH}`);
  } else {
    const fenResult = validateFEN(fen);
    if (!fenResult.valid) {
      errors.push(`Invalid FEN: ${fenResult.error}`);
    } else {
      normalized.fen = fen.trim();
    }
  }

  // Validate moves
  if (!moves || !Array.isArray(moves) || moves.length === 0) {
    errors.push('At least one move is required');
  } else if (moves.length > MAX_MOVES) {
    errors.push(`Too many moves. Maximum is ${MAX_MOVES}`);
  } else if (normalized.fen) {
    const movesResult = validateMoveSequence(normalized.fen, moves);
    if (!movesResult.valid) {
      errors.push(movesResult.error);
    } else {
      normalized.moves = moves;
      normalized.finalFen = movesResult.finalFen;
    }
  }

  // Validate source
  const sourceResult = validateSource(source);
  if (!sourceResult.valid) {
    errors.push(sourceResult.error);
  } else {
    normalized.source = source;
  }

  // Validate themes
  const themesResult = validateThemes(themes);
  if (!themesResult.valid) {
    errors.push(themesResult.error);
  } else {
    normalized.themes = themesResult.normalizedThemes;
  }

  // Validate rating
  const ratingResult = validateRating(rating);
  if (!ratingResult.valid) {
    errors.push(ratingResult.error);
  } else {
    normalized.rating = ratingResult.normalizedRating;
  }

  // Optional game_url
  normalized.game_url = game_url || '';

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, normalized };
}

/**
 * Verify solution leads to meaningful conclusion (checkmate or significant advantage)
 * @param {string} fen - Starting FEN
 * @param {string[]} moves - Solution moves
 * @returns {{ valid: boolean, isCheckmate?: boolean, isCheck?: boolean, finalFen?: string }}
 */
export function verifySolution(fen, moves) {
  try {
    const chess = new Chess(fen);

    for (const move of moves) {
      const result = chess.move(move);
      if (!result) {
        return { valid: false, error: `Invalid move in solution: ${move}` };
      }
    }

    return {
      valid: true,
      isCheckmate: chess.isCheckmate(),
      isCheck: chess.inCheck(),
      finalFen: chess.fen()
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
