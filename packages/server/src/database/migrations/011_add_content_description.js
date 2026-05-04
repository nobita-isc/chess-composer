/**
 * Migration 011: Add description column to lesson_content
 * Stores markdown text for rich content descriptions (learning notes).
 * Portable: SQLite + Postgres. Uses addColumnIfNotExists to avoid TX poisoning on PG.
 */

import { addColumnIfNotExists } from '../migration-helpers.js';

export async function migrate(db) {
  const added = await addColumnIfNotExists(db, 'lesson_content', 'description', 'TEXT');
  console.log(added ? '   Added description column to lesson_content' : '   description column already exists');
}

export async function rollback(db) {
  // DROP COLUMN not universally safe; leave in place
}
