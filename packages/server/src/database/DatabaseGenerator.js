/**
 * DatabaseGenerator.js (Server Version)
 * Generate puzzles from the SQLite database by theme
 *
 * Port of client-side version to work with better-sqlite3.
 */

import { Chess } from 'chess.js';
import { databaseLoader } from './DatabaseLoader.js';
import { database } from './SqliteDatabase.js';

export class DatabaseGenerator {
  constructor() {
    this.loader = databaseLoader;
    this.initialized = false;
  }

  /**
   * Initialize the generator by loading the SQLite database
   * @param {string} dbPath - Path to .db file
   */
  initialize(dbPath = null) {
    try {
      this.loader.load(dbPath);
      this.initialized = true;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set blocked puzzle IDs for filtering
   * @param {Set|Array} blockedIds
   */
  setBlockedIds(blockedIds) {
    this.loader.setBlockedIds(blockedIds);
  }

  /**
   * Map theme names to Lichess theme tags
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

      // Endgames
      'advancedPawn': ['advancedpawn'],
      'pawnEndgame': ['pawnendgame', 'endgame'],
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

    if (themeMap[theme]) {
      return themeMap[theme];
    }

    return [theme.toLowerCase()];
  }

  /**
   * Generate puzzles for a specific theme
   * @param {string} theme - Theme identifier
   * @param {number} count - Number of puzzles
   * @param {object} options - Filter options
   */
  generatePuzzles(theme, count = 10, options = {}) {
    if (!this.initialized) {
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

    // Query puzzles
    let candidates = this.loader.queryPuzzles({
      themes,
      minRating,
      maxRating,
      minPopularity,
      limit: count * 2
    });

    // Relax criteria if not enough puzzles
    if (candidates.length < count) {
      candidates = this.loader.queryPuzzles({
        themes,
        minRating: minRating - 200,
        maxRating: maxRating + 200,
        minPopularity: Math.max(70, minPopularity - 15),
        limit: count * 2
      });
    }

    // Take first N (already randomized)
    const selected = candidates.slice(0, count);

    return selected.map(puzzle => {
      const fenAfterOpponent = this.getFenAfterMove(puzzle.fen, puzzle.opponentMove);
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
   * Convert UCI move to SAN notation
   */
  convertUCIToSAN(uciMove, fen) {
    if (!uciMove) return null;

    try {
      const chess = new Chess(fen);
      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

      const move = chess.move({ from, to, promotion });
      if (move) return move.san;
    } catch (error) {
      // Fallback
    }

    return `${uciMove.substring(0, 2)}-${uciMove.substring(2, 4)}`;
  }

  /**
   * Get FEN after playing a move
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

    for (const uciMove of moves) {
      const from = uciMove.substring(0, 2);
      const to = uciMove.substring(2, 4);
      const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

      try {
        const move = chess.move({ from, to, promotion });
        if (move) {
          sanMoves.push(move.san);
        }
      } catch (error) {
        sanMoves.push(`${from}-${to}`);
      }
    }

    return sanMoves;
  }

  /**
   * Detect mate-in-N from themes and moves
   */
  detectMateIn(themes, moves = []) {
    if (moves && moves.length > 1) {
      return Math.ceil((moves.length - 1) / 2);
    }

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
   * Get available themes
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
   * Get themes grouped by category
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
   * Get database statistics
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

export const databaseGenerator = new DatabaseGenerator();

export default DatabaseGenerator;
