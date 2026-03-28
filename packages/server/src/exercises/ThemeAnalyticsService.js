/**
 * ThemeAnalyticsService.js
 * Computes per-theme accuracy by cross-referencing puzzle results with puzzle themes.
 */

import { database } from '../database/SqliteDatabase.js'

const THEME_LABELS = {
  backrankmate: 'Back Rank Mate', smotheredmate: 'Smothered Mate', arabianmate: 'Arabian Mate',
  anastasiasmate: "Anastasia's Mate", doublebishopmate: 'Double Bishop Mate', bodenmate: "Boden's Mate",
  dovetailmate: 'Dovetail Mate', hookmate: 'Hook Mate', matein1: 'Mate in 1', matein2: 'Mate in 2',
  matein3: 'Mate in 3', fork: 'Fork', pin: 'Pin', skewer: 'Skewer',
  discoveredattack: 'Discovered Attack', deflection: 'Deflection', attraction: 'Attraction',
  sacrifice: 'Sacrifice', hangingpiece: 'Hanging Piece', capturingdefender: 'Capturing Defender',
  trappedpiece: 'Trapped Piece', xrayattack: 'X-Ray Attack', intermezzo: 'Intermezzo',
  zugzwang: 'Zugzwang', quietmove: 'Quiet Move', defensivemove: 'Defensive Move',
  exposedking: 'Exposed King', kingsideattack: 'Kingside Attack', queensideattack: 'Queenside Attack',
  promotion: 'Promotion', underpromotion: 'Underpromotion', enpassant: 'En Passant',
  endgame: 'Endgame', middlegame: 'Middlegame', opening: 'Opening',
  queenendgame: 'Queen Endgame', rookendgame: 'Rook Endgame', bishopendgame: 'Bishop Endgame',
  knightendgame: 'Knight Endgame', pawnendgame: 'Pawn Endgame', advancedpawn: 'Advanced Pawn'
}

function formatLabel(theme) {
  if (THEME_LABELS[theme]) return THEME_LABELS[theme]
  return theme.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()
}

// Skip generic/meta themes that don't represent tactical concepts
const SKIP_THEMES = new Set([
  'short', 'long', 'verylong', 'onemove', 'crushing', 'advantage', 'mate', 'master', 'brilliant'
])

export class ThemeAnalyticsService {
  /**
   * Get per-theme accuracy for a student across all graded exercises.
   * @param {string} studentId
   * @returns {{ summary, themes[] }}
   */
  getStudentThemeAnalytics(studentId) {
    // Fetch all graded assignments for this student (include those without puzzle_results for summary stats)
    const assignments = database.query(
      `SELECT se.puzzle_results, se.score, se.total_puzzles, we.puzzle_ids
       FROM student_exercises se
       JOIN weekly_exercises we ON se.exercise_id = we.id
       WHERE se.student_id = ? AND se.status = 'graded'`,
      [studentId]
    )

    if (assignments.length === 0) {
      return { summary: { total_exercises: 0, average_score: null, strongest: null, weakest: null }, themes: [] }
    }

    // Only assignments with puzzle_results can contribute to theme breakdown
    const withResults = assignments.filter(a => a.puzzle_results)

    // Collect all puzzle IDs from assignments with results
    const allPuzzleIds = new Set()
    for (const a of withResults) {
      a.puzzle_ids.split(',').forEach(id => allPuzzleIds.add(id.trim()))
    }

    // Batch fetch puzzle themes
    const puzzleThemes = this._getPuzzleThemes([...allPuzzleIds])

    // Accumulate per-theme stats (only from assignments with puzzle_results)
    const themeStats = new Map()

    for (const a of withResults) {
      const puzzleIds = a.puzzle_ids.split(',').map(id => id.trim())
      const results = a.puzzle_results.split(',').map(r => r.trim())

      for (let i = 0; i < puzzleIds.length && i < results.length; i++) {
        const result = results[i]
        if (result !== '1' && result !== '0') continue // skip ungraded

        const themes = puzzleThemes.get(puzzleIds[i])
        if (!themes) continue

        const correct = result === '1'
        for (const theme of themes) {
          if (SKIP_THEMES.has(theme)) continue

          if (!themeStats.has(theme)) {
            themeStats.set(theme, { attempted: 0, correct: 0 })
          }
          const stat = themeStats.get(theme)
          stat.attempted++
          if (correct) stat.correct++
        }
      }
    }

    // Build sorted result (weakest first)
    const themes = [...themeStats.entries()]
      .map(([theme, stat]) => ({
        theme,
        label: formatLabel(theme),
        attempted: stat.attempted,
        correct: stat.correct,
        accuracy: Math.round((stat.correct / stat.attempted) * 100)
      }))
      .sort((a, b) => a.accuracy - b.accuracy)

    // Summary
    const totalScore = assignments.reduce((sum, a) => sum + (a.score || 0), 0)
    const totalPuzzles = assignments.reduce((sum, a) => sum + (a.total_puzzles || 0), 0)

    return {
      summary: {
        total_exercises: assignments.length,
        average_score: totalPuzzles > 0 ? Math.round((totalScore / totalPuzzles) * 100) : null,
        strongest: themes.length > 0 ? { theme: themes[themes.length - 1].label, accuracy: themes[themes.length - 1].accuracy } : null,
        weakest: themes.length > 0 ? { theme: themes[0].label, accuracy: themes[0].accuracy } : null
      },
      themes
    }
  }

  /**
   * Batch fetch themes for puzzle IDs
   * @param {string[]} puzzleIds
   * @returns {Map<string, string[]>}
   */
  _getPuzzleThemes(puzzleIds) {
    const result = new Map()
    if (puzzleIds.length === 0) return result

    // Query in batches of 500
    for (let i = 0; i < puzzleIds.length; i += 500) {
      const batch = puzzleIds.slice(i, i + 500)
      const placeholders = batch.map(() => '?').join(',')
      const rows = database.query(
        `SELECT id, themes FROM puzzles WHERE id IN (${placeholders})`,
        batch
      )
      for (const row of rows) {
        const themes = (row.themes || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
        result.set(row.id, themes)
      }
    }

    return result
  }
}

export const themeAnalyticsService = new ThemeAnalyticsService()
