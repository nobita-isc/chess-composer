/**
 * playwright.config.js
 * Chromium-only Playwright configuration for chess-composer e2e tests.
 * webServer auto-launches the API server with a cloned test DB.
 * Global setup/teardown handle DB clone lifecycle.
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const E2E_DB_PATH = path.resolve(__dirname, 'packages/server/data/puzzles-e2e.db');
const SERVER_PORT = 3001;
const CLIENT_PORT = 3000;

export default defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Boot the API server with the cloned test DB
  webServer: [
    {
      command: `SQLITE_PATH=${E2E_DB_PATH} NODE_ENV=test npm run dev -w @chess-composer/server`,
      port: SERVER_PORT,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
      env: {
        SQLITE_PATH: E2E_DB_PATH,
        NODE_ENV: 'test',
        PORT: String(SERVER_PORT),
      },
    },
    {
      command: 'npm run dev -w @chess-composer/client',
      port: CLIENT_PORT,
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
  ],

  globalSetup: './e2e/global-setup.js',
  globalTeardown: './e2e/global-teardown.js',
});
