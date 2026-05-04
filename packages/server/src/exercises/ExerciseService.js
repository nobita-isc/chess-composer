/**
 * ExerciseService.js
 * Business logic for exercise management
 */

import { exerciseRepository } from './ExerciseRepository.js';
import { studentRepository } from '../students/StudentRepository.js';
import { database } from '../database/SqliteDatabase.js';

const PUZZLE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class ExerciseService {
  getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    return formatLocalDate(monday);
  }

  getWeekEnd(weekStart) {
    const [y, m, d] = weekStart.split('-').map(Number);
    const sunday = new Date(y, m - 1, d + 6);
    return formatLocalDate(sunday);
  }

  formatWeekLabel(weekStart, weekEnd) {
    const [sy, sm, sd] = weekStart.split('-').map(Number);
    const [ey, em, ed] = weekEnd.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const options = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  }

  async createWeeklyExercise(data) {
    const { puzzleIds, filters, name } = data;

    if (!puzzleIds || !Array.isArray(puzzleIds) || puzzleIds.length === 0) {
      return { success: false, error: 'At least one puzzle is required' };
    }

    for (const id of puzzleIds) {
      if (typeof id !== 'string' || !PUZZLE_ID_PATTERN.test(id)) {
        return { success: false, error: `Invalid puzzle ID format: ${id}` };
      }
    }

    const weekStart = data.weekStart || this.getWeekStart();
    const weekEnd = this.getWeekEnd(weekStart);

    // getPuzzlesByIds is a sync better-sqlite3 call on the sqlite path
    const puzzles = database.getPuzzlesByIds(puzzleIds);
    const puzzlesWithRating = puzzles.filter(p => p.rating != null);
    const avgRating = puzzlesWithRating.length > 0
      ? Math.round(puzzlesWithRating.reduce((sum, p) => sum + p.rating, 0) / puzzlesWithRating.length)
      : null;

    const result = await exerciseRepository.createExercise({
      week_start: weekStart,
      week_end: weekEnd,
      name: name || `Week of ${this.formatWeekLabel(weekStart, weekEnd)}`,
      puzzle_ids: puzzleIds.join(','),
      filters,
      avg_rating: avgRating
    });

    if (!result.success) return result;

    return {
      success: true,
      data: {
        ...result.data,
        week_label: this.formatWeekLabel(weekStart, weekEnd),
        puzzle_count: puzzleIds.length
      }
    };
  }

  async getExerciseWithPuzzles(exerciseId) {
    const exercise = await exerciseRepository.findExerciseById(exerciseId);

    if (!exercise) {
      return { success: false, error: 'Exercise not found' };
    }

    const puzzleIds = exercise.puzzle_ids.split(',');
    const puzzles = database.getPuzzlesByIds(puzzleIds);

    const orderedPuzzles = puzzleIds.map(id => puzzles.find(p => p.id === id)).filter(Boolean);

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

  async assignExerciseToStudents(exerciseId, studentIds) {
    const exercise = await exerciseRepository.findExerciseById(exerciseId);

    if (!exercise) {
      return { success: false, error: 'Exercise not found' };
    }

    const puzzleCount = exercise.puzzle_ids.split(',').length;
    const results = [];
    const errors = [];

    for (const studentId of studentIds) {
      const student = await studentRepository.findById(studentId);
      if (!student) {
        errors.push(`Student ${studentId} not found`);
        continue;
      }

      if (await exerciseRepository.isAlreadyAssigned(studentId, exerciseId)) {
        errors.push(`${student.name} is already assigned to this exercise`);
        continue;
      }

      const result = await exerciseRepository.assignExercise({
        student_id: studentId,
        exercise_id: exerciseId,
        total_puzzles: puzzleCount
      });

      if (result.success) {
        results.push({ ...result.data, student_name: student.name });
      } else {
        errors.push(`Failed to assign to ${student.name}: ${result.error}`);
      }
    }

    return { success: true, data: { assigned: results, errors } };
  }

  async gradeExercise(studentExerciseId, score, notes, puzzleResults = null) {
    const assignment = await exerciseRepository.findStudentExerciseById(studentExerciseId);

    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    if (score < 0 || score > assignment.total_puzzles) {
      return { success: false, error: `Score must be between 0 and ${assignment.total_puzzles}` };
    }

    const updateData = { score, status: 'graded', notes };
    if (puzzleResults !== null) updateData.puzzle_results = puzzleResults;

    return exerciseRepository.updateStudentExercise(studentExerciseId, updateData);
  }

  async saveStudentAttempt(studentExerciseId, score, puzzleResults = null, puzzleHints = null) {
    const assignment = await exerciseRepository.findStudentExerciseById(studentExerciseId);

    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    if (assignment.is_final) {
      return { success: false, error: 'This exercise has been marked as final and can no longer be modified' };
    }

    if (score < 0 || score > assignment.total_puzzles) {
      return { success: false, error: `Score must be between 0 and ${assignment.total_puzzles}` };
    }

    const updateData = { score };
    if (puzzleResults !== null) updateData.puzzle_results = puzzleResults;
    if (puzzleHints !== null) updateData.puzzle_hints = puzzleHints;

    return exerciseRepository.updateStudentExercise(studentExerciseId, updateData);
  }

  async markExerciseAsFinal(studentExerciseId) {
    const assignment = await exerciseRepository.findStudentExerciseById(studentExerciseId);

    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    return exerciseRepository.updateStudentExercise(studentExerciseId, { is_final: 1 });
  }

  async resetExerciseScore(studentExerciseId) {
    return exerciseRepository.resetStudentExerciseScore(studentExerciseId);
  }

  async uploadAnswerPdf(studentExerciseId, pdfPath) {
    return exerciseRepository.updateStudentExercise(studentExerciseId, {
      answer_pdf_path: pdfPath,
      status: 'submitted'
    });
  }

  async getAllExercisesWithStats() {
    const exercises = await exerciseRepository.findAllExercises();

    const withStats = await Promise.all(exercises.map(async exercise => {
      const assignments = await exerciseRepository.findExerciseAssignments(exercise.id);
      const graded = assignments.filter(a => a.status === 'graded');
      return {
        ...exercise,
        week_label: this.formatWeekLabel(exercise.week_start, exercise.week_end),
        puzzle_count: exercise.puzzle_ids.split(',').length,
        total_assigned: assignments.length,
        total_graded: graded.length,
        filters: exercise.filters ? JSON.parse(exercise.filters) : null
      };
    }));

    return withStats;
  }
}

export const exerciseService = new ExerciseService();
