/**
 * reports.js - Report API routes
 */

import { Hono } from 'hono';
import { reportManager, REPORT_REASONS } from '../reports/PuzzleReportManager.js';

const reports = new Hono();

reports.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { puzzleId, reason, notes = '' } = body;

    if (!puzzleId) return c.json({ success: false, error: 'Puzzle ID is required' }, 400);

    if (!reason || !Object.values(REPORT_REASONS).includes(reason)) {
      return c.json({
        success: false,
        error: 'Invalid reason. Must be one of: ' + Object.values(REPORT_REASONS).join(', ')
      }, 400);
    }

    const result = await reportManager.reportPuzzle(puzzleId, reason, notes);

    if (result.success) {
      return c.json({ success: true, data: { reportId: result.reportId, puzzleId, reason, notes } });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

reports.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('pageSize') || '20');
    const includeDismissed = c.req.query('includeDismissed') === 'true';

    const result = await reportManager.getReports({ page, pageSize, includeDismissed });
    return c.json({ success: true, data: result });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

reports.get('/stats', async (c) => {
  try {
    const stats = await reportManager.getStats();
    return c.json({ success: true, data: stats });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

reports.put('/:id/dismiss', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const result = await reportManager.dismissReport(id);

    if (result.success) {
      return c.json({ success: true, data: { reportId: id, dismissed: true } });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

reports.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const result = await reportManager.deleteReport(id);

    if (result.success) {
      return c.json({ success: true });
    } else {
      return c.json({ success: false, error: result.error }, 400);
    }
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default reports;
