/**
 * Migration 012: Add videos table for video library feature.
 * Stores uploaded video metadata; files live on disk under uploads/videos/.
 */

export async function migrate(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      file_path TEXT NOT NULL,
      file_size INTEGER,
      duration_seconds INTEGER,
      mime_type TEXT,
      folder TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_videos_folder ON videos(folder)`)
  console.log('   Created videos table + folder index')
}

export async function rollback(db) {
  await db.exec('DROP TABLE IF EXISTS videos')
}
