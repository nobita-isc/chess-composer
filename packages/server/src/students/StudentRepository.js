/**
 * StudentRepository.js
 * Data access layer for student management
 */

import { database } from '../database/SqliteDatabase.js';

export class StudentRepository {
  /**
   * Generate a unique student ID
   * @returns {string}
   */
  generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `student_${timestamp}_${random}`;
  }

  /**
   * Create a new student
   * @param {object} data - Student data
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  create(data) {
    try {
      const id = this.generateId();
      const now = new Date().toISOString();

      database.run(
        `INSERT INTO students (id, name, email, skill_level, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.name,
          data.email || null,
          data.skill_level || 'beginner',
          data.notes || null,
          now,
          now
        ]
      );

      return {
        success: true,
        data: {
          id,
          name: data.name,
          email: data.email || null,
          skill_level: data.skill_level || 'beginner',
          notes: data.notes || null,
          created_at: now,
          updated_at: now
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all students
   * @returns {object[]}
   */
  findAll() {
    return database.query(
      'SELECT * FROM students ORDER BY name ASC'
    );
  }

  /**
   * Get student by ID
   * @param {string} id - Student ID
   * @returns {object|null}
   */
  findById(id) {
    return database.queryOne(
      'SELECT * FROM students WHERE id = ?',
      [id]
    );
  }

  /**
   * Update a student
   * @param {string} id - Student ID
   * @param {object} data - Updated data
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  update(id, data) {
    try {
      const existing = this.findById(id);
      if (!existing) {
        return { success: false, error: 'Student not found' };
      }

      const now = new Date().toISOString();
      const updated = {
        name: data.name ?? existing.name,
        email: data.email ?? existing.email,
        skill_level: data.skill_level ?? existing.skill_level,
        notes: data.notes ?? existing.notes,
        updated_at: now
      };

      database.run(
        `UPDATE students
         SET name = ?, email = ?, skill_level = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [updated.name, updated.email, updated.skill_level, updated.notes, updated.updated_at, id]
      );

      return {
        success: true,
        data: { id, ...updated, created_at: existing.created_at }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a student
   * @param {string} id - Student ID
   * @returns {{ success: boolean, error?: string }}
   */
  delete(id) {
    try {
      const result = database.run(
        'DELETE FROM students WHERE id = ?',
        [id]
      );

      if (result.changes === 0) {
        return { success: false, error: 'Student not found' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get student count
   * @returns {number}
   */
  count() {
    return database.queryScalar('SELECT COUNT(*) FROM students') || 0;
  }
}

export const studentRepository = new StudentRepository();
