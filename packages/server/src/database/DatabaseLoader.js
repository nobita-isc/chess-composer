/**
 * DatabaseLoader.js (Server Version)
 * Load and query puzzles from SQLite database
 *
 * Port of the client-side version to work with better-sqlite3.
 */

import { database } from './SqliteDatabase.js';

export class DatabaseLoader {
  constructor() {
    this.db = database;
    this.loaded = false;
    this.blockedIds = new Set();
  }

  /**
   * Set blocked puzzle IDs for filtering
   * @param {Set|Array} blockedIds - Set or array of blocked puzzle IDs
   */
  setBlockedIds(blockedIds) {
    this.blockedIds = new Set(blockedIds);
  }

  /**
   * Load the SQLite database
   * @param {string} dbPath - Path to the .db file
   */
  load(dbPath = null) {
    this.db.initialize(dbPath);
    this.loaded = true;
    return this;
  }

  /**
   * Check if database is loaded
   */
  isLoaded() {
    return this.loaded && this.db.isReady();
  }

  /**
   * Query puzzles with filters (uses fast in-memory theme index)
   * @param {object} options - Query options
   * @returns {array} - Array of puzzle objects
   */
  queryPuzzles({
    themes = [],
    minRating = 0,
    maxRating = 5000,
    minPopularity = 0,
    limit = 100,
    excludeBlocked = true
  } = {}) {
    if (!this.isLoaded()) {
      throw new Error('Database not loaded');
    }

    let puzzleIds = [];

    if (themes.length > 0 && this.db.themeIndex) {
      // Use fast in-memory index
      const idSets = themes.map(theme =>
        new Set(this.db.getPuzzleIdsByTheme(theme, { minRating, maxRating, minPopularity }))
      );

      // Union of all theme matches
      const allIds = new Set();
      for (const idSet of idSets) {
        for (const id of idSet) {
          allIds.add(id);
        }
      }
      puzzleIds = Array.from(allIds);
    } else {
      // No theme filter or no index - use SQL (slower fallback)
      const rows = this.db.query(`
        SELECT id FROM puzzles
        WHERE rating BETWEEN ? AND ?
          AND popularity >= ?
      `, [minRating, maxRating, minPopularity]);
      puzzleIds = rows.map(r => r.id);
    }

    // Filter out blocked puzzles
    if (excludeBlocked && this.blockedIds.size > 0) {
      puzzleIds = puzzleIds.filter(id => !this.blockedIds.has(id));
    }

    if (puzzleIds.length === 0) {
      return [];
    }

    // Random sample
    const sampled = this.randomSample(puzzleIds, limit);

    // Fetch full puzzle data for sampled IDs
    const rows = this.db.getPuzzlesByIds(sampled);

    // Shuffle for randomness
    const shuffled = this.shuffleArray(rows);

    return shuffled.map(row => this.parsePuzzle(row));
  }

  /**
   * Get random sample from array (efficient)
   */
  randomSample(array, n) {
    if (array.length <= n) return [...array];

    const result = [];
    const taken = new Set();

    while (result.length < n) {
      const idx = Math.floor(Math.random() * array.length);
      if (!taken.has(idx)) {
        taken.add(idx);
        result.push(array[idx]);
      }
    }

    return result;
  }

  /**
   * Fisher-Yates shuffle for better randomness
   */
  shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Parse a puzzle row from SQLite to match the expected format
   * @param {object} row - Database row
   * @returns {object} - Puzzle object
   */
  parsePuzzle(row) {
    const moves = row.moves ? row.moves.split(' ') : [];
    const themes = row.themes ? row.themes.split(',').filter(t => t) : [];

    return {
      id: row.id,
      fen: row.fen,
      moves: moves,
      opponentMove: moves.length > 0 ? moves[0] : null,
      solution: moves.length > 1 ? moves[1] : moves[0],
      fullLine: moves,
      rating: row.rating,
      ratingDeviation: row.rating_deviation || 0,
      popularity: row.popularity || 0,
      nbPlays: row.nb_plays || 0,
      themes: themes,
      gameUrl: row.game_url || ''
    };
  }

  /**
   * Get total puzzle count
   * @returns {number}
   */
  getTotalCount() {
    if (!this.isLoaded()) return 0;
    return this.db.queryScalar('SELECT COUNT(*) FROM puzzles') || 0;
  }

  /**
   * Get available themes from the theme index
   * @returns {array} - Array of theme names
   */
  getAvailableThemes() {
    if (!this.db.themeIndex) return [];
    return Array.from(this.db.themeIndex.keys());
  }

  /**
   * Get statistics about themes
   * @returns {object} - Stats object
   */
  getStats() {
    const totalPuzzles = this.getTotalCount();
    const themes = [];

    if (this.db.themeIndex) {
      for (const [theme, puzzles] of this.db.themeIndex.entries()) {
        themes.push({
          theme,
          count: puzzles.length
        });
      }
      themes.sort((a, b) => b.count - a.count);
    }

    return {
      totalPuzzles,
      themes
    };
  }
}

export const databaseLoader = new DatabaseLoader();

export default DatabaseLoader;
