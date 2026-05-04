/**
 * vitest.workspace.js
 * Vitest 4 projects config (replaces deprecated defineWorkspace).
 * Run with: npx vitest run --config vitest.workspace.js
 * The default `npm test` still uses vitest.config.js (node env only).
 *
 * Two named projects:
 *   node  — server + non-DOM client tests
 *   jsdom — client tests that require DOM APIs
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: [
        'packages/server/src/**/*.js',
        'packages/client/src/shared/interactive-puzzle-board.js',
        'packages/client/src/shared/chess-puzzle-utils.js',
      ],
      exclude: ['**/node_modules/**', '**/tests/**', '**/dist/**'],
      reporter: ['text', 'text-summary', 'json-summary'],
    },
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'packages/server/tests/**/*.test.js',
            'packages/client/tests/offline-storage-logic.test.js',
            'packages/client/tests/process-puzzles-theme-matching.test.js',
            'packages/client/tests/chess-puzzle-utils.test.js',
          ],
        },
      },
      {
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: [
            'packages/client/tests/puzzle-grading-context.test.js',
            'packages/client/tests/content-description-utilities.test.js',
            'packages/client/tests/interactive-puzzle-board.test.js',
          ],
        },
      },
    ],
  },
})
