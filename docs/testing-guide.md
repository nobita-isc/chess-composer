# Testing Guide

Chess Composer uses a 3-layer testing strategy: unit tests, widget/DOM tests, and end-to-end tests.

## Quick Start

**Unit tests** (Vitest, fast, no browser):
```bash
npm test
```

**Widget tests** (Vitest + jsdom, DOM interactions):
```bash
npx vitest run --config vitest.workspace.js
```

**E2E tests** (Playwright, Chromium, full browser):
```bash
npm run test:e2e               # headless
npm run test:e2e:headed        # visible browser
npm run test:e2e:install       # install Chromium
```

## Test Layers

### Layer 1: Unit Tests (Vitest)

**Location**: `packages/*/tests/*.test.js` and co-located with source

**What to test**: Functions, utilities, services, validators

**Example**:
```javascript
import { validatePuzzleInput } from '../validators.js'

describe('validatePuzzleInput', () => {
  it('accepts valid FEN + moves', () => {
    const result = validatePuzzleInput(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      ['e2e4', 'e7e5']
    )
    expect(result.valid).toBe(true)
  })

  it('rejects invalid FEN', () => {
    const result = validatePuzzleInput('invalid', ['e2e4'])
    expect(result.valid).toBe(false)
  })
})
```

**Run**: `npm test`

**Coverage target**: 80%+ on utilities and services

### Layer 2: Widget Tests (Vitest + jsdom)

**Location**: `packages/client/tests/*.test.js`

**What to test**: Interactive board, DOM components, user interactions

**Example**: `packages/client/tests/interactive-puzzle-board.test.js` (62 tests, 95% coverage)

Tests board move validation, piece dragging, legal move highlighting, puzzle solution tracking.

**Run**:
```bash
npx vitest run --config vitest.workspace.js
```

**Coverage target**: 95% on interactive widgets

### Layer 3: E2E Tests (Playwright)

**Location**: `e2e/puzzle-*.spec.js`, `e2e/smoke.spec.js`

**What to test**: Complete user flows — puzzle solving, lesson playback, course management

**Coverage**:
- `puzzle-solving.spec.js` — 13 specs (11 pass, 2 skipped)
- `puzzle-play.spec.js` — 10 specs (9 pass, 1 skipped)
- `smoke.spec.js` — Basic page loads and navigation

**Example test**:
```javascript
test('Student solves puzzle and sees XP reward', async ({ page, authFixture }) => {
  const user = await authFixture.loginStudent()
  await page.goto('/#/courses')
  
  // Select course + lesson + puzzle
  await page.click('.course-item')
  await page.click('.lesson-item')
  await page.click('[data-content-type="puzzle"]')
  
  // Make winning move
  await boardActions.dragPiece(page, 'e2', 'e4')
  await expect(page.locator('.success-message')).toContainText('+10 XP')
})
```

**Run**:
```bash
npm run test:e2e          # headless
npm run test:e2e:headed   # see browser (good for debugging)
```

**Coverage target**: All critical user flows

## Database Isolation

**E2E tests use a separate SQLite database** (`puzzles-e2e.db`) to avoid corrupting dev data.

**How it works**:
1. `seed-test-db.js` clones `packages/server/data/puzzles.db` → `puzzles-e2e.db`
2. Uses `VACUUM INTO` (WAL-safe) for atomic clone
3. E2E tests run against isolated DB
4. Deleted after tests (or re-seeded on next run)

**Important**: Never run E2E tests against your dev database. The isolation is automatic.

## Authentication in Tests

### E2E: Token Injection

All E2E tests use `auth-fixture.js` to inject JWT into localStorage (bypasses login UI):

```javascript
import { authFixture } from './fixtures/auth-fixture.js'

test('Admin views course', async ({ page, authFixture }) => {
  const user = await authFixture.loginAdmin()  // Injects token, no UI
  await page.goto('/#/courses')
  // Admin already logged in via token
})
```

**No login modal required** — token is in localStorage before page loads.

### Unit/Widget Tests

No token needed. Test services/components in isolation.

## Skipped Tests

Some E2E specs are **skipped** (marked with `.skip`) due to minor UI mismatches. See spec files for comments:

- `puzzle-solving.spec.js` — 2 skipped (board interaction timing)
- `puzzle-play.spec.js` — 1 skipped (modal z-index)

These don't block the build. Fix when time permits.

## Adding New E2E Tests

1. Create spec file: `e2e/my-feature.spec.js`
2. Use helpers for reusable patterns:

```javascript
import { test, expect } from '@playwright/test'
import { authFixture } from './fixtures/auth-fixture.js'
import * as boardActions from './helpers/board-actions.js'

test('My feature works', async ({ page, authFixture }) => {
  const user = await authFixture.loginStudent()
  await page.goto('/#/my-route')
  
  // Use helper for board actions
  await boardActions.dragPiece(page, 'e2', 'e4')
  
  // Use helper for API assertions
  await apiAssertions.expectPuzzleComplete(user.id)
})
```

**Available helpers**:
- `boardActions.dragPiece(page, from, to)` — Drag a piece
- `boardActions.clickSquare(page, square)` — Click square
- `apiAssertions.expectPuzzleComplete(userId)` — Verify API state
- `seedExercise(db, data)` — Create test exercise
- `seedLesson(db, courseId, data)` — Create test lesson

## Known Issues

**Skipped specs** (non-blocking):
- Board animation timing in headless mode
- Modal z-index flakiness on rapid clicks

**Flaky tests**: None currently. Retries enabled for Playwright via `playwright.config.js`.

## Debugging E2E Tests

### View browser while running:
```bash
npm run test:e2e:headed
```

### Pause on test line:
```javascript
await page.pause()  // Pauses browser, open DevTools
```

### Inspect HTML:
```javascript
console.log(await page.content())
```

### Save screenshot:
```javascript
await page.screenshot({ path: 'debug.png' })
```

## Performance

| Layer | Speed | Notes |
|-------|-------|-------|
| Unit | <1s | Fast, no browser |
| Widget | 1-2s | jsdom, no real browser |
| E2E | 10-20s | Real Chromium, slowest layer |

Run locally before push:
```bash
npm test && npm run test:e2e
```

## CI/CD Integration

**On GitHub Actions** (`.github/workflows/test.yml`):
1. Install dependencies
2. Run unit tests (`npm test`)
3. Run E2E tests (`npm run test:e2e`)
4. Upload coverage reports
5. Fail build if coverage <80%

## Structure

```
projects/chess_composer/
├── playwright.config.js           # E2E config
├── vitest.workspace.js            # Unit + widget config
├── e2e/
│   ├── puzzle-solving.spec.js     # 11 passing specs
│   ├── puzzle-play.spec.js        # 9 passing specs
│   ├── smoke.spec.js              # Basic smoke tests
│   ├── fixtures/
│   │   └── auth-fixture.js        # Token injection helper
│   └── helpers/
│       ├── board-actions.js       # Board interactions
│       ├── api-assertions.js      # API state checks
│       ├── seed-exercise.js       # Test data setup
│       └── seed-lesson.js         # Lesson seeding
│
├── packages/
│   ├── client/
│   │   └── tests/
│   │       ├── interactive-puzzle-board.test.js    # 95% coverage
│   │       ├── chess-puzzle-utils.test.js
│   │       └── helpers/
│   │           └── make-board.js
│   │
│   └── server/
│       └── test-utils/
│           ├── seed-test-db.js        # WAL-safe clone
│           ├── sign-test-token.js     # JWT generation
│           └── seed-test-users.js     # User setup
```

---

**Last Updated**: 2026-05-03
