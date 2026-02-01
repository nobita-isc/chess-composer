/**
 * exercises.js - Weekly exercise management API routes
 */

import { Hono } from 'hono';
import { exerciseService } from '../exercises/ExerciseService.js';
import { exerciseRepository } from '../exercises/ExerciseRepository.js';
import { pdfGenerator } from '../exercises/PdfGenerator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exercises = new Hono();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * GET /api/exercises
 * List all weekly exercises
 */
exercises.get('/', (c) => {
  try {
    const exerciseList = exerciseService.getAllExercisesWithStats();
    return c.json({ success: true, data: exerciseList });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/exercises
 * Create a new weekly exercise from puzzle IDs
 */
exercises.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { puzzleIds, filters, name, weekStart } = body;

    if (!puzzleIds || !Array.isArray(puzzleIds) || puzzleIds.length === 0) {
      return c.json({ success: false, error: 'At least one puzzle ID is required' }, 400);
    }

    const result = exerciseService.createWeeklyExercise({
      puzzleIds,
      filters,
      name,
      weekStart
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true, data: result.data }, 201);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/exercises/current-week
 * Get info about current week
 */
exercises.get('/current-week', (c) => {
  try {
    const weekStart = exerciseService.getWeekStart();
    const weekEnd = exerciseService.getWeekEnd(weekStart);
    const existing = exerciseRepository.findExerciseByWeek(weekStart);

    return c.json({
      success: true,
      data: {
        week_start: weekStart,
        week_end: weekEnd,
        week_label: exerciseService.formatWeekLabel(weekStart, weekEnd),
        has_exercise: !!existing,
        exercise: existing
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/exercises/:id
 * Get exercise with full puzzle details
 */
exercises.get('/:id', (c) => {
  try {
    const id = c.req.param('id');
    const result = exerciseService.getExerciseWithPuzzles(id);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 404);
    }

    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/exercises/:id/pdf
 * Download exercise as PDF
 */
exercises.get('/:id/pdf', async (c) => {
  try {
    const id = c.req.param('id');
    const result = exerciseService.getExerciseWithPuzzles(id);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 404);
    }

    const pdfBuffer = await pdfGenerator.generateExercisePdf(result.data);

    const filename = `exercise-${result.data.week_start}.pdf`;

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/exercises/:id
 * Delete an exercise
 */
exercises.delete('/:id', (c) => {
  try {
    const id = c.req.param('id');
    const result = exerciseRepository.deleteExercise(id);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true, message: 'Exercise deleted' });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/exercises/:id/assign
 * Assign exercise to students
 */
exercises.post('/:id/assign', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { studentIds } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return c.json({ success: false, error: 'At least one student ID is required' }, 400);
    }

    const result = exerciseService.assignExerciseToStudents(id, studentIds);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/exercises/:id/assignments
 * Get all student assignments for an exercise
 */
exercises.get('/:id/assignments', (c) => {
  try {
    const id = c.req.param('id');
    const assignments = exerciseRepository.findExerciseAssignments(id);
    return c.json({ success: true, data: assignments });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default exercises;
