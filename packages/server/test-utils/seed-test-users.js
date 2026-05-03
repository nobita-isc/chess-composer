/**
 * seed-test-users.js
 * Ensures test admin + student users exist in the cloned e2e DB.
 * Uses INSERT OR IGNORE — idempotent, safe to call multiple times.
 * Opens its own better-sqlite3 connection; caller must pass the DB path.
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

export const TEST_ADMIN = {
  id: 'e2e_user_admin_001',
  username: 'e2e_admin',
  password: 'E2eAdmin@2026',
  role: 'admin',
  student_id: null,
};

export const TEST_STUDENT = {
  id: 'e2e_user_student_001',
  username: 'e2e_student',
  password: 'E2eStudent@2026',
  role: 'student',
  student_id: null, // no students row required for basic auth tests
};

/**
 * Insert test users into the cloned DB if they don't exist.
 * @param {string} dbPath - absolute path to puzzles-e2e.db
 * @returns {{ adminId: string, studentId: string }}
 */
export async function seedTestUsers(dbPath) {
  const db = new Database(dbPath, { readonly: false, fileMustExist: true });

  try {
    const now = new Date().toISOString();

    const insert = db.prepare(`
      INSERT OR IGNORE INTO users (id, username, password_hash, role, student_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Hash passwords
    const adminHash = bcrypt.hashSync(TEST_ADMIN.password, BCRYPT_ROUNDS);
    const studentHash = bcrypt.hashSync(TEST_STUDENT.password, BCRYPT_ROUNDS);

    insert.run(TEST_ADMIN.id, TEST_ADMIN.username, adminHash, TEST_ADMIN.role, TEST_ADMIN.student_id, now, now);
    insert.run(TEST_STUDENT.id, TEST_STUDENT.username, studentHash, TEST_STUDENT.role, TEST_STUDENT.student_id, now, now);
  } finally {
    db.close();
  }

  return { adminId: TEST_ADMIN.id, studentId: TEST_STUDENT.id };
}
