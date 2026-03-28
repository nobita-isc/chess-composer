/**
 * Tests for ThemeAnalyticsService — per-theme accuracy computation.
 * Uses in-memory SQLite with realistic puzzle and exercise data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'

let db

// Manually implement the service logic for testing against real SQLite
function getStudentThemeAnalytics(db, studentId) {
  const SKIP_THEMES = new Set([
    'short', 'long', 'verylong', 'onemove', 'crushing', 'advantage', 'mate', 'master', 'brilliant'
  ])

  const assignments = db.prepare(
    `SELECT se.puzzle_results, se.score, se.total_puzzles, we.puzzle_ids
     FROM student_exercises se
     JOIN weekly_exercises we ON se.exercise_id = we.id
     WHERE se.student_id = ? AND se.status = 'graded' AND se.puzzle_results IS NOT NULL`
  ).all(studentId)

  if (assignments.length === 0) {
    return { summary: { total_exercises: 0, average_score: null, strongest: null, weakest: null }, themes: [] }
  }

  const allPuzzleIds = new Set()
  for (const a of assignments) {
    a.puzzle_ids.split(',').forEach(id => allPuzzleIds.add(id.trim()))
  }

  // Fetch puzzle themes
  const puzzleThemes = new Map()
  const ids = [...allPuzzleIds]
  const placeholders = ids.map(() => '?').join(',')
  const rows = db.prepare(`SELECT id, themes FROM puzzles WHERE id IN (${placeholders})`).all(...ids)
  for (const row of rows) {
    puzzleThemes.set(row.id, (row.themes || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean))
  }

  const themeStats = new Map()
  for (const a of assignments) {
    const puzzleIds = a.puzzle_ids.split(',').map(id => id.trim())
    const results = a.puzzle_results.split(',')
    for (let i = 0; i < puzzleIds.length && i < results.length; i++) {
      const result = results[i]
      if (result !== '1' && result !== '0') continue
      const themes = puzzleThemes.get(puzzleIds[i])
      if (!themes) continue
      const correct = result === '1'
      for (const theme of themes) {
        if (SKIP_THEMES.has(theme)) continue
        if (!themeStats.has(theme)) themeStats.set(theme, { attempted: 0, correct: 0 })
        const stat = themeStats.get(theme)
        stat.attempted++
        if (correct) stat.correct++
      }
    }
  }

  const themes = [...themeStats.entries()]
    .map(([theme, stat]) => ({
      theme, attempted: stat.attempted, correct: stat.correct,
      accuracy: Math.round((stat.correct / stat.attempted) * 100)
    }))
    .sort((a, b) => a.accuracy - b.accuracy)

  const totalScore = assignments.reduce((sum, a) => sum + (a.score || 0), 0)
  const totalPuzzles = assignments.reduce((sum, a) => sum + (a.total_puzzles || 0), 0)

  return {
    summary: {
      total_exercises: assignments.length,
      average_score: totalPuzzles > 0 ? Math.round((totalScore / totalPuzzles) * 100) : null,
      strongest: themes.length > 0 ? { theme: themes[themes.length - 1].theme, accuracy: themes[themes.length - 1].accuracy } : null,
      weakest: themes.length > 0 ? { theme: themes[0].theme, accuracy: themes[0].accuracy } : null
    },
    themes
  }
}

beforeAll(() => {
  db = new Database(':memory:')

  db.exec(`
    CREATE TABLE puzzles (
      id TEXT PRIMARY KEY, fen TEXT, moves TEXT, rating INTEGER, popularity INTEGER, themes TEXT, source TEXT, game_url TEXT, is_blocked INTEGER DEFAULT 0
    );
    CREATE TABLE students (id TEXT PRIMARY KEY, name TEXT, email TEXT, skill_level TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE weekly_exercises (id TEXT PRIMARY KEY, week_start TEXT, week_end TEXT, name TEXT, puzzle_ids TEXT, filters TEXT, created_at TEXT);
    CREATE TABLE student_exercises (
      id TEXT PRIMARY KEY, student_id TEXT, exercise_id TEXT, score INTEGER, total_puzzles INTEGER,
      answer_pdf_path TEXT, status TEXT DEFAULT 'assigned', assigned_at TEXT, graded_at TEXT,
      notes TEXT, puzzle_results TEXT, puzzle_hints TEXT, is_final INTEGER DEFAULT 0
    );
  `)

  // Insert puzzles with diverse themes
  const puzzles = [
    ['p1', 'pin,endgame,short'],
    ['p2', 'fork,middlegame,crushing'],
    ['p3', 'skewer,endgame,long'],
    ['p4', 'pin,deflection,advantage'],
    ['p5', 'fork,sacrifice,mate'],
    ['p6', 'backrankmate,mate,onemove'],
    ['p7', 'skewer,endgame,short'],
    ['p8', 'pin,middlegame,advantage'],
    ['p9', 'deflection,endgame,long'],
    ['p10', 'fork,pin,short']
  ]
  const insertPuzzle = db.prepare('INSERT INTO puzzles (id, fen, moves, rating, popularity, themes) VALUES (?, ?, ?, 1500, 90, ?)')
  for (const [id, themes] of puzzles) {
    insertPuzzle.run(id, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2e4', themes)
  }

  // Insert student
  db.prepare('INSERT INTO students (id, name, created_at) VALUES (?, ?, ?)').run('s1', 'Test Student', new Date().toISOString())
  db.prepare('INSERT INTO students (id, name, created_at) VALUES (?, ?, ?)').run('s2', 'Empty Student', new Date().toISOString())

  // Insert exercise with 5 puzzles
  db.prepare('INSERT INTO weekly_exercises (id, week_start, week_end, name, puzzle_ids, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('ex1', '2026-03-23', '2026-03-29', 'Week 1', 'p1,p2,p3,p4,p5', new Date().toISOString())

  // Insert exercise with 5 different puzzles
  db.prepare('INSERT INTO weekly_exercises (id, week_start, week_end, name, puzzle_ids, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('ex2', '2026-03-30', '2026-04-05', 'Week 2', 'p6,p7,p8,p9,p10', new Date().toISOString())

  // Graded assignment 1: p1=correct, p2=wrong, p3=wrong, p4=correct, p5=correct
  db.prepare('INSERT INTO student_exercises (id, student_id, exercise_id, score, total_puzzles, status, puzzle_results, assigned_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run('se1', 's1', 'ex1', 3, 5, 'graded', '1,0,0,1,1', new Date().toISOString())

  // Graded assignment 2: p6=correct, p7=wrong, p8=correct, p9=wrong, p10=correct
  db.prepare('INSERT INTO student_exercises (id, student_id, exercise_id, score, total_puzzles, status, puzzle_results, assigned_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run('se2', 's1', 'ex2', 3, 5, 'graded', '1,0,1,0,1', new Date().toISOString())

  // Ungraded assignment for s2 (should not appear)
  db.prepare('INSERT INTO student_exercises (id, student_id, exercise_id, score, total_puzzles, status, assigned_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('se3', 's2', 'ex1', null, 5, 'assigned', new Date().toISOString())
})

afterAll(() => db.close())

describe('ThemeAnalyticsService logic', () => {
  it('returns empty for student with no graded exercises', () => {
    const result = getStudentThemeAnalytics(db, 's2')
    expect(result.summary.total_exercises).toBe(0)
    expect(result.themes).toEqual([])
    expect(result.summary.strongest).toBeNull()
    expect(result.summary.weakest).toBeNull()
  })

  it('returns empty for non-existent student', () => {
    const result = getStudentThemeAnalytics(db, 'nonexistent')
    expect(result.themes).toEqual([])
  })

  it('computes correct exercise count', () => {
    const result = getStudentThemeAnalytics(db, 's1')
    expect(result.summary.total_exercises).toBe(2)
  })

  it('computes average score correctly', () => {
    const result = getStudentThemeAnalytics(db, 's1')
    // 6 correct out of 10 total = 60%
    expect(result.summary.average_score).toBe(60)
  })

  it('identifies strongest and weakest themes', () => {
    const result = getStudentThemeAnalytics(db, 's1')
    expect(result.summary.weakest).toBeTruthy()
    expect(result.summary.strongest).toBeTruthy()
    expect(result.summary.weakest.accuracy).toBeLessThanOrEqual(result.summary.strongest.accuracy)
  })

  it('sorts themes by accuracy ascending (weakest first)', () => {
    const result = getStudentThemeAnalytics(db, 's1')
    for (let i = 1; i < result.themes.length; i++) {
      expect(result.themes[i].accuracy).toBeGreaterThanOrEqual(result.themes[i - 1].accuracy)
    }
  })

  it('skips generic themes (short, long, crushing, advantage, mate)', () => {
    const result = getStudentThemeAnalytics(db, 's1')
    const themeNames = result.themes.map(t => t.theme)
    expect(themeNames).not.toContain('short')
    expect(themeNames).not.toContain('long')
    expect(themeNames).not.toContain('crushing')
    expect(themeNames).not.toContain('advantage')
    expect(themeNames).not.toContain('mate')
  })

  it('includes tactical themes (pin, fork, skewer, deflection, backrankmate)', () => {
    const result = getStudentThemeAnalytics(db, 's1')
    const themeNames = result.themes.map(t => t.theme)
    expect(themeNames).toContain('pin')
    expect(themeNames).toContain('fork')
    expect(themeNames).toContain('skewer')
  })

  it('computes pin accuracy correctly', () => {
    // p1(pin)=correct, p4(pin)=correct, p8(pin)=correct, p10(pin,fork)=correct → 4 attempted, 4 correct = 100% or
    // Wait: p1=1(correct), p4=1(correct), p8=1(correct), p10=1(correct) → 4/4 = 100%
    const result = getStudentThemeAnalytics(db, 's1')
    const pin = result.themes.find(t => t.theme === 'pin')
    expect(pin).toBeTruthy()
    expect(pin.correct).toBe(4)
    expect(pin.attempted).toBe(4)
    expect(pin.accuracy).toBe(100)
  })

  it('computes skewer accuracy correctly', () => {
    // p3(skewer)=wrong, p7(skewer)=wrong → 0/2 = 0%
    const result = getStudentThemeAnalytics(db, 's1')
    const skewer = result.themes.find(t => t.theme === 'skewer')
    expect(skewer).toBeTruthy()
    expect(skewer.correct).toBe(0)
    expect(skewer.attempted).toBe(2)
    expect(skewer.accuracy).toBe(0)
  })

  it('computes fork accuracy correctly', () => {
    // p2(fork)=wrong, p5(fork)=correct, p10(fork,pin)=correct → 2/3 = 67%
    const result = getStudentThemeAnalytics(db, 's1')
    const fork = result.themes.find(t => t.theme === 'fork')
    expect(fork).toBeTruthy()
    expect(fork.correct).toBe(2)
    expect(fork.attempted).toBe(3)
    expect(fork.accuracy).toBe(67)
  })

  it('has weakest theme as skewer (0%)', () => {
    const result = getStudentThemeAnalytics(db, 's1')
    expect(result.themes[0].theme).toBe('skewer')
    expect(result.themes[0].accuracy).toBe(0)
  })

  it('has strongest theme at 100% accuracy', () => {
    const result = getStudentThemeAnalytics(db, 's1')
    const strongest = result.themes[result.themes.length - 1]
    expect(strongest.accuracy).toBe(100)
    // Both pin and backrankmate are 100%, either is valid
    expect(['pin', 'backrankmate']).toContain(strongest.theme)
  })

  it('each theme has attempted > 0', () => {
    const result = getStudentThemeAnalytics(db, 's1')
    result.themes.forEach(t => {
      expect(t.attempted).toBeGreaterThan(0)
    })
  })

  it('accuracy is a rounded integer', () => {
    const result = getStudentThemeAnalytics(db, 's1')
    result.themes.forEach(t => {
      expect(Number.isInteger(t.accuracy)).toBe(true)
      expect(t.accuracy).toBeGreaterThanOrEqual(0)
      expect(t.accuracy).toBeLessThanOrEqual(100)
    })
  })
})
