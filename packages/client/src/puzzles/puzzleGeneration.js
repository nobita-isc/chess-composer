/**
 * puzzleGeneration.js
 * Shared puzzle generation utilities used by both the Generate view and CreateExerciseDialog
 */

import { Chess } from 'chess.js';

export const THEME_CATEGORIES = {
  'Checkmate Patterns': [
    'backrankmate', 'smotheredmate', 'arabianmate', 'anastasiasmate',
    'doublebishopmate', 'dovetailmate', 'hookmate', 'operamate',
    'pillsburysmate', 'bodenmate', 'matein1', 'matein2', 'matein3'
  ],
  'Tactical Motifs': [
    'fork', 'pin', 'skewer', 'discoveredattack', 'deflection',
    'attraction', 'sacrifice', 'hangingpiece', 'capturingdefender',
    'trappedpiece', 'xrayattack', 'intermezzo', 'zwischenzug'
  ],
  'Advanced Tactics': [
    'zugzwang', 'perpetualcheck', 'clearance', 'interference',
    'doublecheck', 'discoveredcheck', 'quietmove', 'defensivemove',
    'exposedking', 'kingsideattack', 'queensideattack', 'promotion',
    'underpromotion', 'enpassant', 'master', 'brilliant'
  ],
  'Endgames': [
    'endgame', 'queenendgame', 'rookendgame', 'bishopendgame',
    'knightendgame', 'queenrookendgame', 'pawnendgame', 'advancedpawn'
  ],
  'Game Phases': [
    'opening', 'middlegame', 'short', 'long', 'verylong'
  ]
};

export const RATING_RANGE_OPTIONS = [
  { value: '', label: 'All Ratings' },
  { value: '1000-1500', label: '1000-1500 (Beginner)' },
  { value: '1500-2000', label: '1500-2000 (Intermediate)' },
  { value: '2000-2500', label: '2000-2500 (Advanced)' },
  { value: '2500-3000', label: '2500+ (Expert)' }
];

const SPECIAL_THEME_NAMES = {
  'matein1': 'Mate in 1',
  'matein2': 'Mate in 2',
  'matein3': 'Mate in 3',
  'matein4': 'Mate in 4',
  'matein5': 'Mate in 5',
  'backrankmate': 'Back Rank Mate',
  'smotheredmate': 'Smothered Mate',
  'anastasiasmate': "Anastasia's Mate",
  'arabianmate': 'Arabian Mate',
  'doublebishopmate': 'Double Bishop Mate',
  'dovetailmate': 'Dovetail Mate',
  'hookmate': 'Hook Mate',
  'operamate': 'Opera Mate',
  'pillsburysmate': "Pillsbury's Mate",
  'bodenmate': "Boden's Mate",
  'fork': 'Fork',
  'knightfork': 'Knight Fork',
  'royalfork': 'Royal Fork',
  'pin': 'Pin',
  'skewer': 'Skewer',
  'discoveredattack': 'Discovered Attack',
  'discoveredcheck': 'Discovered Check',
  'doublecheck': 'Double Check',
  'deflection': 'Deflection',
  'attraction': 'Attraction',
  'trappedpiece': 'Trapped Piece',
  'sacrifice': 'Sacrifice',
  'queensacrifice': 'Queen Sacrifice',
  'rooksacrifice': 'Rook Sacrifice',
  'defensivemove': 'Defensive Move',
  'clearance': 'Clearance',
  'interference': 'Interference',
  'zugzwang': 'Zugzwang',
  'perpetualcheck': 'Perpetual Check',
  'hangingpiece': 'Hanging Piece',
  'capturingdefender': 'Capturing Defender',
  'exposedking': 'Exposed King',
  'kingsideattack': 'Kingside Attack',
  'queensideattack': 'Queenside Attack',
  'promotion': 'Promotion',
  'underpromotion': 'Underpromotion',
  'enpassant': 'En Passant',
  'xrayattack': 'X-Ray Attack',
  'quietmove': 'Quiet Move',
  'intermezzo': 'Intermezzo',
  'zwischenzug': 'Zwischenzug',
  'queenendgame': 'Queen Endgame',
  'rookendgame': 'Rook Endgame',
  'bishopendgame': 'Bishop Endgame',
  'knightendgame': 'Knight Endgame',
  'queenrookendgame': 'Queen & Rook Endgame',
  'pawnendgame': 'Pawn Endgame',
  'advancedpawn': 'Advanced Pawn',
  'middlegame': 'Middlegame',
  'endgame': 'Endgame',
  'opening': 'Opening',
  'short': 'Short Puzzle',
  'long': 'Long Puzzle',
  'verylong': 'Very Long Puzzle',
  'master': 'Master-level',
  'brilliant': 'Brilliant Move',
  'crushing': 'Crushing Move'
};

/**
 * Format a theme ID into a human-readable display name
 * @param {string} themeId - Theme identifier (e.g., 'backrankmate')
 * @returns {string} Display name (e.g., 'Back Rank Mate')
 */
export function formatThemeName(themeId) {
  if (!themeId) return 'Mixed Themes';

  const lower = themeId.toLowerCase();
  if (SPECIAL_THEME_NAMES[lower]) return SPECIAL_THEME_NAMES[lower];

  return themeId
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Process raw puzzle data from the API into the client-side puzzle format
 * @param {object[]} puzzleData - Raw puzzles from apiClient.generatePuzzles()
 * @param {string|null} selectedTheme - The theme filter used for generation
 * @returns {object[]} Processed puzzles with enriched metadata
 */
export function processPuzzles(puzzleData, selectedTheme) {
  return puzzleData.map((puzzle, i) => {
    const chess = new Chess(puzzle.fen);
    const sideInPosition = chess.turn();
    const puzzleTheme = selectedTheme || (puzzle.themes && puzzle.themes[0]) || null;

    return {
      id: puzzle.id || `puzzle_${Date.now()}_${i}`,
      fen: puzzle.fen,
      fenAfterOpponent: puzzle.fenAfterOpponent || puzzle.fen,
      theme: puzzleTheme,
      themeName: formatThemeName(puzzleTheme),
      opponentMove: puzzle.opponentMoveSAN,
      solution: puzzle.solutionSAN || puzzle.solution,
      solutionLine: puzzle.solutionLine || [],
      evaluation: {
        isMate: true,
        mateIn: puzzle.mateIn,
        bestMove: puzzle.solution
      },
      sideToMove: sideInPosition === 'w' ? 'White' : 'Black',
      sideToFind: sideInPosition === 'w' ? 'Black' : 'White',
      mateIn: puzzle.mateIn,
      rating: puzzle.rating,
      popularity: puzzle.popularity
    };
  });
}

/**
 * Populate a <select> element with grouped theme options from the API
 * @param {HTMLSelectElement} selectEl - Target select element
 * @param {ApiClient} apiClient - API client for fetching stats
 */
export async function populateThemeSelect(selectEl, apiClient) {
  try {
    const stats = await apiClient.getStats();
    const themeCounts = new Map(stats.themes.map(t => [t.theme, t.count]));

    selectEl.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = `All Themes (${stats.totalPuzzles.toLocaleString()} puzzles)`;
    selectEl.appendChild(allOption);

    const availableThemes = stats.themes.map(t => t.theme);

    Object.entries(THEME_CATEGORIES).forEach(([category, themeIds]) => {
      const availableInCategory = themeIds.filter(id => availableThemes.includes(id));

      if (availableInCategory.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;

        const sortedThemes = [...availableInCategory].sort((a, b) => {
          const countA = themeCounts.get(a) || 0;
          const countB = themeCounts.get(b) || 0;
          return countB - countA;
        });

        sortedThemes.forEach(theme => {
          const option = document.createElement('option');
          option.value = theme;
          const count = themeCounts.get(theme) || 0;
          option.textContent = `${formatThemeName(theme)} (${count.toLocaleString()})`;
          optgroup.appendChild(option);
        });

        selectEl.appendChild(optgroup);
      }
    });

    const categorizedThemes = new Set(Object.values(THEME_CATEGORIES).flat());
    const otherThemes = availableThemes.filter(t => !categorizedThemes.has(t));

    if (otherThemes.length > 0) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = 'Other Themes';

      [...otherThemes].sort((a, b) => {
        const countA = themeCounts.get(a) || 0;
        const countB = themeCounts.get(b) || 0;
        return countB - countA;
      }).forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        const count = themeCounts.get(theme) || 0;
        option.textContent = `${formatThemeName(theme)} (${count.toLocaleString()})`;
        optgroup.appendChild(option);
      });

      selectEl.appendChild(optgroup);
    }
  } catch (error) {
    selectEl.innerHTML = '<option value="">Failed to load themes</option>';
  }
}

/**
 * Get theme data formatted for the multi-select component
 * @param {ApiClient} apiClient
 * @returns {Promise<Array<{theme: string, count: number, category: string, label: string}>>}
 */
export async function getThemeDataForMultiSelect(apiClient) {
  const stats = await apiClient.getStats();
  const themeCounts = new Map(stats.themes.map(t => [t.theme, t.count]));
  const availableThemes = new Set(stats.themes.map(t => t.theme));
  const result = [];

  Object.entries(THEME_CATEGORIES).forEach(([category, themeIds]) => {
    themeIds.forEach(id => {
      if (availableThemes.has(id)) {
        result.push({ theme: id, count: themeCounts.get(id) || 0, category, label: formatThemeName(id) });
      }
    });
  });

  const categorized = new Set(Object.values(THEME_CATEGORIES).flat());
  stats.themes.forEach(t => {
    if (!categorized.has(t.theme)) {
      result.push({ theme: t.theme, count: t.count, category: 'Other Themes', label: formatThemeName(t.theme) });
    }
  });

  return result;
}

/**
 * Build API parameters from form values
 * @param {string|string[]|null} themes - Theme ID(s) or null for all
 * @param {string} ratingRange - Rating range string like "1500-2000" or ""
 * @param {number} count - Number of puzzles
 * @returns {object} Parameters for apiClient.generatePuzzles()
 */
export function buildGenerateParams(themes, ratingRange, count) {
  let minRating = 1000;
  let maxRating = 3000;
  if (ratingRange) {
    const [min, max] = ratingRange.split('-').map(Number);
    minRating = min;
    maxRating = max || 3000;
  }
  // Support both single theme (string) and multiple themes (array)
  let themeValue = null;
  if (Array.isArray(themes)) {
    themeValue = themes.length > 0 ? themes.join(',') : null;
  } else if (themes) {
    themeValue = themes;
  }
  return { theme: themeValue, count, minRating, maxRating, minPopularity: 80 };
}
