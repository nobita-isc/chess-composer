/**
 * StudentRepository.js
 * Data access layer for student management
 */

import { database } from '../database/SqliteDatabase.js';

export class StudentRepository {
  generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `student_${timestamp}_${random}`;
  }

  async create(data) {
    try {
      const id = this.generateId();
      const now = new Date().toISOString();

      await database.run(
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

  async findAll() {
    return database.query('SELECT * FROM students ORDER BY name ASC');
  }

  async findById(id) {
    return database.queryOne('SELECT * FROM students WHERE id = ?', [id]);
  }

  async update(id, data) {
    try {
      const existing = await this.findById(id);
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

      await database.run(
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

  async delete(id) {
    try {
      const result = await database.run('DELETE FROM students WHERE id = ?', [id]);

      if (result.changes === 0) {
        return { success: false, error: 'Student not found' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async count() {
    return (await database.queryScalar('SELECT COUNT(*) FROM students')) || 0;
  }
}

export const studentRepository = new StudentRepository();
