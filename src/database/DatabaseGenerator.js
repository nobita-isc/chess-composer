/**
 * DatabaseGenerator.js
 * Generate puzzles from the Lichess database by theme
 */

import { Chess } from 'chess.js';
import { DatabaseLoader } from './DatabaseLoader.js';

export class DatabaseGenerator {
  constructor() {
    this.loader = new DatabaseLoader();
    this.themeIndex = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the generator by loading the database
   */
  async initialize(csvPath = '/database/lichess_puzzles.csv') {
    try {
      await this.loader.load(csvPath);
      await this.buildThemeIndex();
      this.initialized = true;
      console.log('✅ DatabaseGenerator initialized successfully');
      return true;
    } catch (error) {
      console.error('DatabaseGenerator initialization failed:', error);
      return false;
    }
  }

  /**
   * Build an index of puzzles by theme for fast lookup
   */
  async buildThemeIndex() {
    const puzzles = this.loader.getPuzzles();

    puzzles.forEach(puzzle => {
      puzzle.themes.forEach(theme => {
        const themeKey = theme.toLowerCase();
        if (!this.themeIndex.has(themeKey)) {
          this.themeIndex.set(themeKey, []);
        }
        this.themeIndex.get(themeKey).push(puzzle);
      });
    });

    console.log(`📚 Theme index built: ${this.themeIndex.size} unique themes`);
    console.log('Available themes:', Array.from(this.themeIndex.keys()).slice(0, 10).join(', '));
  }

  /**
   * Map theme names to Lichess theme tags
   * Maps our theme names to one or more Lichess database tags
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
      'oneMove': ['onemo ve', 'short'],
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

    let candidates = [];

    // If no theme specified, get all puzzles
    if (!theme) {
      candidates = this.loader.getPuzzles();
      console.log(`🎲 Getting random puzzles from all themes`);
    } else {
      // Map theme to Lichess tags
      const lichessTags = this.toLichessTag(theme);
      const tags = Array.isArray(lichessTags) ? lichessTags : [lichessTags];

      // Get candidate puzzles for all matching tags
      tags.forEach(tag => {
        const puzzles = this.themeIndex.get(tag) || [];
        candidates.push(...puzzles);
      });

      // Remove duplicates
      candidates = Array.from(new Map(candidates.map(p => [p.id, p])).values());
    }

    // Filter by quality criteria
    let filtered = candidates.filter(puzzle =>
      puzzle.rating >= minRating &&
      puzzle.rating <= maxRating &&
      puzzle.popularity >= minPopularity
    );

    console.log(`🎯 Theme "${theme}": found ${candidates.length} puzzles, ${filtered.length} after filtering`);

    // If not enough puzzles, relax criteria
    if (filtered.length < count) {
      console.warn(`⚠️  Not enough puzzles for ${theme}, relaxing filters`);
      filtered = candidates.filter(puzzle =>
        puzzle.rating >= minRating - 200 &&
        puzzle.rating <= maxRating + 200 &&
        puzzle.popularity >= Math.max(70, minPopularity - 15)
      );
    }

    // Random sample
    const selected = this.loader.getRandomSample(filtered, count);

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
        solutionLine: solutionLine,  // Full solution line in SAN
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
        // Return the SAN notation (like "Ra8#" or "Nf7#")
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
   * Returns array of moves: [opponentMove, yourMove1, opponentMove2, yourMove2, ...]
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
    // Lichess format: [opponentMove, yourMove1, opponentMove2, yourMove2, ...]
    // Mate-in-N = number of YOUR moves needed
    if (moves && moves.length > 1) {
      // Count moves after the first opponent move
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
   * Get available themes
   */
  getAvailableThemes() {
    return Array.from(this.themeIndex.keys());
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalPuzzles: this.loader.getPuzzles().length,
      totalThemes: this.themeIndex.size,
      themes: Array.from(this.themeIndex.entries()).map(([theme, puzzles]) => ({
        theme,
        count: puzzles.length
      }))
    };
  }
}

export default DatabaseGenerator;
