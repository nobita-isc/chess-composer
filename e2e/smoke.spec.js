/**
 * smoke.spec.js
 * Minimal smoke test: verifies app loads and has a non-empty page title.
 * Does not require auth — just confirms the dev stack is up.
 */

import { test, expect } from '@playwright/test';

test('app loads and has a title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
});
