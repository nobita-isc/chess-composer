/**
 * DatabaseLoader.js
 * Load and query puzzles from SQLite database (sql.js)
 *
 * Replaces the previous CSV-based loader with SQLite for faster startup.
 */

import { database } from './SqliteDatabase.js';

export class DatabaseLoader {
  constructor() {
    this.db = database;
    this.loaded = false;
  }

  /**
   * Load the SQLite database
   * @param {string} dbPath - Path to the .db file (default: /database/puzzles.db)
   * @param {function} onProgress - Optional callback for progress updates
   */
  async load(dbPath = '/database/puzzles.db', onProgress = null) {
    console.log('Loading puzzle database from:', dbPath);

    try {
      await this.db.initialize(dbPath, onProgress);
      this.loaded = true;
      return this;
    } catch (error) {
      console.error('Database loading error:', error);
      throw error;
    }
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
    limit = 100
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
   * Themes are stored as comma-separated text in the optimized schema.
   * @param {object} row - Database row
   * @returns {object} - Puzzle object
   */
  parsePuzzle(row) {
    const moves = row.moves ? row.moves.split(' ') : [];
    // Themes are stored as comma-separated string
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
   * Get random sample from an array
   * Note: SQLite handles randomization via ORDER BY RANDOM()
   * This is kept for compatibility
   * @param {array} puzzles
   * @param {number} count
   * @returns {array}
   */
  getRandomSample(puzzles, count) {
    // Already randomized by SQL query, just take first N
    return puzzles.slice(0, count);
  }

  /**
   * Legacy method - returns empty array since we use SQL queries now
   * @deprecated Use queryPuzzles() instead
   */
  getPuzzles() {
    console.warn('getPuzzles() is deprecated with SQLite. Use queryPuzzles() instead.');
    return [];
  }

  /**
   * Legacy method - use queryPuzzles({ themes: [themeName] }) instead
   * @deprecated
   */
  filterByTheme(themeName) {
    console.warn('filterByTheme() is deprecated. Use queryPuzzles() instead.');
    return this.queryPuzzles({ themes: [themeName.toLowerCase()], limit: 1000 });
  }

  /**
   * Legacy method - use queryPuzzles() instead
   * @deprecated
   */
  filterByRating(minRating, maxRating) {
    console.warn('filterByRating() is deprecated. Use queryPuzzles() instead.');
    return this.queryPuzzles({ minRating, maxRating, limit: 1000 });
  }

  /**
   * Legacy method - use queryPuzzles() instead
   * @deprecated
   */
  filterByPopularity(minPopularity) {
    console.warn('filterByPopularity() is deprecated. Use queryPuzzles() instead.');
    return this.queryPuzzles({ minPopularity, limit: 1000 });
  }
}

export default DatabaseLoader;
