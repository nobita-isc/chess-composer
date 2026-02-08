/**
 * ExerciseService.js
 * Business logic for exercise management
 */

import { exerciseRepository } from './ExerciseRepository.js';
import { studentRepository } from '../students/StudentRepository.js';
import { database } from '../database/SqliteDatabase.js';

// Valid puzzle ID pattern (alphanumeric, underscore, hyphen)
const PUZZLE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export class ExerciseService {
  /**
   * Get the Monday of the current week
   * @param {Date} date - Reference date
   * @returns {string} - YYYY-MM-DD format
   */
  getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  /**
   * Get the Sunday of the week
   * @param {string} weekStart - Monday date (YYYY-MM-DD)
   * @returns {string} - YYYY-MM-DD format
   */
  getWeekEnd(weekStart) {
    const monday = new Date(weekStart);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday.toISOString().split('T')[0];
  }

  /**
   * Format week for display
   * @param {string} weekStart - Monday date
   * @param {string} weekEnd - Sunday date
   * @returns {string}
   */
  formatWeekLabel(weekStart, weekEnd) {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const options = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  }

  /**
   * Create a weekly exercise from puzzle IDs
   * @param {object} data - { puzzleIds, filters, name, weekStart? }
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  createWeeklyExercise(data) {
    const { puzzleIds, filters, name } = data;

    if (!puzzleIds || !Array.isArray(puzzleIds) || puzzleIds.length === 0) {
      return { success: false, error: 'At least one puzzle is required' };
    }

    // Validate puzzle ID format
    for (const id of puzzleIds) {
      if (typeof id !== 'string' || !PUZZLE_ID_PATTERN.test(id)) {
        return { success: false, error: `Invalid puzzle ID format: ${id}` };
      }
    }

    const weekStart = data.weekStart || this.getWeekStart();
    const weekEnd = this.getWeekEnd(weekStart);

    // Check if exercise already exists for this week
    const existing = exerciseRepository.findExerciseByWeek(weekStart);
    if (existing) {
      return {
        success: false,
        error: `Exercise already exists for week ${this.formatWeekLabel(weekStart, weekEnd)}`
      };
    }

    // Create the exercise
    const result = exerciseRepository.createExercise({
      week_start: weekStart,
      week_end: weekEnd,
      name: name || `Week of ${this.formatWeekLabel(weekStart, weekEnd)}`,
      puzzle_ids: puzzleIds.join(','),
      filters
    });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: {
        ...result.data,
        week_label: this.formatWeekLabel(weekStart, weekEnd),
        puzzle_count: puzzleIds.length
      }
    };
  }

  /**
   * Get exercise with full puzzle details
   * @param {string} exerciseId - Exercise ID
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  getExerciseWithPuzzles(exerciseId) {
    const exercise = exerciseRepository.findExerciseById(exerciseId);

    if (!exercise) {
      return { success: false, error: 'Exercise not found' };
    }

    // Get puzzle details
    const puzzleIds = exercise.puzzle_ids.split(',');
    const puzzles = database.getPuzzlesByIds(puzzleIds);

    // Sort puzzles in the same order as puzzle_ids
    const orderedPuzzles = puzzleIds.map(id =>
      puzzles.find(p => p.id === id)
    ).filter(Boolean);

    return {
      success: true,
      data: {
        ...exercise,
        week_label: this.formatWeekLabel(exercise.week_start, exercise.week_end),
        filters: exercise.filters ? JSON.parse(exercise.filters) : null,
        puzzles: orderedPuzzles
      }
    };
  }

  /**
   * Assign exercise to students
   * @param {string} exerciseId - Exercise ID
   * @param {string[]} studentIds - Array of student IDs
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  assignExerciseToStudents(exerciseId, studentIds) {
    const exercise = exerciseRepository.findExerciseById(exerciseId);

    if (!exercise) {
      return { success: false, error: 'Exercise not found' };
    }

    const puzzleCount = exercise.puzzle_ids.split(',').length;
    const results = [];
    const errors = [];

    for (const studentId of studentIds) {
      // Verify student exists
      const student = studentRepository.findById(studentId);
      if (!student) {
        errors.push(`Student ${studentId} not found`);
        continue;
      }

      // Check if already assigned
      if (exerciseRepository.isAlreadyAssigned(studentId, exerciseId)) {
        errors.push(`${student.name} is already assigned to this exercise`);
        continue;
      }

      const result = exerciseRepository.assignExercise({
        student_id: studentId,
        exercise_id: exerciseId,
        total_puzzles: puzzleCount
      });

      if (result.success) {
        results.push({
          ...result.data,
          student_name: student.name
        });
      } else {
        errors.push(`Failed to assign to ${student.name}: ${result.error}`);
      }
    }

    return {
      success: true,
      data: {
        assigned: results,
        errors
      }
    };
  }

  /**
   * Grade a student's exercise
   * @param {string} studentExerciseId - Student exercise ID
   * @param {number} score - Number of correct answers
   * @param {string} notes - Optional notes
   * @param {string} puzzleResults - Optional comma-separated puzzle results (1=correct, 0=wrong)
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  gradeExercise(studentExerciseId, score, notes, puzzleResults = null) {
    const assignment = exerciseRepository.findStudentExerciseById(studentExerciseId);

    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    if (score < 0 || score > assignment.total_puzzles) {
      return {
        success: false,
        error: `Score must be between 0 and ${assignment.total_puzzles}`
      };
    }

    const updateData = {
      score,
      status: 'graded',
      notes
    };

    if (puzzleResults !== null) {
      updateData.puzzle_results = puzzleResults;
    }

    return exerciseRepository.updateStudentExercise(studentExerciseId, updateData);
  }

  /**
   * Save a student's puzzle attempt (temporary score, not final grade)
   * Only saves if the exercise hasn't been graded by teacher yet.
   * @param {string} studentExerciseId - Student exercise ID
   * @param {number} score - Number of correct answers
   * @param {string} puzzleResults - Comma-separated puzzle results (1=correct, 0=wrong)
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  saveStudentAttempt(studentExerciseId, score, puzzleResults = null, puzzleHints = null) {
    const assignment = exerciseRepository.findStudentExerciseById(studentExerciseId);

    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    if (assignment.is_final) {
      return {
        success: false,
        error: 'This exercise has been marked as final and can no longer be modified'
      };
    }

    if (score < 0 || score > assignment.total_puzzles) {
      return {
        success: false,
        error: `Score must be between 0 and ${assignment.total_puzzles}`
      };
    }

    const updateData = { score };

    if (puzzleResults !== null) {
      updateData.puzzle_results = puzzleResults;
    }

    if (puzzleHints !== null) {
      updateData.puzzle_hints = puzzleHints;
    }

    return exerciseRepository.updateStudentExercise(studentExerciseId, updateData);
  }

  /**
   * Mark a student's exercise as final (no further solving allowed)
   * @param {string} studentExerciseId - Student exercise ID
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  markExerciseAsFinal(studentExerciseId) {
    const assignment = exerciseRepository.findStudentExerciseById(studentExerciseId);

    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    return exerciseRepository.updateStudentExercise(studentExerciseId, { is_final: 1 });
  }

  /**
   * Reset a student's exercise score to 0
   * Clears score, puzzle_results, puzzle_hints, and is_final
   * Does NOT change status
   * @param {string} studentExerciseId - Student exercise ID
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  resetExerciseScore(studentExerciseId) {
    return exerciseRepository.resetStudentExerciseScore(studentExerciseId);
  }

  /**
   * Upload answer PDF path
   * @param {string} studentExerciseId - Student exercise ID
   * @param {string} pdfPath - Path to uploaded PDF
   * @returns {{ success: boolean, data?: object, error?: string }}
   */
  uploadAnswerPdf(studentExerciseId, pdfPath) {
    return exerciseRepository.updateStudentExercise(studentExerciseId, {
      answer_pdf_path: pdfPath,
      status: 'submitted'
    });
  }

  /**
   * Get all exercises with assignment counts
   * @returns {object[]}
   */
  getAllExercisesWithStats() {
    const exercises = exerciseRepository.findAllExercises();

    return exercises.map(exercise => {
      const assignments = exerciseRepository.findExerciseAssignments(exercise.id);
      const graded = assignments.filter(a => a.status === 'graded');

      return {
        ...exercise,
        week_label: this.formatWeekLabel(exercise.week_start, exercise.week_end),
        puzzle_count: exercise.puzzle_ids.split(',').length,
        total_assigned: assignments.length,
        total_graded: graded.length,
        filters: exercise.filters ? JSON.parse(exercise.filters) : null
      };
    });
  }
}

export const exerciseService = new ExerciseService();
