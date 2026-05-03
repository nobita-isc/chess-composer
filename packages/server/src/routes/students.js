/**
 * students.js - Student management API routes
 */

import { Hono } from 'hono';
import { studentRepository } from '../students/StudentRepository.js';
import { exerciseRepository } from '../exercises/ExerciseRepository.js';
import { themeAnalyticsService } from '../exercises/ThemeAnalyticsService.js';

const students = new Hono();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

students.get('/', async (c) => {
  try {
    const studentList = await studentRepository.findAll();
    return c.json({ success: true, data: studentList });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

students.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, skill_level, notes } = body;

    if (!name || !name.trim()) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    if (email && email.trim() && !EMAIL_REGEX.test(email.trim())) {
      return c.json({ success: false, error: 'Invalid email format' }, 400);
    }

    const validSkillLevels = ['beginner', 'intermediate', 'advanced'];
    if (skill_level && !validSkillLevels.includes(skill_level)) {
      return c.json({ success: false, error: `Skill level must be one of: ${validSkillLevels.join(', ')}` }, 400);
    }

    const result = await studentRepository.create({
      name: name.trim(),
      email: email?.trim() || null,
      skill_level: skill_level || 'beginner',
      notes: notes?.trim() || null
    });

    if (!result.success) return c.json({ success: false, error: result.error }, 400);
    return c.json({ success: true, data: result.data }, 201);
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

students.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const student = await studentRepository.findById(id);

    if (!student) return c.json({ success: false, error: 'Student not found' }, 404);
    return c.json({ success: true, data: student });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

students.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, email, skill_level, notes } = body;

    if (email && email.trim() && !EMAIL_REGEX.test(email.trim())) {
      return c.json({ success: false, error: 'Invalid email format' }, 400);
    }

    const validSkillLevels = ['beginner', 'intermediate', 'advanced'];
    if (skill_level && !validSkillLevels.includes(skill_level)) {
      return c.json({ success: false, error: `Skill level must be one of: ${validSkillLevels.join(', ')}` }, 400);
    }

    const result = await studentRepository.update(id, {
      name: name?.trim(),
      email: email?.trim(),
      skill_level,
      notes: notes?.trim()
    });

    if (!result.success) return c.json({ success: false, error: result.error }, 400);
    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

students.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await studentRepository.delete(id);

    if (!result.success) return c.json({ success: false, error: result.error }, 400);
    return c.json({ success: true, message: 'Student deleted' });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

students.get('/:id/exercises', async (c) => {
  try {
    const id = c.req.param('id');
    const student = await studentRepository.findById(id);

    if (!student) return c.json({ success: false, error: 'Student not found' }, 404);

    const exercises = await exerciseRepository.findStudentExercises(id);
    return c.json({ success: true, data: exercises });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

students.get('/:id/performance', async (c) => {
  try {
    const id = c.req.param('id');
    const student = await studentRepository.findById(id);

    if (!student) return c.json({ success: false, error: 'Student not found' }, 404);

    const performance = await exerciseRepository.getStudentPerformance(id);
    return c.json({ success: true, data: { student, performance } });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

students.get('/:id/theme-analytics', async (c) => {
  try {
    const id = c.req.param('id');
    const student = await studentRepository.findById(id);

    if (!student) return c.json({ success: false, error: 'Student not found' }, 404);

    const analytics = await themeAnalyticsService.getStudentThemeAnalytics(id);

    return c.json({
      success: true,
      data: {
        student: { id: student.id, name: student.name },
        ...analytics
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default students;
