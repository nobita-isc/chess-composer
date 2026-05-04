# Phase 5 — Markdown Description Editor

## Context Links
- `packages/client/src/lessons/lesson-meta-editor.js`
- `packages/client/src/shared/safe-markdown.js`
- `packages/client/src/lessons/lesson-player.js` (verify lesson description rendering)

## Overview
- Priority: P3
- Status: ✅ completed
- Effort: 4h actual
- Convert plain description textarea into split-tab markdown editor; render markdown in player.

## Key Insights
- DB schema unchanged — `description` stays TEXT; markdown is just convention.
- `safe-markdown.js` already sanitizes; reuse verbatim.
- No toolbar yet (deferred).

## Requirements
**Functional**
- Above description textarea, add tab pills `[Edit] [Preview]`.
- Edit tab: existing textarea (monospace font; min-height bumped).
- Preview tab: rendered HTML via `safe-markdown.js`.
- Subtle hint: "Markdown supported — bold, lists, links".
- Player renders description as markdown (audit + update if needed).

**Non-functional**
- No schema migration.
- No new dependencies.
- File ≤200 lines after change; if exceeds, extract a `markdown-tab-editor.js` component.

## Architecture
```
lesson-meta-editor.js
  └─ description block
       ├─ [Edit][Preview] tabs
       ├─ tab=edit  → <textarea> (existing path, debounced save)
       └─ tab=preview → <div>safeMarkdown(value)</div>

lesson-player.js
  └─ description render → safeMarkdown(value)
```

## Related Code Files
**Modify**
- `packages/client/src/lessons/lesson-meta-editor.js`
- `packages/client/src/lessons/lesson-player.js` (description block — audit first)

**Create (only if size pressure)**
- `packages/client/src/lessons/markdown-tab-editor.js` (extracted reusable component)

## Implementation Steps
1. Audit current player description render path; note whether plain text or HTML.
2. In `lesson-meta-editor.js`:
   - Add tab pills above description textarea; default `Edit`.
   - Local state: `descTab = 'edit'|'preview'`.
   - Preview pane: render `safeMarkdown(currentValue)` inside same-sized container.
   - Add hint line below.
   - Switching tabs preserves current input value (no save trigger needed — switching is local UI).
3. Update player to render description with `safe-markdown.js`.
4. Verify autosave flow unaffected (tab switch must not dispatch input event).
5. If `lesson-meta-editor.js` exceeds 200 lines, extract `markdown-tab-editor.js`.

## Todo List
- [x] Tab pills + state added
- [x] Preview rendering wired to safe-markdown
- [x] Hint text shown
- [x] Player description rendered as markdown
- [x] No regressions in autosave/manual-save (Phase 4 still works)
- [x] File size budget respected

## Success Criteria
- Admin can write `**bold**` and see it bolded in Preview and on player.
- Plain text content unchanged in render (markdown gracefully degrades).
- Existing 595 tests still green.

## Risk Assessment
- Existing descriptions written as plain text containing characters that look markdown-ish (e.g., `*`, `#`) — render may surprise authors. Acceptable; document in hint.
- HTML injection — mitigated by `safe-markdown.js` sanitization (assumed correct; verify it strips raw `<script>`).

## Security Considerations
- XSS via markdown: rely on `safe-markdown.js`. If any doubt, audit it strips: raw HTML, `javascript:` URLs in links, event handler attributes.
- No new endpoints; no new auth surface.

## Next Steps
- Future: minimal toolbar (B / I / link / list buttons inserting boilerplate at cursor).
