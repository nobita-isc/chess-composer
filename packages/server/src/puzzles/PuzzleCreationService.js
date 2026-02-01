/**
 * PuzzleCreationService.js
 * Business logic for creating puzzles
 */

import { validatePuzzle, verifySolution } from './validation/PuzzleValidator.js';
import { puzzleRepository } from './PuzzleRepository.js';
import { sanToUCI, uciToSAN } from '../shared/MoveConverter.js';

export class PuzzleCreationService {
  /**
   * Create a new puzzle
   * @param {object} data - Puzzle creation data
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  createPuzzle(data) {
    const { id, fen, moves, source, themes = [], rating, game_url } = data;

    // 1. Validate all input
    const validation = validatePuzzle({
      id,
      fen,
      moves,
      source,
      themes,
      rating,
      game_url
    });

    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join('; ')
      };
    }

    const normalized = validation.normalized;

    // 2. Check for duplicate ID (primary check, but database constraint is backup)
    if (puzzleRepository.checkDuplicateId(normalized.id)) {
      return {
        success: false,
        error: `Puzzle with ID "${normalized.id}" already exists`
      };
    }

    // Note: Race condition between check and insert is mitigated by database
    // UNIQUE constraint on id column. If a concurrent insert wins,
    // createPuzzle will return an error which we handle below.

    // 3. Verify solution is playable
    const solutionCheck = verifySolution(normalized.fen, normalized.moves);
    if (!solutionCheck.valid) {
      return {
        success: false,
        error: `Solution verification failed: ${solutionCheck.error}`
      };
    }

    // 4. Convert SAN moves to UCI for storage
    const uciConversion = sanToUCI(normalized.fen, normalized.moves);
    if (!uciConversion.success) {
      return {
        success: false,
        error: `Move conversion failed: ${uciConversion.error}`
      };
    }

    // 5. Prepare data for storage
    const puzzleData = {
      id: normalized.id,
      fen: normalized.fen,
      moves: uciConversion.uci,
      rating: normalized.rating,
      themes: normalized.themes.join(','),
      game_url: normalized.game_url,
      source: normalized.source
    };

    // 6. Persist to database
    const result = puzzleRepository.createPuzzle(puzzleData);

    if (!result.success) {
      // Handle duplicate ID from database constraint (race condition fallback)
      if (result.error && result.error.includes('UNIQUE constraint')) {
        return {
          success: false,
          error: `Puzzle with ID "${normalized.id}" already exists`
        };
      }
      return {
        success: false,
        error: 'Failed to save puzzle'
      };
    }

    // 7. Return created puzzle data
    return {
      success: true,
      data: {
        id: puzzleData.id,
        fen: puzzleData.fen,
        movesUCI: puzzleData.moves,
        movesSAN: normalized.moves,
        rating: puzzleData.rating,
        themes: normalized.themes,
        source: puzzleData.source,
        game_url: puzzleData.game_url,
        isCheckmate: solutionCheck.isCheckmate,
        finalFen: solutionCheck.finalFen
      }
    };
  }

  /**
   * Generate a unique puzzle ID
   * @param {string} prefix - Optional prefix (e.g., 'manual', 'pgn')
   * @returns {string}
   */
  generatePuzzleId(prefix = 'custom') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Import puzzle from Lichess data format
   * @param {object} lichessData - Data from Lichess API
   * @param {string} customId - Optional custom ID override
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  importFromLichess(lichessData, customId = null) {
    const id = customId || `lichess_${lichessData.id || this.generatePuzzleId('li')}`;

    return this.createPuzzle({
      id,
      fen: lichessData.fen,
      moves: lichessData.moves, // Assume SAN format
      source: 'lichess_import',
      themes: lichessData.themes || [],
      rating: lichessData.rating,
      game_url: lichessData.game_url || ''
    });
  }

  /**
   * Get statistics about custom puzzles
   * @returns {object}
   */
  getCustomPuzzleStats() {
    const sources = ['manual', 'lichess_import', 'interactive', 'pgn'];
    const stats = {};

    for (const source of sources) {
      stats[source] = puzzleRepository.countPuzzlesBySource(source);
    }

    stats.total = Object.values(stats).reduce((a, b) => a + b, 0);
    return stats;
  }
}

export const puzzleCreationService = new PuzzleCreationService();
