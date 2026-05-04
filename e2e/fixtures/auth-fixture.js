/**
 * auth-fixture.js
 * Playwright test fixtures that inject JWT tokens into localStorage before navigation.
 * Uses tokens written by global-setup to avoid live login calls during tests.
 */

import { test as base } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_PATH = path.join(__dirname, '../.auth/state.json');

function loadAuthState() {
  if (!fs.existsSync(AUTH_STATE_PATH)) {
    throw new Error(`Auth state not found at ${AUTH_STATE_PATH}. Was global setup run?`);
  }
  return JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf-8'));
}

/**
 * Extended test with `studentPage` and `adminPage` fixtures.
 * Each page has the appropriate JWT pre-injected into localStorage
 * before any navigation occurs.
 */
export const test = base.extend({
  studentPage: async ({ page }, use) => {
    const { studentToken, accessTokenKey } = loadAuthState();
    await page.addInitScript(
      ({ key, token }) => { localStorage.setItem(key, token); },
      { key: accessTokenKey, token: studentToken }
    );
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    const { adminToken, accessTokenKey } = loadAuthState();
    await page.addInitScript(
      ({ key, token }) => { localStorage.setItem(key, token); },
      { key: accessTokenKey, token: adminToken }
    );
    await use(page);
  },
});

export { expect } from '@playwright/test';
