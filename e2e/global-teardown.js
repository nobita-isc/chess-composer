/**
 * global-teardown.js
 * Playwright global teardown: removes cloned e2e DB files and auth state.
 * Runs after all tests complete.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanTestDb } from '../packages/server/test-utils/seed-test-db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '.auth');

export default async function globalTeardown() {
  // Remove cloned DB files
  console.log('[e2e teardown] Removing cloned DB files...');
  cleanTestDb();

  // Remove auth state directory
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  }

  console.log('[e2e teardown] Done. No e2e artifacts remain.');
}
