/**
 * Migration 004: Add users table for authentication
 * - users: User accounts with roles (admin/student)
 * - Default admin seeded on first run
 * Portable: SQLite + Postgres. Async API; uses db.queryOne + db.run instead of db.prepare.
 */

import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'SotaJapan@2026';

export async function migrate(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
      student_id TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
  await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id)`);

  await seedDefaultAdmin(db);
}

async function seedDefaultAdmin(db) {
  const existing = await db.queryOne('SELECT id FROM users WHERE username = ?', [DEFAULT_ADMIN_USERNAME]);
  if (existing) return;

  const passwordHash = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, BCRYPT_ROUNDS);
  const id = `user_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO users (id, username, password_hash, role, student_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, DEFAULT_ADMIN_USERNAME, passwordHash, 'admin', null, now, now]
  );
}

export async function rollback(db) {
  await db.exec('DROP TABLE IF EXISTS users');
}
