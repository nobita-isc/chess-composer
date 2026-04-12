/**
 * Migration: Add description column to lesson_content
 * Stores markdown text for rich content descriptions (learning notes).
 */

export function migrate(db) {
  const tableInfo = db.prepare('PRAGMA table_info(lesson_content)').all()
  const hasColumn = tableInfo.some(col => col.name === 'description')

  if (!hasColumn) {
    db.exec('ALTER TABLE lesson_content ADD COLUMN description TEXT')
    console.log('   Added description column to lesson_content')
  } else {
    console.log('   description column already exists')
  }
}

export function rollback(db) {
  // SQLite doesn't support DROP COLUMN directly
}
