/**
 * Migration 006: Add is_final column to student_exercises
 * When is_final = 1, students can no longer solve/modify the exercise.
 * Portable: SQLite + Postgres. Uses addColumnIfNotExists to avoid TX poisoning on PG.
 */

import { addColumnIfNotExists } from '../migration-helpers.js';

export async function migrate(db) {
  const added = await addColumnIfNotExists(db, 'student_exercises', 'is_final', 'INTEGER DEFAULT 0');
  console.log(added ? '   Added is_final column' : '   is_final column already exists');
}

export async function rollback(db) {
  // DROP COLUMN not universally safe; leave in place
}
