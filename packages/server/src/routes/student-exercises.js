/**
 * student-exercises.js - Student exercise grading and PDF upload routes
 */

import { Hono } from 'hono';
import { exerciseService } from '../exercises/ExerciseService.js';
import { exerciseRepository } from '../exercises/ExerciseRepository.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const studentExercises = new Hono();

const uploadsDir = path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

studentExercises.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const assignment = await exerciseRepository.findStudentExerciseById(id);

    if (!assignment) return c.json({ success: false, error: 'Assignment not found' }, 404);
    return c.json({ success: true, data: assignment });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

studentExercises.put('/:id/grade', requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { score, notes, puzzleResults } = body;

    if (score === undefined || score === null) return c.json({ success: false, error: 'Score is required' }, 400);
    if (typeof score !== 'number' || score < 0) return c.json({ success: false, error: 'Score must be a non-negative number' }, 400);

    if (puzzleResults !== undefined && puzzleResults !== null) {
      if (typeof puzzleResults !== 'string' || !/^[01,]*$/.test(puzzleResults)) {
        return c.json({ success: false, error: 'Invalid puzzleResults format' }, 400);
      }
    }

    const result = await exerciseService.gradeExercise(id, score, notes, puzzleResults || null);

    if (!result.success) return c.json({ success: false, error: result.error }, 400);
    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

studentExercises.put('/:id/attempt', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { score, puzzleResults, puzzleHints } = body;

    if (score === undefined || score === null) return c.json({ success: false, error: 'Score is required' }, 400);
    if (typeof score !== 'number' || score < 0) return c.json({ success: false, error: 'Score must be a non-negative number' }, 400);

    if (puzzleResults !== undefined && puzzleResults !== null) {
      if (typeof puzzleResults !== 'string' || !/^[01,]*$/.test(puzzleResults)) {
        return c.json({ success: false, error: 'Invalid puzzleResults format' }, 400);
      }
    }

    if (puzzleHints !== undefined && puzzleHints !== null) {
      if (typeof puzzleHints !== 'string' || !/^[01,]*$/.test(puzzleHints)) {
        return c.json({ success: false, error: 'Invalid puzzleHints format' }, 400);
      }
    }

    const result = await exerciseService.saveStudentAttempt(id, score, puzzleResults || null, puzzleHints || null);

    if (!result.success) return c.json({ success: false, error: result.error }, 400);
    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

studentExercises.post('/:id/upload', async (c) => {
  try {
    const id = c.req.param('id');

    const assignment = await exerciseRepository.findStudentExerciseById(id);
    if (!assignment) return c.json({ success: false, error: 'Assignment not found' }, 404);

    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) return c.json({ success: false, error: 'PDF file is required' }, 400);
    if (!file.name.toLowerCase().endsWith('.pdf')) return c.json({ success: false, error: 'Only PDF files are allowed' }, 400);
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ success: false, error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)` }, 400);
    }

    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.subarray(0, 4).equals(PDF_MAGIC_BYTES)) {
      return c.json({ success: false, error: 'Invalid PDF file format' }, 400);
    }

    const timestamp = Date.now();
    const filename = `answer_${id}_${timestamp}.pdf`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, buffer);

    const result = await exerciseService.uploadAnswerPdf(id, filename);

    if (!result.success) {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true, data: { ...result.data, filename } });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

studentExercises.get('/:id/download', async (c) => {
  try {
    const id = c.req.param('id');
    const assignment = await exerciseRepository.findStudentExerciseById(id);

    if (!assignment) return c.json({ success: false, error: 'Assignment not found' }, 404);
    if (!assignment.answer_pdf_path) return c.json({ success: false, error: 'No answer PDF uploaded' }, 404);

    const filepath = path.join(uploadsDir, assignment.answer_pdf_path);
    const resolvedPath = path.resolve(filepath);

    if (!resolvedPath.startsWith(path.resolve(uploadsDir))) {
      return c.json({ success: false, error: 'Invalid file path' }, 400);
    }

    if (!fs.existsSync(resolvedPath)) return c.json({ success: false, error: 'PDF file not found' }, 404);

    const fileBuffer = fs.readFileSync(resolvedPath);
    const sanitizedFilename = path.basename(assignment.answer_pdf_path).replace(/[^a-zA-Z0-9._-]/g, '_');

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

studentExercises.put('/:id/notes', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { notes } = body;

    const result = await exerciseRepository.updateStudentExercise(id, { notes });

    if (!result.success) return c.json({ success: false, error: result.error }, 400);
    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

studentExercises.put('/:id/mark-final', requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const result = await exerciseService.markExerciseAsFinal(id);

    if (!result.success) return c.json({ success: false, error: result.error }, 400);
    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

studentExercises.put('/:id/reset-score', requireRole('admin'), async (c) => {
  try {
    const id = c.req.param('id');
    const result = await exerciseService.resetExerciseScore(id);

    if (!result.success) return c.json({ success: false, error: result.error }, 400);
    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default studentExercises;
