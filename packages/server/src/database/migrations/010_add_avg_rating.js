/**
 * Migration 010: Add avg_rating column to weekly_exercises
 * Stores the average puzzle rating so it doesn't need recalculating on every query.
 * Backfills existing exercises from their puzzle data.
 * Portable: SQLite + Postgres. Uses addColumnIfNotExists to avoid TX poisoning on PG.
 */

import { addColumnIfNotExists } from '../migration-helpers.js';

export async function migrate(db) {
  const columnAdded = await addColumnIfNotExists(db, 'weekly_exercises', 'avg_rating', 'INTEGER');
  console.log(columnAdded ? '   Added avg_rating column' : '   avg_rating column already exists');

  if (!columnAdded) return;

  // Backfill existing exercises
  const exercises = await db.query('SELECT id, puzzle_ids FROM weekly_exercises');

  for (const exercise of exercises) {
    const puzzleIds = exercise.puzzle_ids.split(',').filter(Boolean);
    if (puzzleIds.length === 0) continue;

    const placeholders = puzzleIds.map(() => '?').join(',');
    const puzzles = await db.query(
      `SELECT rating FROM puzzles WHERE id IN (${placeholders})`,
      puzzleIds
    );

    if (puzzles.length > 0) {
      const totalRating = puzzles.reduce((sum, p) => sum + (p.rating || 0), 0);
      const avgRating = Math.round(totalRating / puzzles.length);
      await db.run('UPDATE weekly_exercises SET avg_rating = ? WHERE id = ?', [avgRating, exercise.id]);
    }
  }
  console.log(`   Backfilled avg_rating for ${exercises.length} exercises`);
}

export async function rollback(db) {
  // DROP COLUMN not universally safe; leave in place
}
