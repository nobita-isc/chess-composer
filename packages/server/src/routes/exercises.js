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
import { requireRole } from '../middleware/roleMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exercises = new Hono();

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

exercises.get('/', async (c) => {
  try {
    const exerciseList = await exerciseService.getAllExercisesWithStats();
    return c.json({ success: true, data: exerciseList });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

exercises.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { puzzleIds, filters, name, weekStart } = body;

    if (!puzzleIds || !Array.isArray(puzzleIds) || puzzleIds.length === 0) {
      return c.json({ success: false, error: 'At least one puzzle ID is required' }, 400);
    }

    const result = await exerciseService.createWeeklyExercise({ puzzleIds, filters, name, weekStart });

    if (!result.success) return c.json({ success: false, error: result.error }, 400);
    return c.json({ success: true, data: result.data }, 201);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

exercises.get('/current-week', async (c) => {
  try {
    const weekStart = exerciseService.getWeekStart();
    const weekEnd = exerciseService.getWeekEnd(weekStart);
    const exercises_list = await exerciseRepository.findExercisesByWeek(weekStart);

    return c.json({
      success: true,
      data: {
        week_start: weekStart,
        week_end: weekEnd,
        week_label: exerciseService.formatWeekLabel(weekStart, weekEnd),
        has_exercise: exercises_list.length > 0,
        exercise_count: exercises_list.length
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

exercises.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await exerciseService.getExerciseWithPuzzles(id);

    if (!result.success) return c.json({ success: false, error: result.error }, 404);
    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

exercises.get('/:id/pdf', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await exerciseService.getExerciseWithPuzzles(id);

    if (!result.success) return c.json({ success: false, error: result.error }, 404);

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

exercises.put('/:id', requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const { name } = await c.req.json();

    if (!name || !name.trim()) return c.json({ success: false, error: 'Name is required' }, 400);

    const trimmed = name.trim();
    if (trimmed.length > 200) return c.json({ success: false, error: 'Name must be 200 characters or less' }, 400);

    const result = await exerciseRepository.updateExerciseName(id, trimmed);
    if (!result.success) return c.json({ success: false, error: result.error }, 404);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

exercises.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await exerciseRepository.deleteExercise(id);

    if (!result.success) return c.json({ success: false, error: result.error }, 400);
    return c.json({ success: true, message: 'Exercise deleted' });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

exercises.post('/:id/assign', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { studentIds } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return c.json({ success: false, error: 'At least one student ID is required' }, 400);
    }

    const result = await exerciseService.assignExerciseToStudents(id, studentIds);

    if (!result.success) return c.json({ success: false, error: result.error }, 400);
    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

exercises.get('/:id/assignments', async (c) => {
  try {
    const id = c.req.param('id');
    const assignments = await exerciseRepository.findExerciseAssignments(id);
    return c.json({ success: true, data: assignments });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default exercises;
