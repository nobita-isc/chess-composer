/**
 * Migration 003: Add puzzle_results column to student_exercises
 * Stores per-puzzle grades as comma-separated values (1=correct, 0=wrong, empty=not graded)
 * Portable: SQLite + Postgres. Uses addColumnIfNotExists to avoid TX poisoning on PG.
 */

import { addColumnIfNotExists } from '../migration-helpers.js';

export async function migrate(db) {
  const added = await addColumnIfNotExists(db, 'student_exercises', 'puzzle_results', 'TEXT');
  console.log(added ? '   Added puzzle_results column' : '   puzzle_results column already exists');
}

export async function rollback(db) {
  // DROP COLUMN not universally safe across SQLite versions; leave in place
}
