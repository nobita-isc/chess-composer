/**
 * ExerciseRepository.js
 * Data access layer for weekly exercises and student assignments
 */

import { database } from '../database/SqliteDatabase.js';

export class ExerciseRepository {
  generateExerciseId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `exercise_${timestamp}_${random}`;
  }

  generateStudentExerciseId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `se_${timestamp}_${random}`;
  }

  // ==================== Weekly Exercises ====================

  async createExercise(data) {
    try {
      const id = this.generateExerciseId();
      const now = new Date().toISOString();

      await database.run(
        `INSERT INTO weekly_exercises (id, week_start, week_end, name, puzzle_ids, filters, avg_rating, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.week_start,
          data.week_end,
          data.name || null,
          data.puzzle_ids,
          data.filters ? JSON.stringify(data.filters) : null,
          data.avg_rating || null,
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
          avg_rating: data.avg_rating || null,
          created_at: now
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async findAllExercises({ limit = 50, offset = 0 } = {}) {
    return database.query(
      `SELECT * FROM weekly_exercises
       ORDER BY week_start DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }

  async findExerciseById(id) {
    return database.queryOne('SELECT * FROM weekly_exercises WHERE id = ?', [id]);
  }

  async findExercisesByWeek(weekStart) {
    return database.query(
      'SELECT * FROM weekly_exercises WHERE week_start = ?',
      [weekStart]
    );
  }

  async updateExerciseName(id, name) {
    const result = await database.run(
      'UPDATE weekly_exercises SET name = ? WHERE id = ?',
      [name, id]
    );
    if (result.changes === 0) {
      return { success: false, error: 'Exercise not found' };
    }
    return { success: true };
  }

  async deleteExercise(id) {
    try {
      const result = await database.run(
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

  async assignExercise(data) {
    try {
      const id = this.generateStudentExerciseId();
      const now = new Date().toISOString();

      await database.run(
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

  async findStudentExercises(studentId) {
    return database.query(
      `SELECT se.*, we.week_start, we.week_end, we.name as exercise_name
       FROM student_exercises se
       JOIN weekly_exercises we ON se.exercise_id = we.id
       WHERE se.student_id = ?
       ORDER BY we.week_start DESC`,
      [studentId]
    );
  }

  async findExerciseAssignments(exerciseId) {
    return database.query(
      `SELECT se.*, s.name as student_name, s.skill_level
       FROM student_exercises se
       JOIN students s ON se.student_id = s.id
       WHERE se.exercise_id = ?
       ORDER BY s.name ASC`,
      [exerciseId]
    );
  }

  async findStudentExerciseById(id) {
    return database.queryOne(
      `SELECT se.*, s.name as student_name, we.week_start, we.week_end
       FROM student_exercises se
       JOIN students s ON se.student_id = s.id
       JOIN weekly_exercises we ON se.exercise_id = we.id
       WHERE se.id = ?`,
      [id]
    );
  }

  async updateStudentExercise(id, data) {
    try {
      const existing = await this.findStudentExerciseById(id);
      if (!existing) {
        return { success: false, error: 'Assignment not found' };
      }

      const updates = [];
      const params = [];

      if (data.score !== undefined) { updates.push('score = ?'); params.push(data.score); }
      if (data.answer_pdf_path !== undefined) { updates.push('answer_pdf_path = ?'); params.push(data.answer_pdf_path); }
      if (data.status !== undefined) { updates.push('status = ?'); params.push(data.status); }
      if (data.notes !== undefined) { updates.push('notes = ?'); params.push(data.notes); }
      if (data.puzzle_results !== undefined) { updates.push('puzzle_results = ?'); params.push(data.puzzle_results); }
      if (data.puzzle_hints !== undefined) { updates.push('puzzle_hints = ?'); params.push(data.puzzle_hints); }
      if (data.is_final !== undefined) { updates.push('is_final = ?'); params.push(data.is_final); }
      if (data.status === 'graded') { updates.push('graded_at = ?'); params.push(new Date().toISOString()); }

      if (updates.length === 0) {
        return { success: true, data: existing };
      }

      params.push(id);
      await database.run(
        `UPDATE student_exercises SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return {
        success: true,
        data: await this.findStudentExerciseById(id)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getStudentPerformance(studentId) {
    const exercises = await database.query(
      `SELECT se.score, se.total_puzzles, se.status, we.week_start, we.avg_rating, we.name as exercise_name
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
        avg_rating: null,
        total_puzzles_solved: 0,
        total_puzzles: 0,
        history: []
      };
    }

    const totalScore = exercises.reduce((sum, e) => sum + (e.score || 0), 0);
    const totalPuzzles = exercises.reduce((sum, e) => sum + (e.total_puzzles || 0), 0);

    const exercisesWithRating = exercises.filter(e => e.avg_rating != null);
    const overallAvgRating = exercisesWithRating.length > 0
      ? Math.round(exercisesWithRating.reduce((sum, e) => sum + e.avg_rating, 0) / exercisesWithRating.length)
      : null;

    return {
      total_exercises: exercises.length,
      average_score: totalPuzzles > 0 ? Math.round((totalScore / totalPuzzles) * 100) : null,
      avg_rating: overallAvgRating,
      total_puzzles_solved: totalScore,
      total_puzzles: totalPuzzles,
      history: exercises.map(e => ({
        week: e.week_start,
        exercise_name: e.exercise_name,
        score: e.score,
        total: e.total_puzzles,
        percentage: e.total_puzzles > 0 ? Math.round((e.score / e.total_puzzles) * 100) : 0,
        avg_rating: e.avg_rating || null
      }))
    };
  }

  async resetStudentExerciseScore(id) {
    try {
      const existing = await this.findStudentExerciseById(id);
      if (!existing) {
        return { success: false, error: 'Assignment not found' };
      }

      await database.run(
        `UPDATE student_exercises
         SET score = 0, puzzle_results = NULL, puzzle_hints = NULL, is_final = 0
         WHERE id = ?`,
        [id]
      );

      return {
        success: true,
        data: await this.findStudentExerciseById(id)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async isAlreadyAssigned(studentId, exerciseId) {
    const result = await database.queryOne(
      `SELECT id FROM student_exercises
       WHERE student_id = ? AND exercise_id = ?`,
      [studentId, exerciseId]
    );
    return result !== null;
  }
}

export const exerciseRepository = new ExerciseRepository();
