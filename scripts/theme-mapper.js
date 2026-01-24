/**
 * Theme Mapping Configuration
 * Centralized source of truth for theme categorization
 * Used by both build script and runtime
 */

/**
 * Get category definitions
 * @returns {Object} Category name -> { displayName, icon }
 */
export function getCategoryMapping() {
  return {
    checkmate_patterns: {
      displayName: 'Checkmate Patterns',
      icon: '♔'
    },
    tactical_motifs: {
      displayName: 'Tactical Motifs',
      icon: '⚔️'
    },
    advanced_tactics: {
      displayName: 'Advanced Tactics',
      icon: '🎯'
    },
    endgames: {
      displayName: 'Endgames',
      icon: '♟️'
    },
    game_phases: {
      displayName: 'Game Phases',
      icon: '📊'
    }
  };
}

/**
 * Get theme definitions with category assignments
 * @returns {Object} lichess_tag -> { category, displayName, order, description }
 */
export function getThemeMapping() {
  return {
    // Checkmate Patterns
    backrankmate: { category: 'checkmate_patterns', displayName: 'Back Rank Mate', order: 1, description: 'Checkmate delivered on the back rank' },
    smotheredmate: { category: 'checkmate_patterns', displayName: 'Smothered Mate', order: 2, description: 'Knight delivers checkmate while the king is surrounded' },
    arabianmate: { category: 'checkmate_patterns', displayName: 'Arabian Mate', order: 3, description: 'Rook and knight cooperate in the corner' },
    anastasiamate: { category: 'checkmate_patterns', displayName: "Anastasia's Mate", order: 4, description: 'Knight and rook trap the king on the h-file' },
    bodenmate: { category: 'checkmate_patterns', displayName: "Boden's Mate", order: 5, description: 'Two bishops deliver checkmate on criss-crossing diagonals' },
    doublebishopmate: { category: 'checkmate_patterns', displayName: 'Double Bishop Mate', order: 6, description: 'Both bishops coordinate for checkmate' },
    dovetailmate: { category: 'checkmate_patterns', displayName: 'Dovetail Mate', order: 7, description: 'Queen delivers checkmate adjacent to the king' },
    hookmate: { category: 'checkmate_patterns', displayName: 'Hook Mate', order: 8, description: 'Rook, knight, and pawn deliver checkmate' },
    operamate: { category: 'checkmate_patterns', displayName: 'Opera Mate', order: 9, description: 'Bishop and rook deliver checkmate on the back rank' },
    pillsburysmate: { category: 'checkmate_patterns', displayName: "Pillsbury's Mate", order: 10, description: 'Rook and bishop deliver checkmate' },
    matein1: { category: 'checkmate_patterns', displayName: 'Mate in 1', order: 11, description: 'Find the checkmate in one move' },
    matein2: { category: 'checkmate_patterns', displayName: 'Mate in 2', order: 12, description: 'Find the checkmate in two moves' },
    matein3: { category: 'checkmate_patterns', displayName: 'Mate in 3', order: 13, description: 'Find the checkmate in three moves' },
    matein4: { category: 'checkmate_patterns', displayName: 'Mate in 4', order: 14, description: 'Find the checkmate in four moves' },
    matein5: { category: 'checkmate_patterns', displayName: 'Mate in 5', order: 15, description: 'Find the checkmate in five moves' },
    mate: { category: 'checkmate_patterns', displayName: 'Checkmate', order: 16, description: 'Find the checkmate' },

    // Tactical Motifs
    fork: { category: 'tactical_motifs', displayName: 'Fork', order: 1, description: 'Attack two or more pieces simultaneously' },
    knightfork: { category: 'tactical_motifs', displayName: 'Knight Fork', order: 2, description: 'Knight attacks two or more pieces' },
    royalfork: { category: 'tactical_motifs', displayName: 'Royal Fork', order: 3, description: 'Fork attacking king and queen' },
    pin: { category: 'tactical_motifs', displayName: 'Pin', order: 4, description: 'Piece cannot move without exposing a more valuable piece' },
    skewer: { category: 'tactical_motifs', displayName: 'Skewer', order: 5, description: 'Attack through a valuable piece to one behind it' },
    discoveredattack: { category: 'tactical_motifs', displayName: 'Discovered Attack', order: 6, description: 'Moving one piece reveals an attack by another' },
    deflection: { category: 'tactical_motifs', displayName: 'Deflection', order: 7, description: 'Force a defending piece away from its duty' },
    decoy: { category: 'tactical_motifs', displayName: 'Decoy', order: 8, description: 'Lure a piece to a bad square' },
    attraction: { category: 'tactical_motifs', displayName: 'Attraction', order: 9, description: 'Force the king to an unfavorable square' },
    sacrifice: { category: 'tactical_motifs', displayName: 'Sacrifice', order: 10, description: 'Give up material for a greater advantage' },
    queensacrifice: { category: 'tactical_motifs', displayName: 'Queen Sacrifice', order: 11, description: 'Sacrifice the queen for advantage' },
    rooksacrifice: { category: 'tactical_motifs', displayName: 'Rook Sacrifice', order: 12, description: 'Sacrifice a rook for advantage' },
    hangingpiece: { category: 'tactical_motifs', displayName: 'Hanging Piece', order: 13, description: 'Capture an undefended piece' },
    capturingdefender: { category: 'tactical_motifs', displayName: 'Capturing Defender', order: 14, description: 'Remove a piece defending another' },
    trappedpiece: { category: 'tactical_motifs', displayName: 'Trapped Piece', order: 15, description: 'Win a piece that cannot escape' },
    xrayattack: { category: 'tactical_motifs', displayName: 'X-Ray Attack', order: 16, description: 'Attack through another piece' },
    intermezzo: { category: 'tactical_motifs', displayName: 'Intermezzo', order: 17, description: 'Insert a surprising move before the expected one' },
    zwischenzug: { category: 'tactical_motifs', displayName: 'Zwischenzug', order: 18, description: 'Intermediate move before the expected response' },

    // Advanced Tactics
    zugzwang: { category: 'advanced_tactics', displayName: 'Zugzwang', order: 1, description: 'Put opponent in a position where any move worsens their position' },
    perpetualcheck: { category: 'advanced_tactics', displayName: 'Perpetual Check', order: 2, description: 'Force a draw through endless checks' },
    clearance: { category: 'advanced_tactics', displayName: 'Clearance', order: 3, description: 'Move a piece to clear a square or line' },
    interference: { category: 'advanced_tactics', displayName: 'Interference', order: 4, description: 'Block communication between enemy pieces' },
    doublecheck: { category: 'advanced_tactics', displayName: 'Double Check', order: 5, description: 'Check with two pieces simultaneously' },
    discoveredcheck: { category: 'advanced_tactics', displayName: 'Discovered Check', order: 6, description: 'Reveal a check by moving another piece' },
    quietmove: { category: 'advanced_tactics', displayName: 'Quiet Move', order: 7, description: 'A non-capturing, non-checking move that creates a threat' },
    defensivemove: { category: 'advanced_tactics', displayName: 'Defensive Move', order: 8, description: 'A move that defends against a threat' },
    exposedking: { category: 'advanced_tactics', displayName: 'Exposed King', order: 9, description: 'Exploit an unsafe king position' },
    kingsideattack: { category: 'advanced_tactics', displayName: 'Kingside Attack', order: 10, description: 'Attack on the kingside' },
    queensideattack: { category: 'advanced_tactics', displayName: 'Queenside Attack', order: 11, description: 'Attack on the queenside' },
    promotion: { category: 'advanced_tactics', displayName: 'Promotion', order: 12, description: 'Promote a pawn' },
    underpromotion: { category: 'advanced_tactics', displayName: 'Underpromotion', order: 13, description: 'Promote to a piece other than queen' },
    enpassant: { category: 'advanced_tactics', displayName: 'En Passant', order: 14, description: 'Capture a pawn en passant' },
    master: { category: 'advanced_tactics', displayName: 'Master Level', order: 15, description: 'Master-level tactical puzzle' },
    brilliant: { category: 'advanced_tactics', displayName: 'Brilliant Move', order: 16, description: 'A brilliant tactical move' },
    crushing: { category: 'advanced_tactics', displayName: 'Crushing', order: 17, description: 'A crushing tactical blow' },

    // Endgames
    endgame: { category: 'endgames', displayName: 'Endgame', order: 1, description: 'General endgame puzzle' },
    queenendgame: { category: 'endgames', displayName: 'Queen Endgame', order: 2, description: 'Endgame with queens' },
    rookendgame: { category: 'endgames', displayName: 'Rook Endgame', order: 3, description: 'Endgame with rooks' },
    bishopendgame: { category: 'endgames', displayName: 'Bishop Endgame', order: 4, description: 'Endgame with bishops' },
    knightendgame: { category: 'endgames', displayName: 'Knight Endgame', order: 5, description: 'Endgame with knights' },
    pawnendgame: { category: 'endgames', displayName: 'Pawn Endgame', order: 6, description: 'Endgame with only pawns' },
    queenrookendgame: { category: 'endgames', displayName: 'Queen & Rook Endgame', order: 7, description: 'Endgame with queen and rook' },
    advancedpawn: { category: 'endgames', displayName: 'Advanced Pawn', order: 8, description: 'Puzzles involving advanced pawns' },

    // Game Phases
    opening: { category: 'game_phases', displayName: 'Opening', order: 1, description: 'Puzzles from the opening phase' },
    middlegame: { category: 'game_phases', displayName: 'Middlegame', order: 2, description: 'Puzzles from the middlegame' },
    short: { category: 'game_phases', displayName: 'Short Puzzle', order: 3, description: 'Short tactical sequence' },
    long: { category: 'game_phases', displayName: 'Long Puzzle', order: 4, description: 'Long tactical sequence' },
    verylong: { category: 'game_phases', displayName: 'Very Long Puzzle', order: 5, description: 'Very long tactical sequence' },
    advantage: { category: 'game_phases', displayName: 'Advantage', order: 6, description: 'Convert an advantage' },
    equality: { category: 'game_phases', displayName: 'Equality', order: 7, description: 'Achieve equality from a worse position' }
  };
}

/**
 * Get all theme tags that belong to a category
 * @param {string} categoryName - Category name
 * @returns {string[]} Array of theme tags
 */
export function getThemesByCategory(categoryName) {
  const themes = getThemeMapping();
  return Object.entries(themes)
    .filter(([_, data]) => data.category === categoryName)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([tag]) => tag);
}
