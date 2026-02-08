/**
 * ExerciseRepository.js
 * Data access layer for weekly exercises and student assignments
 */

import { database } from '../database/SqliteDatabase.js';

export class ExerciseRepository {
  /**
   * Generate a unique exercise ID
   * @returns {string}
   */
  generateExerciseId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `exercise_${timestamp}_${random}`;
  }

  /**
   * Generate a unique student exercise ID
   * @returns {string}
   */
  generateStudentExerciseId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `se_${timestamp}_${random}`;
  }

  // ==================== Weekly Exercises ====================

  /**
   * Create a new weekly exercise
   * @param {object} data - Exercise data
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  createExercise(data) {
    try {
      const id = this.generateExerciseId();
      const now = new Date().toISOString();

      database.run(
        `INSERT INTO weekly_exercises (id, week_start, week_end, name, puzzle_ids, filters, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.week_start,
          data.week_end,
          data.name || null,
          data.puzzle_ids,
          data.filters ? JSON.stringify(data.filters) : null,
          now
        ]
      );

      return {
        success: true,
        data: {
          id,
          week_start: data.week_start,
          week_end: data.week_end,
          name: data.name || null,
          puzzle_ids: data.puzzle_ids,
          filters: data.filters || null,
          created_at: now
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all weekly exercises
   * @param {object} options - { limit, offset }
   * @returns {object[]}
   */
  findAllExercises({ limit = 50, offset = 0 } = {}) {
    return database.query(
      `SELECT * FROM weekly_exercises
       ORDER BY week_start DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }

  /**
   * Get exercise by ID
   * @param {string} id - Exercise ID
   * @returns {object|null}
   */
  findExerciseById(id) {
    return database.queryOne(
      'SELECT * FROM weekly_exercises WHERE id = ?',
      [id]
    );
  }

  /**
   * Get exercise for a specific week
   * @param {string} weekStart - Week start date (YYYY-MM-DD)
   * @returns {object|null}
   */
  findExerciseByWeek(weekStart) {
    return database.queryOne(
      'SELECT * FROM weekly_exercises WHERE week_start = ?',
      [weekStart]
    );
  }

  /**
   * Delete an exercise
   * @param {string} id - Exercise ID
   * @returns {{ success: boolean, error?: string }}
   */
  deleteExercise(id) {
    try {
      const result = database.run(
        'DELETE FROM weekly_exercises WHERE id = ?',
        [id]
      );

      if (result.changes === 0) {
        return { success: false, error: 'Exercise not found' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== Student Exercises ====================

  /**
   * Assign an exercise to a student
   * @param {object} data - Assignment data
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  assignExercise(data) {
    try {
      const id = this.generateStudentExerciseId();
      const now = new Date().toISOString();

      database.run(
        `INSERT INTO student_exercises
         (id, student_id, exercise_id, total_puzzles, status, assigned_at)
         VALUES (?, ?, ?, ?, 'assigned', ?)`,
        [id, data.student_id, data.exercise_id, data.total_puzzles, now]
      );

      return {
        success: true,
        data: {
          id,
          student_id: data.student_id,
          exercise_id: data.exercise_id,
          total_puzzles: data.total_puzzles,
          status: 'assigned',
          assigned_at: now
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get student's exercise assignments
   * @param {string} studentId - Student ID
   * @returns {object[]}
   */
  findStudentExercises(studentId) {
    return database.query(
      `SELECT se.*, we.week_start, we.week_end, we.name as exercise_name
       FROM student_exercises se
       JOIN weekly_exercises we ON se.exercise_id = we.id
       WHERE se.student_id = ?
       ORDER BY we.week_start DESC`,
      [studentId]
    );
  }

  /**
   * Get all assignments for an exercise
   * @param {string} exerciseId - Exercise ID
   * @returns {object[]}
   */
  findExerciseAssignments(exerciseId) {
    return database.query(
      `SELECT se.*, s.name as student_name, s.skill_level
       FROM student_exercises se
       JOIN students s ON se.student_id = s.id
       WHERE se.exercise_id = ?
       ORDER BY s.name ASC`,
      [exerciseId]
    );
  }

  /**
   * Get student exercise by ID
   * @param {string} id - Student exercise ID
   * @returns {object|null}
   */
  findStudentExerciseById(id) {
    return database.queryOne(
      `SELECT se.*, s.name as student_name, we.week_start, we.week_end
       FROM student_exercises se
       JOIN students s ON se.student_id = s.id
       JOIN weekly_exercises we ON se.exercise_id = we.id
       WHERE se.id = ?`,
      [id]
    );
  }

  /**
   * Update student exercise (grade, upload PDF, etc.)
   * @param {string} id - Student exercise ID
   * @param {object} data - Update data
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  updateStudentExercise(id, data) {
    try {
      const existing = this.findStudentExerciseById(id);
      if (!existing) {
        return { success: false, error: 'Assignment not found' };
      }

      const updates = [];
      const params = [];

      if (data.score !== undefined) {
        updates.push('score = ?');
        params.push(data.score);
      }

      if (data.answer_pdf_path !== undefined) {
        updates.push('answer_pdf_path = ?');
        params.push(data.answer_pdf_path);
      }

      if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(data.status);
      }

      if (data.notes !== undefined) {
        updates.push('notes = ?');
        params.push(data.notes);
      }

      if (data.puzzle_results !== undefined) {
        updates.push('puzzle_results = ?');
        params.push(data.puzzle_results);
      }

      if (data.puzzle_hints !== undefined) {
        updates.push('puzzle_hints = ?');
        params.push(data.puzzle_hints);
      }

      if (data.is_final !== undefined) {
        updates.push('is_final = ?');
        params.push(data.is_final);
      }

      if (data.status === 'graded') {
        updates.push('graded_at = ?');
        params.push(new Date().toISOString());
      }

      if (updates.length === 0) {
        return { success: true, data: existing };
      }

      params.push(id);

      database.run(
        `UPDATE student_exercises SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return {
        success: true,
        data: this.findStudentExerciseById(id)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get student performance summary
   * @param {string} studentId - Student ID
   * @returns {object}
   */
  getStudentPerformance(studentId) {
    const exercises = database.query(
      `SELECT se.score, se.total_puzzles, se.status, we.week_start
       FROM student_exercises se
       JOIN weekly_exercises we ON se.exercise_id = we.id
       WHERE se.student_id = ? AND se.status = 'graded'
       ORDER BY we.week_start DESC`,
      [studentId]
    );

    if (exercises.length === 0) {
      return {
        total_exercises: 0,
        average_score: null,
        total_puzzles_solved: 0,
        total_puzzles: 0,
        history: []
      };
    }

    const totalScore = exercises.reduce((sum, e) => sum + (e.score || 0), 0);
    const totalPuzzles = exercises.reduce((sum, e) => sum + (e.total_puzzles || 0), 0);

    return {
      total_exercises: exercises.length,
      average_score: totalPuzzles > 0 ? Math.round((totalScore / totalPuzzles) * 100) : null,
      total_puzzles_solved: totalScore,
      total_puzzles: totalPuzzles,
      history: exercises.map(e => ({
        week: e.week_start,
        score: e.score,
        total: e.total_puzzles,
        percentage: e.total_puzzles > 0 ? Math.round((e.score / e.total_puzzles) * 100) : 0
      }))
    };
  }

  /**
   * Reset a student exercise score back to 0
   * Clears score, puzzle_results, puzzle_hints, and is_final. Preserves status.
   * @param {string} id - Student exercise ID
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  resetStudentExerciseScore(id) {
    try {
      const existing = this.findStudentExerciseById(id);
      if (!existing) {
        return { success: false, error: 'Assignment not found' };
      }

      database.run(
        `UPDATE student_exercises
         SET score = 0, puzzle_results = NULL, puzzle_hints = NULL, is_final = 0
         WHERE id = ?`,
        [id]
      );

      return {
        success: true,
        data: this.findStudentExerciseById(id)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if student is already assigned to exercise
   * @param {string} studentId - Student ID
   * @param {string} exerciseId - Exercise ID
   * @returns {boolean}
   */
  isAlreadyAssigned(studentId, exerciseId) {
    const result = database.queryOne(
      `SELECT id FROM student_exercises
       WHERE student_id = ? AND exercise_id = ?`,
      [studentId, exerciseId]
    );
    return result !== null;
  }
}

export const exerciseRepository = new ExerciseRepository();
