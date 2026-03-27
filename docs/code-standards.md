# Code Standards & Conventions

Chess Composer follows consistent patterns for code organization, error handling, validation, and API design. This document defines standards across client and server.

## File Organization

### Naming Conventions

| File Type | Convention | Example |
|-----------|-----------|---------|
| **JS files** | kebab-case | `puzzle-validator.js`, `create-exercise-dialog.js` |
| **Directories** | kebab-case | `src/exercises/`, `src/api/` |
| **Classes/Functions** | camelCase | `createPuzzle()`, `validateMove()` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RATING`, `DEFAULT_RATING_RANGE` |
| **Private methods** | prefix `_` | `_sanitizeInput()`, `_cacheThemes()` |

### File Size Limits

- **Target**: 200-400 lines per file
- **Maximum**: 800 lines (triggers refactoring review)
- **Large files marked for modularization** (priority order):
  1. ExercisePanel.js (1546 LOC) → Split into components
  2. PuzzlePlayer.js (1492 LOC) → Split into modules
  3. CreatePuzzleDialog.js (785 LOC) → Extract forms, validation
  4. PrintPreview.js (751 LOC) → Extract controls, content
  5. GenerateView.js (~683 LOC) → Extract panels, filters
  6. AdminPanel.js (678 LOC) → Extract sub-sections

**Last refactored**: 2026-03-28
- ExercisePanel & AdminPanel: Modern UI patterns added (ep-table, gd-dropdown)
- PuzzlePlayer: Compatible with new grading mode
- Small optimizations: password toggle, inline create

### Directory Structure

**Client** (`packages/client/src/`)
```
├── api/              # HTTP client (ApiClient.js)
├── auth/             # Login, tokens, user mgmt
├── core/             # Routing, chess engine
├── data/             # Fallback sample data
├── exercises/        # Puzzle solving, grading, PDF
├── puzzles/          # Generation, creation, validation
├── reports/          # Admin, reporting
└── views/            # Page-level components
```

**Server** (`packages/server/src/`)
```
├── auth/             # JWT, password hashing
├── database/         # SQLite wrapper, migrations
├── exercises/        # Exercise logic, PDF generation
├── middleware/       # Auth, role checking
├── puzzles/          # Generation, validation
├── reports/          # Reporting system
├── routes/           # API endpoints (8 modules)
├── shared/           # Utilities, converters
├── students/         # Student management
└── users/            # User management, auth
```

## Code Patterns

### Immutability (CRITICAL)

**WRONG - Mutation:**
```javascript
function updateExercise(exercise, name) {
  exercise.name = name  // MUTATION!
  return exercise
}
```

**CORRECT - Immutability:**
```javascript
function updateExercise(exercise, name) {
  return {
    ...exercise,
    name
  }
}
```

### Repository Pattern (Data Access)

```javascript
// ✅ GOOD: Data access isolated in repository
class UserRepository {
  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?')
    return stmt.get(id)
  }

  create(userData) {
    const stmt = this.db.prepare('INSERT INTO users (...) VALUES (...)')
    return stmt.run(userData)
  }
}

// Service layer uses repository
class UserService {
  constructor(repository) {
    this.userRepository = repository
  }

  getUser(id) {
    return this.userRepository.findById(id)
  }
}
```

### Service Layer (Business Logic)

```javascript
// ✅ GOOD: Business logic in service
class PuzzleCreationService {
  async generatePuzzles(theme, count) {
    const puzzles = await this.databaseLoader.loadByTheme(theme, count)
    return puzzles.map(p => this._convertToClientFormat(p))
  }

  _convertToClientFormat(puzzle) {
    return {
      fen: puzzle.fen,
      moves: puzzle.moves.split(' '),  // UCI to array
      rating: puzzle.rating
    }
  }
}
```

### Error Handling (Comprehensive)

```javascript
// ✅ GOOD: Try-catch with user-friendly messages
try {
  const user = await userService.authenticate(username, password)
  if (!user) {
    throw new Error('Invalid username or password')
  }
  return { success: true, data: user }
} catch (error) {
  console.error('Authentication failed:', error)
  return {
    success: false,
    error: 'Authentication failed. Please try again.'
  }
}

// ✅ GOOD: Async error handling
app.post('/api/puzzles/generate', async (c) => {
  try {
    const input = c.req.json()
    const validated = generatePuzzleSchema.parse(input)
    const puzzles = await puzzleService.generate(validated)
    return c.json({ success: true, data: puzzles })
  } catch (error) {
    if (error instanceof ValidationError) {
      return c.json({ success: false, error: error.message }, 400)
    }
    return c.json({ success: false, error: 'Internal error' }, 500)
  }
})
```

### Input Validation (Zod Schemas)

```javascript
import { z } from 'zod'

// ✅ GOOD: Validate all inputs
const createExerciseSchema = z.object({
  name: z.string().min(1).max(100),
  weekStart: z.string().refine(d => !isNaN(Date.parse(d))),
  puzzleIds: z.array(z.string()).min(1).max(50),
  filters: z.object({
    minRating: z.number().min(1200).max(3000),
    maxRating: z.number().min(1200).max(3000)
  }).optional()
})

// Route handler
app.post('/api/exercises', async (c) => {
  try {
    const input = await c.req.json()
    const validated = createExerciseSchema.parse(input)
    // Use validated data - guaranteed type-safe
    const exercise = await exerciseService.create(validated)
    return c.json({ success: true, data: exercise })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, 400)
    }
    return c.json({ success: false, error: 'Internal error' }, 500)
  }
})
```

### API Response Format (Consistent)

**All endpoints return:**
```javascript
{
  success: boolean,
  data?: T,
  error?: string,
  meta?: {
    total?: number,
    page?: number,
    limit?: number
  }
}
```

**Examples:**
```javascript
// Success with data
{ success: true, data: { id: 1, name: 'Exercise 1' } }

// Success with pagination
{
  success: true,
  data: [...],
  meta: { total: 100, page: 1, limit: 10 }
}

// Error
{ success: false, error: 'User not found' }

// Validation error
{
  success: false,
  error: 'Validation failed',
  details: [{ path: ['name'], message: 'Required' }]
}
```

### Middleware Pattern (HTTP Concerns)

```javascript
// ✅ GOOD: Middleware for cross-cutting concerns
const authMiddleware = (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }

  try {
    const user = authService.verifyToken(token)
    c.set('user', user)
  } catch (error) {
    return c.json({ success: false, error: 'Invalid token' }, 401)
  }

  return next()
}

// Register globally
app.use('*', authMiddleware)

// Or on specific routes
app.post('/api/exercises', authMiddleware, async (c) => {
  const user = c.get('user')
  // ...
})
```

### Role-Based Access Control

```javascript
// ✅ GOOD: Check role in middleware
const requireAdmin = (c, next) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ success: false, error: 'Forbidden' }, 403)
  }
  return next()
}

// Use in routes
app.post('/api/users', requireAdmin, async (c) => {
  // Only admins can access
})
```

### Client State Management (Closures)

```javascript
// ✅ GOOD: Encapsulated state in closure (client)
const createAppState = () => {
  let puzzles = []
  let currentExercise = null

  return {
    getPuzzles() {
      return [...puzzles]  // Return copy (immutable)
    },

    setPuzzles(newPuzzles) {
      puzzles = newPuzzles.map(p => ({ ...p }))  // Copy & update
    },

    getCurrentExercise() {
      return currentExercise ? { ...currentExercise } : null
    },

    setCurrentExercise(exercise) {
      currentExercise = exercise ? { ...exercise } : null
    }
  }
}

const appState = createAppState()
```

### Modal/Dialog Pattern (Client)

```javascript
// ✅ GOOD: Modal with close handler
class CreateExerciseDialog {
  constructor(container, onSubmit) {
    this.container = container
    this.onSubmit = onSubmit
  }

  open(initialData) {
    this.render(initialData)
    this.attachEventListeners()
  }

  close() {
    this.container.innerHTML = ''
  }

  attachEventListeners() {
    this.container.querySelector('.submit-btn')?.addEventListener('click', () => {
      const formData = this.getFormData()
      this.onSubmit(formData)
      this.close()
    })

    this.container.querySelector('.cancel-btn')?.addEventListener('click', () => {
      this.close()
    })
  }

  render(data) {
    // Render modal HTML
  }

  getFormData() {
    // Extract form values
  }
}
```

### Database Transaction Pattern

```javascript
// ✅ GOOD: Transactions for multi-step operations
function createStudentWithUser(studentData, userName, passwordHash) {
  try {
    const student = db.transaction(() => {
      const studentId = studentRepository.create(studentData)
      const user = userRepository.create({
        username: userName,
        passwordHash,
        studentId,
        role: 'student'
      })
      return { studentId, userId: user.id }
    })()

    return { success: true, data: student }
  } catch (error) {
    console.error('Failed to create student:', error)
    return { success: false, error: 'Failed to create student' }
  }
}
```

### UI Component Patterns (New 2026-03-28)

**Modern Table Pattern (ep-table)**
```html
<!-- ✅ GOOD: Styled table with hover, compact spacing -->
<div class="ep-table">
  <div class="ep-table-row ep-table-header">
    <div class="ep-table-cell">Name</div>
    <div class="ep-table-cell">Status</div>
    <div class="ep-table-cell">Actions</div>
  </div>
  <div class="ep-table-row">
    <div class="ep-table-cell">Exercise 1</div>
    <div class="ep-table-cell">Active</div>
    <div class="ep-table-cell">
      <div class="gd-dropdown">
        <button class="btn-outline btn-sm">...</button>
        <div class="dropdown-menu">
          <button>Edit</button>
          <button>Delete</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Dropdown Menus with Fixed Positioning**
```javascript
// ✅ GOOD: Fixed positioning to escape overflow containers
.gd-dropdown {
  position: relative;
}

.gd-dropdown .dropdown-menu {
  position: fixed;  // NOT absolute - breaks out of overflow: hidden
  top: 0;
  left: 0;
  background: white;
  border: 1px solid #ccc;
  z-index: 1000;
}
```

**Password Toggle Component**
```html
<!-- ✅ GOOD: Toggle show/hide password -->
<div class="password-input-wrap">
  <input type="password" id="pw" name="password" />
  <button class="password-toggle" aria-label="Show password">👁️</button>
</div>

<style>
.password-toggle {
  cursor: pointer;
  border: none;
  background: none;
}

.password-toggle.visible ~ input {
  /* When active, input type changes to text */
}
</style>
```

**Styled Button Classes**
```css
/* ✅ GOOD: Semantic button classes */
.btn-primary {
  background: #007bff;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
}

.btn-outline {
  background: transparent;
  border: 1px solid #999;
  color: #333;
  padding: 6px 12px;
}

.btn-sm {
  font-size: 12px;
  padding: 4px 8px;
}

/* Usage: <button class="btn-outline btn-sm">Delete</button> */
```

## Naming Conventions

### Variables & Functions

```javascript
// ✅ GOOD: Descriptive, self-documenting
const maxRating = 3000
const minPopularity = 85
const puzzlesByTheme = new Map()

function validatePuzzleInput(fen, moves) { }
function calculateStudentScore(results) { }
function convertUCItoSAN(uciMove, board) { }

// ❌ AVOID: Ambiguous, unclear
const max = 3000
const min = 85
const data = new Map()

function validate(x, y) { }
function calc(r) { }
function convert(m, b) { }
```

### Boolean Variables

```javascript
// ✅ GOOD: Prefix with is/has/should/can
const isAdmin = user.role === 'admin'
const hasErrors = errors.length > 0
const shouldRefresh = token.isExpired()
const canGradeExercise = user.role === 'admin'

// ❌ AVOID: Unclear boolean intent
const admin = true
const errors = true
const refresh = true
```

### Constants

```javascript
// ✅ GOOD: UPPER_SNAKE_CASE for constants
const DEFAULT_RATING_RANGE = { min: 1200, max: 2400 }
const MIN_PUZZLE_COUNT = 1
const MAX_PUZZLE_COUNT = 50
const JWT_ACCESS_EXPIRY = '15m'
const JWT_REFRESH_EXPIRY = '7d'
```

## Comments & Documentation

### JSDoc for Public Functions

```javascript
/**
 * Generate chess puzzles by theme with optional rating filter.
 * @param {string} theme - Lichess theme tag (e.g., 'backRankMate')
 * @param {number} count - Number of puzzles (1-50)
 * @param {object} options - Optional filters
 * @param {number} options.minRating - Minimum puzzle rating
 * @param {number} options.maxRating - Maximum puzzle rating
 * @returns {Promise<Array>} Array of puzzle objects
 * @throws {Error} If theme not found or count out of range
 */
async function generatePuzzles(theme, count, options = {}) {
  // Implementation
}
```

### Inline Comments for Complex Logic

```javascript
// ✅ GOOD: Explain WHY, not WHAT
function calculateGrade(results) {
  // Use weighted average: recent attempts weigh more
  const weights = results.map((_, i) => i + 1)
  const weighted = results.reduce((sum, result, i) => {
    return sum + (result.score * weights[i])
  }, 0)
  return weighted / weights.reduce((a, b) => a + b)
}

// ❌ AVOID: Obvious comments
function calculateGrade(results) {
  // Add all results
  const weights = results.map((_, i) => i + 1)
  // Calculate weighted sum
  const weighted = results.reduce((sum, result, i) => {
    return sum + (result.score * weights[i])
  }, 0)
  // Return average
  return weighted / weights.reduce((a, b) => a + b)
}
```

## Security

### No Hardcoded Secrets

```javascript
// ❌ WRONG: Hardcoded secret
const jwtSecret = 'super-secret-key-12345'

// ✅ CORRECT: From environment
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  throw new Error('JWT_SECRET not configured')
}
```

### Input Sanitization

```javascript
// ✅ GOOD: Validate and sanitize
function createExercise(name, description) {
  // Validate length
  if (name.length > 100) {
    throw new Error('Name too long')
  }

  // Remove HTML tags (no eval)
  const safeName = name.replace(/<[^>]*>/g, '')
  const safeDesc = description.replace(/<[^>]*>/g, '')

  return { name: safeName, description: safeDesc }
}
```

### Parameterized Queries (No SQL Injection)

```javascript
// ✅ CORRECT: Parameterized query
const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND role = ?')
const user = stmt.get(username, 'admin')

// ❌ WRONG: String concatenation (SQL injection risk)
const query = `SELECT * FROM users WHERE username = '${username}'`
const user = db.exec(query)
```

### Password Hashing

```javascript
// ✅ GOOD: Use bcrypt (10 rounds)
const passwordHash = await bcrypt.hash(password, 10)

// ✅ GOOD: Verify password
const isValid = await bcrypt.compare(inputPassword, passwordHash)

// ❌ AVOID: Plain text or weak hashing
const passwordHash = password  // NO!
const passwordHash = crypto.md5(password)  // Weak
```

## Testing Standards

### Test Structure

```javascript
// ✅ GOOD: Clear test organization
describe('PuzzleValidator', () => {
  describe('validateFEN', () => {
    it('should accept valid FEN string', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      const result = validator.validateFEN(fen)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid FEN', () => {
      const fen = 'invalid fen'
      const result = validator.validateFEN(fen)
      expect(result.valid).toBe(false)
    })
  })
})
```

### Code Coverage Target

- **Minimum**: 80% coverage
- **Units**: Functions, utilities, services
- **Integration**: API endpoints, database operations
- **E2E**: Critical user flows (Playwright)

## Performance Guidelines

| Guideline | Target | Status |
|-----------|--------|--------|
| Puzzle generation | <2s for 50 puzzles | ✅ Achieved |
| PDF generation | <5s | ✅ Achieved (~2s) |
| API response time | <100ms | ✅ Achieved |
| Database query | <50ms | ✅ Achieved |
| Client render | <100ms | ✅ Achieved |
| Build time | <30s | ✅ Achieved |

## Version Control

### Commit Message Format

```
<type>: <description>

<optional body>

<optional footer>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

**Examples:**
```
feat: Add puzzle blocking feature

Students can now report problematic puzzles. Teachers can review
and dismiss or block reports. Blocked puzzles excluded from generation.

Closes #42
```

```
fix: Correct SAN notation for castling moves

UCI k-side castle (e1g1) now converts to O-O in SAN format.

Fixes #38
```

## Code Review Checklist

- [ ] Code follows naming conventions
- [ ] Functions are <50 lines
- [ ] Files are <800 lines
- [ ] No mutations (immutable patterns)
- [ ] Error handling present
- [ ] Input validation (Zod schemas)
- [ ] No hardcoded secrets
- [ ] No console.log statements
- [ ] JSDoc for public functions
- [ ] Tests included (80%+ coverage)
- [ ] No SQL injection risk
- [ ] No XSS vulnerabilities
