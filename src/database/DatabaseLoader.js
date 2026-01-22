/**
 * DatabaseLoader.js
 * Load and parse Lichess puzzle database from CSV
 */

import Papa from 'papaparse';

export class DatabaseLoader {
  constructor() {
    this.puzzles = [];
    this.loaded = false;
  }

  /**
   * Load puzzles from CSV file
   */
  async load(csvPath) {
    return new Promise((resolve, reject) => {
      console.log('Loading puzzle database from:', csvPath);

      fetch(csvPath)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load database: ${response.statusText}`);
          }
          return response.text();
        })
        .then(csvText => {
          // Parse CSV with PapaParse
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              this.puzzles = results.data.map(row => this.parsePuzzle(row));
              this.loaded = true;
              console.log(`✅ Loaded ${this.puzzles.length} puzzles from database`);
              resolve(this.puzzles);
            },
            error: (error) => {
              console.error('CSV parsing error:', error);
              reject(error);
            }
          });
        })
        .catch(error => {
          console.error('Database loading error:', error);
          reject(error);
        });
    });
  }

  /**
   * Parse a puzzle row from CSV
   * CSV Format: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl
   */
  parsePuzzle(row) {
    const moves = row.Moves ? row.Moves.split(' ') : [];
    const themes = row.Themes ? row.Themes.split(' ') : [];

    return {
      id: row.PuzzleId,
      fen: row.FEN,
      moves: moves,
      opponentMove: moves.length > 0 ? moves[0] : null,  // First move to animate
      solution: moves.length > 1 ? moves[1] : moves[0],   // Actual winning move
      fullLine: moves,  // Keep all moves for continuation
      rating: parseInt(row.Rating) || 1500,
      ratingDeviation: parseInt(row.RatingDeviation) || 0,
      popularity: parseInt(row.Popularity) || 0,
      nbPlays: parseInt(row.NbPlays) || 0,
      themes: themes,
      gameUrl: row.GameUrl
    };
  }

  /**
   * Get all puzzles
   */
  getPuzzles() {
    return this.puzzles;
  }

  /**
   * Filter puzzles by theme
   */
  filterByTheme(themeName) {
    return this.puzzles.filter(puzzle =>
      puzzle.themes.some(theme =>
        theme.toLowerCase().includes(themeName.toLowerCase())
      )
    );
  }

  /**
   * Filter puzzles by rating range
   */
  filterByRating(minRating, maxRating) {
    return this.puzzles.filter(puzzle =>
      puzzle.rating >= minRating && puzzle.rating <= maxRating
    );
  }

  /**
   * Filter puzzles by popularity
   */
  filterByPopularity(minPopularity) {
    return this.puzzles.filter(puzzle =>
      puzzle.popularity >= minPopularity
    );
  }

  /**
   * Get random sample of puzzles
   */
  getRandomSample(puzzles, count) {
    const shuffled = [...puzzles].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

export default DatabaseLoader;
