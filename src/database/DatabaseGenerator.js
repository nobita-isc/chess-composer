/**
 * DatabaseGenerator.js
 * Generate puzzles from the SQLite database by theme
 *
 * Updated to use SQL queries instead of in-memory theme indexing.
 */

import { Chess } from 'chess.js';
import { DatabaseLoader } from './DatabaseLoader.js';
import { database } from './SqliteDatabase.js';

export class DatabaseGenerator {
  constructor() {
    this.loader = new DatabaseLoader();
    this.initialized = false;
  }

  /**
   * Initialize the generator by loading the SQLite database
   * @param {string} dbPath - Path to .db file (default: /database/puzzles.db)
   * @param {function} onProgress - Optional callback for progress updates
   */
  async initialize(dbPath = '/database/puzzles.db', onProgress = null) {
    try {
      await this.loader.load(dbPath, onProgress);
      this.initialized = true;
      console.log('DatabaseGenerator initialized successfully (SQLite mode)');
      return true;
    } catch (error) {
      console.error('DatabaseGenerator initialization failed:', error);
      return false;
    }
  }

  /**
   * Map theme names to Lichess theme tags
   * Maps our theme names to one or more Lichess database tags
   * Note: With SQLite, themes are stored directly by their lichess_tag,
   * so this mapping is mainly for backwards compatibility with theme selection UI.
   */
  toLichessTag(theme) {
    const themeMap = {
      // Checkmate patterns
      'backRankMate': ['backrankmate', 'mate', 'matein1', 'matein2'],
      'smotheredMate': ['smotheredmate', 'mate'],
      'arabanMate': ['arabianmate', 'mate'],
      'anastasiasMate': ['anastasiamate', 'mate'],
      'doubleBishopMate': ['doublebishopmate', 'mate'],
      'boden': ['bodenmate', 'mate'],

      // Tactical motifs
      'fork': ['fork', 'knightfork', 'royalfork'],
      'pin': ['pin', 'pinning'],
      'skewer': ['skewer'],
      'discoveredAttack': ['discoveredattack', 'discoveredcheck'],
      'deflection': ['deflection', 'decoy'],
      'attraction': ['attraction'],
      'trapped': ['trappedpiece'],
      'sacrifice': ['sacrifice', 'queensacrifice', 'rooksacrifice'],
      'defensiveMove': ['defensivemove'],
      'clearance': ['clearance'],
      'interference': ['interference'],
      'zugzwang': ['zugzwang'],
      'perpetualCheck': ['perpetualcheck', 'repetition'],
      'hangingPiece': ['hangingpiece'],
      'capturingDefender': ['capturingdefender'],
      'exposedKing': ['exposedking'],
      'kingsideAttack': ['kingsideattack'],
      'queensideAttack': ['queensideattack'],
      'doubleCheck': ['doublecheck'],
      'promotion': ['promotion', 'underpromotion'],
      'enPassant': ['enpassant'],
      'xRayAttack': ['xrayattack'],
      'quietMove': ['quietmove'],
      'intermezzo': ['intermezzo', 'zwischenzug'],
      'crushingMove': ['master', 'brilliant'],

      // Advanced pawn structures
      'advancedPawn': ['advancedpawn'],
      'pawnEndgame': ['pawnendgame', 'endgame'],

      // Piece-specific
      'knightEndgame': ['knightendgame', 'endgame'],
      'bishopEndgame': ['bishopendgame', 'endgame'],
      'rookEndgame': ['rookendgame', 'endgame'],
      'queenEndgame': ['queenendgame', 'endgame'],
      'queenRookEndgame': ['queenrookendgame', 'endgame'],

      // Game phases
      'opening': ['opening', 'short'],
      'middlegame': ['middlegame'],
      'endgame': ['endgame'],

      // Special
      'oneMove': ['onemove', 'short'],
      'long': ['long', 'verylong'],
      'master': ['master', 'brilliant', 'superiorposition']
    };

    // If theme is in our map, return the mapped tags
    if (themeMap[theme]) {
      return themeMap[theme];
    }

    // Otherwise, return the theme as-is (for direct Lichess tags)
    return [theme.toLowerCase()];
  }

  /**
   * Generate puzzles for a specific theme (or all themes if theme is null/empty)
   * @param {string} theme - Theme identifier
   * @param {number} count - Number of puzzles to return
   * @param {object} options - Filter options { minRating, maxRating, minPopularity }
   */
  async generatePuzzles(theme, count = 10, options = {}) {
    if (!this.initialized) {
      console.warn('DatabaseGenerator not initialized, using fallback');
      return [];
    }

    const {
      minRating = 1200,
      maxRating = 2400,
      minPopularity = 85
    } = options;

    // Map theme to Lichess tags
    let themes = [];
    if (theme) {
      const lichessTags = this.toLichessTag(theme);
      themes = Array.isArray(lichessTags) ? lichessTags : [lichessTags];
    }

    // Query puzzles directly from database
    let candidates = this.loader.queryPuzzles({
      themes,
      minRating,
      maxRating,
      minPopularity,
      limit: count * 2  // Get extras in case some are filtered
    });

    console.log(`Theme "${theme}": found ${candidates.length} puzzles after initial query`);

    // If not enough puzzles, relax criteria
    if (candidates.length < count) {
      console.warn(`Not enough puzzles for ${theme}, relaxing filters`);
      candidates = this.loader.queryPuzzles({
        themes,
        minRating: minRating - 200,
        maxRating: maxRating + 200,
        minPopularity: Math.max(70, minPopularity - 15),
        limit: count * 2
      });
    }

    // Select random sample (already randomized by SQL, just take first N)
    const selected = this.loader.getRandomSample(candidates, count);

    return selected.map(puzzle => {
      const fenAfterOpponent = this.getFenAfterMove(puzzle.fen, puzzle.opponentMove);

      // Convert full solution line to SAN
      const solutionLine = this.convertSolutionToSAN(puzzle.fen, puzzle.moves);

      return {
        id: puzzle.id,
        fen: puzzle.fen,
        fenAfterOpponent: fenAfterOpponent,
        opponentMove: puzzle.opponentMove,
        opponentMoveSAN: this.convertUCIToSAN(puzzle.opponentMove, puzzle.fen),
        solution: puzzle.solution,
        solutionSAN: this.convertUCIToSAN(puzzle.solution, fenAfterOpponent),
        solutionLine: solutionLine,
        moves: puzzle.moves,
        rating: puzzle.rating,
        popularity: puzzle.popularity,
        themes: puzzle.themes,
        mateIn: this.detectMateIn(puzzle.themes, puzzle.moves),
        gameUrl: puzzle.gameUrl
      };
    });
  }

  /**
   * Convert UCI move to SAN notation using chess.js
   */
  convertUCIToSAN(uciMove, fen) {
    if (!uciMove) return null;

    try {
      const chess = new Chess(fen);

      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

      // Make the move
      const move = chess.move({
        from: from,
        to: to,
        promotion: promotion
      });

      if (move) {
        return move.san;
      }
    } catch (error) {
      console.warn('Failed to convert UCI to SAN:', uciMove, error);
    }

    // Fallback to UCI notation if conversion fails
    const from = uciMove.substring(0, 2);
    const to = uciMove.substring(2, 4);
    return `${from}-${to}`;
  }

  /**
   * Get FEN position after playing a move
   */
  getFenAfterMove(fen, uciMove) {
    if (!uciMove) return fen;

    try {
      const chess = new Chess(fen);
      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

      chess.move({ from, to, promotion });
      return chess.fen();
    } catch (error) {
      console.warn('Failed to apply move:', uciMove, error);
      return fen;
    }
  }

  /**
   * Convert full solution line to SAN notation
   */
  convertSolutionToSAN(fen, moves) {
    if (!moves || moves.length === 0) return [];

    const sanMoves = [];
    const chess = new Chess(fen);

    for (let i = 0; i < moves.length; i++) {
      const uciMove = moves[i];
      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

      try {
        const move = chess.move({ from, to, promotion });
        if (move) {
          sanMoves.push(move.san);
        }
      } catch (error) {
        console.warn(`Failed to convert move ${uciMove}:`, error);
        sanMoves.push(`${from}-${to}`);
      }
    }

    return sanMoves;
  }

  /**
   * Detect mate-in-N from themes and move sequence
   */
  detectMateIn(themes, moves = []) {
    // First try to calculate from actual moves
    if (moves && moves.length > 1) {
      const yourMoves = Math.ceil((moves.length - 1) / 2);
      return yourMoves;
    }

    // Fallback to theme tags
    for (const theme of themes) {
      const match = theme.match(/matein(\d+)/i);
      if (match) {
        return parseInt(match[1]);
      }
      if (theme.toLowerCase() === 'mate') {
        return 1;
      }
    }
    return null;
  }

  /**
   * Get available themes from the database
   * @returns {array} - Array of theme tags sorted by puzzle count
   */
  getAvailableThemes() {
    if (!this.initialized || !database.isReady()) {
      return [];
    }

    const rows = database.query(`
      SELECT lichess_tag
      FROM themes
      WHERE puzzle_count > 0
      ORDER BY puzzle_count DESC
    `);

    return rows.map(row => row.lichess_tag);
  }

  /**
   * Get themes grouped by category for UI display
   * @returns {object} - { categories: [...], themes: [...] }
   */
  getThemesWithCategories() {
    if (!this.initialized || !database.isReady()) {
      return { categories: [], themes: [] };
    }

    const categories = database.query(`
      SELECT id, name, display_name, icon, display_order
      FROM categories
      ORDER BY display_order
    `);

    const themes = database.query(`
      SELECT t.id, t.lichess_tag, t.display_name, t.description,
             t.display_order, t.puzzle_count, t.category_id,
             c.name as category_name
      FROM themes t
      JOIN categories c ON t.category_id = c.id
      WHERE t.puzzle_count > 0
      ORDER BY c.display_order, t.display_order
    `);

    return { categories, themes };
  }

  /**
   * Get statistics about the database
   * @returns {object} - { totalPuzzles, totalThemes, themes: [...] }
   */
  getStats() {
    if (!this.initialized || !database.isReady()) {
      return { totalPuzzles: 0, totalThemes: 0, themes: [] };
    }

    const totalPuzzles = database.queryScalar('SELECT COUNT(*) FROM puzzles') || 0;

    const themeStats = database.query(`
      SELECT lichess_tag as theme, puzzle_count as count
      FROM themes
      WHERE puzzle_count > 0
      ORDER BY puzzle_count DESC
    `);

    return {
      totalPuzzles,
      totalThemes: themeStats.length,
      themes: themeStats
    };
  }
}

export default DatabaseGenerator;
