/**
 * PuzzleRepository.js
 * Data access layer for puzzle creation and management
 */

import { database } from '../database/SqliteDatabase.js';

export class PuzzleRepository {
  /**
   * Check if a puzzle ID already exists
   * @param {string} id - Puzzle ID to check
   * @returns {boolean}
   */
  async checkDuplicateId(id) {
    const result = await database.queryOne('SELECT id FROM puzzles WHERE id = ? LIMIT 1', [id]);
    return result !== null;
  }

  /**
   * Create a new puzzle
   * @param {object} puzzleData - Validated puzzle data
   * @returns {{ success: boolean, error?: string }}
   */
  async createPuzzle(puzzleData) {
    try {
      const { id, fen, moves, rating, themes, game_url, source } = puzzleData;

      await database.run(
        `INSERT INTO puzzles (
          id, fen, moves, rating, rating_deviation, popularity,
          nb_plays, themes, game_url, opening_tags, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, fen, moves, rating, 75, 100, 0, themes, game_url || '', '', source]
      );

      // Update the in-memory theme index (sqlite path only — no-op if themeIndex is null)
      database.addToThemeIndex(id, themes, rating, 100);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get puzzle by ID
   * @param {string} id - Puzzle ID
   * @returns {object|null}
   */
  async getPuzzleById(id) {
    return database.queryOne('SELECT * FROM puzzles WHERE id = ?', [id]);
  }

  /**
   * Get puzzles by source type
   * @param {string} source - Source type (e.g., 'manual', 'lichess')
   * @param {object} options - { limit, offset }
   * @returns {object[]}
   */
  async getPuzzlesBySource(source, { limit = 100, offset = 0 } = {}) {
    return database.query(
      'SELECT * FROM puzzles WHERE source = ? LIMIT ? OFFSET ?',
      [source, limit, offset]
    );
  }

  /**
   * Count puzzles by source
   * @param {string} source - Source type
   * @returns {number}
   */
  async countPuzzlesBySource(source) {
    const result = await database.queryScalar(
      'SELECT COUNT(*) as count FROM puzzles WHERE source = ?',
      [source]
    );
    return result || 0;
  }

  /**
   * Delete a puzzle by ID
   * @param {string} id - Puzzle ID
   * @returns {{ success: boolean, error?: string }}
   */
  async deletePuzzle(id) {
    try {
      const result = await database.run('DELETE FROM puzzles WHERE id = ?', [id]);
      if (result.changes === 0) {
        return { success: false, error: 'Puzzle not found' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export const puzzleRepository = new PuzzleRepository();
