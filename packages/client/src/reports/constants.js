/**
 * Report constants - shared between client components
 */

export const REPORT_REASONS = {
  WRONG_SOLUTION: 'wrong_solution',
  DUPLICATE: 'duplicate',
  BROKEN_POSITION: 'broken_position',
  OTHER: 'other'
};

export const REPORT_REASON_LABELS = {
  [REPORT_REASONS.WRONG_SOLUTION]: 'Wrong Solution',
  [REPORT_REASONS.DUPLICATE]: 'Duplicate Puzzle',
  [REPORT_REASONS.BROKEN_POSITION]: 'Broken Position',
  [REPORT_REASONS.OTHER]: 'Other'
};
