/**
 * students.js - Student management API routes
 */

import { Hono } from 'hono';
import { studentRepository } from '../students/StudentRepository.js';
import { exerciseRepository } from '../exercises/ExerciseRepository.js';

const students = new Hono();

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/students
 * List all students
 */
students.get('/', (c) => {
  try {
    const studentList = studentRepository.findAll();
    return c.json({ success: true, data: studentList });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/students
 * Create a new student
 */
students.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, skill_level, notes } = body;

    if (!name || !name.trim()) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    // Validate email format if provided
    if (email && email.trim() && !EMAIL_REGEX.test(email.trim())) {
      return c.json({ success: false, error: 'Invalid email format' }, 400);
    }

    const validSkillLevels = ['beginner', 'intermediate', 'advanced'];
    if (skill_level && !validSkillLevels.includes(skill_level)) {
      return c.json({
        success: false,
        error: `Skill level must be one of: ${validSkillLevels.join(', ')}`
      }, 400);
    }

    const result = studentRepository.create({
      name: name.trim(),
      email: email?.trim() || null,
      skill_level: skill_level || 'beginner',
      notes: notes?.trim() || null
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
 * GET /api/students/:id
 * Get a student by ID
 */
students.get('/:id', (c) => {
  try {
    const id = c.req.param('id');
    const student = studentRepository.findById(id);

    if (!student) {
      return c.json({ success: false, error: 'Student not found' }, 404);
    }

    return c.json({ success: true, data: student });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PUT /api/students/:id
 * Update a student
 */
students.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, email, skill_level, notes } = body;

    // Validate email format if provided
    if (email && email.trim() && !EMAIL_REGEX.test(email.trim())) {
      return c.json({ success: false, error: 'Invalid email format' }, 400);
    }

    const validSkillLevels = ['beginner', 'intermediate', 'advanced'];
    if (skill_level && !validSkillLevels.includes(skill_level)) {
      return c.json({
        success: false,
        error: `Skill level must be one of: ${validSkillLevels.join(', ')}`
      }, 400);
    }

    const result = studentRepository.update(id, {
      name: name?.trim(),
      email: email?.trim(),
      skill_level,
      notes: notes?.trim()
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/students/:id
 * Delete a student
 */
students.delete('/:id', (c) => {
  try {
    const id = c.req.param('id');
    const result = studentRepository.delete(id);

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({ success: true, message: 'Student deleted' });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/students/:id/exercises
 * Get a student's exercise assignments
 */
students.get('/:id/exercises', (c) => {
  try {
    const id = c.req.param('id');
    const student = studentRepository.findById(id);

    if (!student) {
      return c.json({ success: false, error: 'Student not found' }, 404);
    }

    const exercises = exerciseRepository.findStudentExercises(id);
    return c.json({ success: true, data: exercises });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/students/:id/performance
 * Get a student's performance summary
 */
students.get('/:id/performance', (c) => {
  try {
    const id = c.req.param('id');
    const student = studentRepository.findById(id);

    if (!student) {
      return c.json({ success: false, error: 'Student not found' }, 404);
    }

    const performance = exerciseRepository.getStudentPerformance(id);
    return c.json({
      success: true,
      data: {
        student,
        performance
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default students;
