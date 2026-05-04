# Code Review — Puzzle Composer Redesign

**Date:** 2026-03-28
**Branch:** feature/chess-lessons-platform
**Reviewer:** code-reviewer agent

---

## Scope

| File | LOC | Status |
|------|-----|--------|
| `packages/server/src/database/migrations/008_add_puzzle_composer_fields.js` | 24 | New |
| `packages/client/src/lessons/puzzle-composer.js` | 444 | New |
| `packages/client/src/lessons/lesson-puzzle-player.js` | 374 | New |
| `packages/server/src/index.js` | 165 | Modified |
| `packages/server/src/lessons/CourseRepository.js` | 297 | Modified |
| `packages/client/src/lessons/lesson-content-editor.js` | 319 | Modified |
| `packages/client/src/lessons/lesson-player.js` | 231 | Modified |

Total: ~1,854 LOC reviewed

---

## Overall Assessment

Solid feature delivery. The chess.com-style composer/player pattern is well-structured. XSS protection via `escapeHtml` is applied consistently in HTML-injected strings. Immutable patterns are followed in move sequence updates. The main concerns are: a SQL injection vector in `updateContent`, missing server-side validation of FEN/moves, a wrong-move race condition in the puzzle player, and several file-size violations.

---

## Critical Issues

### 1. SQL Injection via Dynamic Column Names — `CourseRepository.updateContent`

**File:** `packages/server/src/lessons/CourseRepository.js` lines 124–137

`updateContent` iterates `Object.entries(data)` and builds column names directly from keys:

```js
for (const [key, val] of Object.entries(data)) {
  if (['id', 'lesson_id', 'created_at'].includes(key)) continue
  fields.push(`${key} = ?`)   // ← key injected raw into SQL
  values.push(...)
}
```

An attacker (or a bug) supplying `{ "title; DROP TABLE lesson_content;--": "x" }` would corrupt the query. The route is `requireRole('admin')`, which limits surface area, but the pattern is unsafe and will silently accept arbitrary column names.

**Fix:** Allowlist valid column names:
```js
const ALLOWED_COLUMNS = new Set([
  'title', 'video_url', 'file_path', 'file_size', 'duration_min',
  'puzzle_id', 'puzzle_fen', 'puzzle_moves', 'quiz_data', 'xp_reward',
  'puzzle_instruction', 'puzzle_hints', 'puzzle_video_url', 'order_index'
])

for (const [key, val] of Object.entries(data)) {
  if (!ALLOWED_COLUMNS.has(key)) continue
  ...
}
```

---

## High Priority

### 2. Wrong-Move Race Condition in Puzzle Player

**File:** `packages/client/src/lessons/lesson-puzzle-player.js` lines 117–148

When the student plays a wrong move, `chess.undo()` is called, but `boardInstance.set()` only restores the FEN — it does not re-attach the `after` handler:

```js
boardInstance.set({
  fen: chess.fen(),
  turnColor: chess.turn() === 'w' ? 'white' : 'black',
  movable: { dests: getLegalMoves(chess) }   // ← missing events: { after: handleStudentMove }
})
```

Chessground's `movable.events` is not inherited from init when only `movable.dests` is set in a partial update. After a wrong move, the board becomes unresponsive — no further student moves are possible.

**Fix:**
```js
boardInstance.set({
  fen: chess.fen(),
  turnColor: chess.turn() === 'w' ? 'white' : 'black',
  movable: {
    free: false,
    color: playerColor === 'w' ? 'white' : 'black',
    dests: getLegalMoves(chess),
    events: { after: handleStudentMove }   // restore handler
  }
})
```

### 3. No Server-Side FEN / Moves Validation

**File:** `packages/server/src/routes/lesson-content.js` lines 52–64

The `POST /lessons/:id/content` route validates `content_type` and `title` but does not validate `puzzle_fen` or `puzzle_moves`. Malformed FEN strings are silently stored and will crash the Chess.js parse on the client later (silently caught, falling back to `new Chess()` starting position).

**Fix:** Add server-side validation for puzzle content:
```js
if (data.content_type === 'puzzle' && data.puzzle_fen) {
  try { new Chess(data.puzzle_fen) }
  catch { return c.json({ success: false, error: 'Invalid FEN position' }, 400) }
}
```
Same pattern for `PUT /content/:id`.

### 4. `puzzle_hints` Size Not Bounded — Potential Payload Bloat

`puzzle_hints` is stored as raw JSON text in SQLite without length limit. A composer could generate a hints array with thousands of entries or very long hint strings. Add a server-side check:

```js
if (hintsJson && hintsJson.length > 50000) {
  return c.json({ success: false, error: 'puzzle_hints payload too large' }, 400)
}
```

### 5. File-Size Violations

Per project rules: files should stay under 200 lines (hard max 800).

| File | LOC | Excess |
|------|-----|--------|
| `puzzle-composer.js` | 444 | Over 200 |
| `lesson-puzzle-player.js` | 374 | Over 200 |
| `lesson-content-editor.js` | 319 | Over 200 |

`puzzle-composer.js` should be split: the `buildComposerHTML` function (100+ lines of template literal) belongs in `puzzle-composer-html.js`, and the event-wiring functions could move to `puzzle-composer-events.js`.

`lesson-puzzle-player.js` should extract `buildPlayerHTML` and the move-handling logic into separate modules.

---

## Medium Priority

### 6. `handleStudentMove` Does Not Handle Promotion Choices

**File:** `packages/client/src/lessons/lesson-puzzle-player.js` line 122

```js
const result = chess.move({ from, to, promotion: 'q' })
```

Promotion is hardcoded to queen. This is acceptable for most puzzles, but if the expected solution is an underpromotion (e.g. `promotion: 'r'`), the student's queen promotion will not match `currentMoveData.move` (which contains the SAN from the hints array, potentially `=R`). The puzzle will be unsolvable.

**Fix:** Compare by `from`/`to` (UCI) rather than SAN when promotion is involved, or detect if expected move is a promotion and prompt the student.

### 7. `parseMoveSequence` Duplicated in Two Files

Identical logic exists in both `puzzle-composer.js` (lines 23–45) and `lesson-puzzle-player.js` (lines 62–73). This violates DRY.

**Fix:** Extract to a shared utility:
```
packages/client/src/lessons/puzzle-move-sequence-parser.js
```
Export `parseMoveSequence(movesStr, fenOrChess)` and import in both files.

### 8. `escapeHtml` Duplicated Across Four Files

`puzzle-composer.js`, `lesson-puzzle-player.js`, `lesson-content-editor.js`, and `lesson-player.js` all define the same `escapeHtml` function. Should be in `packages/client/src/shared/escape-html.js` and imported.

### 9. `getItemDetail` Unsafe JSON Parse

**File:** `packages/client/src/lessons/lesson-content-editor.js` line 149

```js
if (item.content_type === 'quiz') return item.quiz_data ? `${JSON.parse(item.quiz_data).length} questions` : '...'
```

If `quiz_data` is malformed JSON, this throws uncaught and crashes `render()`, replacing the whole content list with an error. Wrap with try/catch.

### 10. Dead Comment in `lesson-content.js`

**File:** `packages/server/src/routes/lesson-content.js` line 190

```js
const content = courseRepository.findContentByLesson ? null : null // lookup via direct query
```

This line does nothing (always evaluates to `null`). `xpReward` falls through to `body.xp_earned || 10`, bypassing the content's actual `xp_reward`. Remove dead code and look up the content item to use its authoritative XP value, preventing clients from supplying arbitrary XP values.

### 11. `openVideo` Opens Unvalidated URL

**File:** `packages/client/src/lessons/lesson-puzzle-player.js` line 276–278

```js
function openVideo() {
  const url = item.puzzle_video_url
  if (url) window.open(url, '_blank')
}
```

`puzzle_video_url` is stored as provided. If an admin accidentally or maliciously stores `javascript:alert(1)`, `window.open` will execute it. Add a URL scheme check:
```js
if (url && (url.startsWith('https://') || url.startsWith('http://'))) window.open(url, '_blank')
```

---

## Low Priority

### 12. `initBoard` Called Before `populateFromExisting` Updates FEN

**File:** `packages/client/src/lessons/puzzle-composer.js` lines 103–109

`initBoard(overlay)` renders the board from `chess` state, then `populateFromExisting` calls `refreshBoard()` which updates it. This causes a brief flash of the default starting position before the actual puzzle FEN renders. Reorder: populate fields first, then init board with the correct FEN already in the input.

### 13. Move-Count Label in Toolbar Is Static

**File:** `puzzle-composer.js` `buildComposerHTML` line 435

The label `${moveSequence.length > 0 ? '...' : '...'}` is rendered once in `buildComposerHTML`. After the user parses moves or adds/removes moves, this label is never updated. It always shows the count at open time.

**Fix:** Update the label in `renderMoveSequence`:
```js
overlay.querySelector('.pc-move-count').textContent = moveSequence.length > 0
  ? `${moveSequence.length} moves configured` : 'No moves configured yet'
```
Add class `pc-move-count` to the element.

### 14. `migration 008` Uses `console.log`

Per code quality rules, `console.log` should be avoided in production code. The migration file line 22 logs directly. This is consistent with other migrations in the project but worth noting.

---

## Edge Cases Found by Scout

- **Puzzle with zero moves:** `moveSequence.length === 0` in the player causes `playComputerMoves()` to call `completePuzzle()` immediately on load. The puzzle appears solved without any student interaction. Guard: if `moveSequence.length === 0`, disable the board and show "No moves configured."

- **FEN parse fallback to starting position:** Both composer and player silently fall back to `new Chess()` (starting position) if `puzzle_fen` is invalid. In the player this is disorienting — the student sees a starting position board, not the intended puzzle. Should surface an error state rather than silently falling back.

- **Computer move chain with invalid SAN:** In `playComputerMoves`, if `chess.move(nextMove.move)` throws, the catch calls `completePuzzle()` (line 186). This marks the puzzle as solved even though it failed. Should show an error and keep the puzzle in an incomplete state.

- **`onNext` / `onPrev` with `setTimeout` click**: In `lesson-player.js` lines 142/150, `setTimeout(() => overlay.querySelector('#lp-solve')?.click(), 100)` relies on the DOM re-rendering within 100ms. On slow devices or large lesson content, `#lp-solve` may not exist yet. Use a callback-based approach or `requestAnimationFrame`.

- **`reorderContent` uses forEach (mutation):** `CourseRepository.reorderContent` (line 147) uses `forEach` to run prepared-statement mutations. This is correct (using a single prepared statement), but the approach is fine for SQLite since `better-sqlite3` is synchronous.

---

## Positive Observations

- `escapeHtml` applied consistently to all user-provided content rendered into HTML — XSS attack surface is properly managed.
- Immutable update pattern (`moveSequence.map(...)`) correctly used in `renderMoveSequence` and the remove handler.
- Migration uses `try/catch` with duplicate-column guard — safe for re-runs.
- `parseMoveSequence` stops on invalid SAN rather than throwing, keeping composer robust.
- `enableStudentMove` correctly prevents the player from moving during computer turns via `movable.color`.
- Server-side `requireRole('admin')` applied to all write routes for lesson content.
- `puzzle_hints` JSON serialization handled in `createContent` regardless of whether input is already a string or object.

---

## Recommended Actions (Prioritized)

1. **[CRITICAL]** Add column allowlist in `CourseRepository.updateContent` — prevents SQL injection.
2. **[HIGH]** Fix wrong-move handler in `lesson-puzzle-player.js` — restores `events.after` on error reset.
3. **[HIGH]** Add server-side FEN validation in `lesson-content.js` POST/PUT puzzle routes.
4. **[HIGH]** Fix dead-code XP lookup in `/my/content/:id/complete` — clients should not set their own XP.
5. **[MEDIUM]** Fix `openVideo` URL scheme check.
6. **[MEDIUM]** Add try/catch around `JSON.parse(item.quiz_data)` in `getItemDetail`.
7. **[MEDIUM]** Extract `parseMoveSequence` and `escapeHtml` into shared modules.
8. **[MEDIUM]** Guard zero-move puzzle in player — don't auto-complete.
9. **[MEDIUM]** Guard computer-move failure — don't call `completePuzzle` on SAN parse error.
10. **[LOW]** Split oversized files (`puzzle-composer.js`, `lesson-puzzle-player.js`) per 200-line rule.

---

## Metrics

- Type Coverage: N/A (vanilla JS)
- Test Coverage: Not assessed (no test files for these modules observed)
- Linting Issues: No syntax errors found; `console.log` in migration (consistent with project pattern)
- Files over 200-line limit: 3 of 7

---

## Unresolved Questions

1. Is underpromotion possible in any planned puzzles? If so, the hardcoded `promotion: 'q'` in the player needs addressing before launch.
2. Should `puzzle_video_url` support local uploads (like video content does) or only external URLs? The current UI only shows a text input, but no validation prevents non-URL values.
3. The `/my/content/:id/complete` route does not verify the student is actually enrolled in the course containing the content — is enrollment-level authorization intentional or an oversight?
