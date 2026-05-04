/**
 * global-setup.js
 * Playwright global setup: clones DB, seeds test users, writes auth state.
 * Runs before webServer boots — DB clone must exist before server starts.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedTestDb, CLONE_DB } from '../packages/server/test-utils/seed-test-db.js';
import { seedTestUsers, TEST_ADMIN, TEST_STUDENT } from '../packages/server/test-utils/seed-test-users.js';
import { tokenFor } from '../packages/server/test-utils/sign-test-token.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '.auth');
const AUTH_STATE_PATH = path.join(AUTH_DIR, 'state.json');

// localStorage keys from packages/client/src/auth/AuthManager.js
const ACCESS_TOKEN_KEY = 'chess_access_token';

export default async function globalSetup() {
  // 1. Clone DB (must happen before server boots via webServer)
  console.log('[e2e setup] Cloning DB...');
  seedTestDb();

  // 2. Seed test users into the cloned DB
  console.log('[e2e setup] Seeding test users...');
  const { adminId, studentId } = await seedTestUsers(CLONE_DB);

  // 3. Generate tokens
  const adminToken = tokenFor({ id: adminId, username: TEST_ADMIN.username, role: 'admin' });
  const studentToken = tokenFor({ id: studentId, username: TEST_STUDENT.username, role: 'student' });

  // 4. Write auth state for fixture use
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify({
    adminToken,
    studentToken,
    accessTokenKey: ACCESS_TOKEN_KEY,
  }, null, 2));

  // 5. Expose IDs via env for tests that need them
  process.env.E2E_ADMIN_ID = adminId;
  process.env.E2E_STUDENT_ID = studentId;
  process.env.E2E_DB_PATH = CLONE_DB;

  console.log('[e2e setup] Done. DB cloned, users seeded, tokens written.');
}
