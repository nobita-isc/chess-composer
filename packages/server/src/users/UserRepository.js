/**
 * UserRepository.js
 * Data access layer for user management
 */

import { database } from '../database/SqliteDatabase.js';

export class UserRepository {
  generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `user_${timestamp}_${random}`;
  }

  create({ username, password_hash, role, student_id = null }) {
    try {
      const id = this.generateId();
      const now = new Date().toISOString();

      database.run(
        `INSERT INTO users (id, username, password_hash, role, student_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, username, password_hash, role, student_id, now, now]
      );

      return {
        success: true,
        data: { id, username, role, student_id, created_at: now, updated_at: now }
      };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed: users.username')) {
        return { success: false, error: 'Username already exists' };
      }
      if (error.message.includes('UNIQUE constraint failed: users.student_id')) {
        return { success: false, error: 'This student already has an account' };
      }
      return { success: false, error: error.message };
    }
  }

  findByUsername(username) {
    return database.queryOne(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
  }

  findById(id) {
    return database.queryOne(
      'SELECT id, username, role, student_id, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
  }

  findByStudentId(studentId) {
    return database.queryOne(
      'SELECT id, username, role, student_id, created_at, updated_at FROM users WHERE student_id = ?',
      [studentId]
    );
  }

  findAll() {
    return database.query(
      `SELECT u.id, u.username, u.role, u.student_id, u.created_at, u.updated_at,
              s.name as student_name
       FROM users u
       LEFT JOIN students s ON u.student_id = s.id
       ORDER BY u.created_at ASC`
    );
  }

  update(id, data) {
    try {
      const existing = database.queryOne('SELECT * FROM users WHERE id = ?', [id]);
      if (!existing) {
        return { success: false, error: 'User not found' };
      }

      const now = new Date().toISOString();
      const updated = {
        username: data.username ?? existing.username,
        role: data.role ?? existing.role,
        student_id: data.student_id !== undefined ? data.student_id : existing.student_id,
        updated_at: now
      };

      if (data.password_hash) {
        database.run(
          `UPDATE users SET username = ?, password_hash = ?, role = ?, student_id = ?, updated_at = ? WHERE id = ?`,
          [updated.username, data.password_hash, updated.role, updated.student_id, updated.updated_at, id]
        );
      } else {
        database.run(
          `UPDATE users SET username = ?, role = ?, student_id = ?, updated_at = ? WHERE id = ?`,
          [updated.username, updated.role, updated.student_id, updated.updated_at, id]
        );
      }

      return {
        success: true,
        data: { id, ...updated }
      };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed: users.username')) {
        return { success: false, error: 'Username already exists' };
      }
      if (error.message.includes('UNIQUE constraint failed: users.student_id')) {
        return { success: false, error: 'This student already has an account' };
      }
      return { success: false, error: error.message };
    }
  }

  delete(id) {
    try {
      const result = database.run('DELETE FROM users WHERE id = ?', [id]);

      if (result.changes === 0) {
        return { success: false, error: 'User not found' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  count() {
    return database.queryScalar('SELECT COUNT(*) FROM users') || 0;
  }

  countByRole(role) {
    return database.queryScalar('SELECT COUNT(*) FROM users WHERE role = ?', [role]) || 0;
  }
}

export const userRepository = new UserRepository();
