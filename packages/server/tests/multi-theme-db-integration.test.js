/**
 * Integration tests for multi-theme puzzle generation against the actual SQLite database.
 * Verifies that multi-theme selection produces puzzles from ALL selected themes.
 *
 * NOTE: Requires packages/server/data/puzzles.db to exist.
 * Skipped automatically if DB is missing.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../data/puzzles.db')

// Skip entire suite if DB doesn't exist
const dbExists = fs.existsSync(dbPath)

describe.skipIf(!dbExists)('Multi-theme DB integration', () => {
  let databaseGenerator

  beforeAll(async () => {
    const mod = await import('../src/database/DatabaseGenerator.js')
    databaseGenerator = mod.databaseGenerator
    databaseGenerator.initialize()
  })

  it('single theme returns puzzles with that theme', () => {
    const puzzles = databaseGenerator.generatePuzzles('pin', 10)
    expect(puzzles.length).toBe(10)

    const withPin = puzzles.filter(p =>
      p.themes.some(t => t.toLowerCase() === 'pin')
    )
    expect(withPin.length).toBe(10)
  })

  it('two themes returns puzzles from BOTH themes', () => {
    const puzzles = databaseGenerator.generatePuzzles('pin,fork', 10)
    expect(puzzles.length).toBe(10)

    const withPin = puzzles.filter(p =>
      p.themes.some(t => t.toLowerCase() === 'pin')
    )
    const withFork = puzzles.filter(p =>
      p.themes.some(t => t.toLowerCase() === 'fork')
    )

    // Each theme should have at least 3 puzzles (5 each, minus dedup)
    expect(withPin.length).toBeGreaterThanOrEqual(3)
    expect(withFork.length).toBeGreaterThanOrEqual(3)
    // Combined should cover all puzzles (each puzzle has at least one)
    expect(withPin.length + withFork.length).toBeGreaterThanOrEqual(10)
  })

  it('three themes distributes across all three', () => {
    const puzzles = databaseGenerator.generatePuzzles('pin,fork,skewer', 12)
    expect(puzzles.length).toBe(12)

    const withPin = puzzles.filter(p => p.themes.some(t => t.toLowerCase() === 'pin'))
    const withFork = puzzles.filter(p => p.themes.some(t => t.toLowerCase() === 'fork'))
    const withSkewer = puzzles.filter(p => p.themes.some(t => t.toLowerCase() === 'skewer'))

    // Each theme should have at least 2 (4 each targeted, minus dedup)
    expect(withPin.length).toBeGreaterThanOrEqual(2)
    expect(withFork.length).toBeGreaterThanOrEqual(2)
    expect(withSkewer.length).toBeGreaterThanOrEqual(2)
  })

  it('multi-theme produces unique puzzle IDs (no duplicates)', () => {
    const puzzles = databaseGenerator.generatePuzzles('pin,fork', 10)
    const ids = puzzles.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('single theme with no theme returns mixed puzzles', () => {
    const puzzles = databaseGenerator.generatePuzzles(null, 10)
    expect(puzzles.length).toBe(10)

    // Should have varied themes
    const allThemes = new Set()
    puzzles.forEach(p => p.themes.forEach(t => allThemes.add(t)))
    expect(allThemes.size).toBeGreaterThan(3)
  })

  it('multi-theme respects rating range', () => {
    const puzzles = databaseGenerator.generatePuzzles('pin,fork', 10, {
      minRating: 1500,
      maxRating: 2000,
      minPopularity: 80
    })

    expect(puzzles.length).toBeGreaterThan(0)
    puzzles.forEach(p => {
      expect(p.rating).toBeGreaterThanOrEqual(1500)
      expect(p.rating).toBeLessThanOrEqual(2000)
    })
  })

  it('multi-theme with checkmate patterns works', () => {
    const puzzles = databaseGenerator.generatePuzzles('backrankmate,smotheredmate', 6)
    expect(puzzles.length).toBeGreaterThanOrEqual(1)

    const hasBackrank = puzzles.some(p => p.themes.some(t => t.includes('backrank')))
    const hasSmothered = puzzles.some(p => p.themes.some(t => t.includes('smother')))
    // At least one of the requested themes should appear
    expect(hasBackrank || hasSmothered).toBe(true)
  })
})
