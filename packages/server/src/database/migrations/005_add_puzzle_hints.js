/**
 * Migration 005: Add puzzle_hints column to student_exercises
 * Stores per-puzzle hint usage as comma-separated values (1=used hint, 0=no hint)
 * Portable: SQLite + Postgres. Uses addColumnIfNotExists to avoid TX poisoning on PG.
 */

import { addColumnIfNotExists } from '../migration-helpers.js';

export async function migrate(db) {
  const added = await addColumnIfNotExists(db, 'student_exercises', 'puzzle_hints', 'TEXT');
  console.log(added ? '   Added puzzle_hints column' : '   puzzle_hints column already exists');
}

export async function rollback(db) {
  // DROP COLUMN not universally safe; leave in place
}
