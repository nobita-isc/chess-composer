# Phase 04 — Selection Persistence + Deep Links

## Context Links

- Scout § 6: `plans/reports/scout-260503-course-mgmt-ux.md` lines 121-141
- Phases 1–3 (selection state model, content list, puzzle composer round-trip)

## Overview

**Priority:** P2 (polish, but high user value per scout)
**Status:** completed
**Effort:** Small (~½ day)
**Depends on:** Phases 1–3

Persist `{ courseId, lessonId, scrollY }` so reload / Puzzle Composer return / browser back-button restores context. Add URL-hash deep links so admins can share "edit this lesson" links.

## Key Insights

- localStorage already used in `lesson-player.js:101-103` for splitter sizes — same pattern.
- URL hash (`#/courses/12/lessons/45`) > query params: doesn't trigger server reload, easy to parse.
- Hash takes precedence over localStorage on initial load (explicit > implicit).

## Requirements

**Functional**
- On selection change: write `{ courseId, lessonId }` to localStorage AND update URL hash.
- On page load: parse hash first; fall back to localStorage; fall back to "no selection".
- On Puzzle Composer close: restore lesson-content-list scroll position.
- Browser back/forward navigates between selections (popstate listener).

**Non-functional**
- Hash updates do not push history entry per keystroke — only on selection change.
- Invalid IDs in hash gracefully clear selection (don't 500 the UI).

## Architecture

```
shared/selection-store.js
├── read()    — { courseId, lessonId } from hash || localStorage || null
├── write(s)  — localStorage + hash (replaceState)
└── onChange(cb) — popstate + storage event listener
```

Orchestrator (`CourseManagementPage.js`) uses store as the single source of truth for selection.

## Related Code Files

**Modify**
- `packages/client/src/lessons/CourseManagementPage.js` — replace in-memory `selection` state with `selection-store.js` read/write.
- `packages/client/src/lessons/lesson-content-list.js` — save/restore scroll on unmount/mount.
- `packages/client/src/lessons/puzzle-composer.js` — on close, call list's restore-scroll callback (or rely on list mount restore).

**Create**
- `packages/client/src/lessons/shared/selection-store.js` (~80 lines)

## Implementation Steps

1. Build `selection-store.js`. Hash format: `#/courses/<id>/lessons/<id>` (lessonId optional).
2. Validate IDs are numeric on parse; invalid → return null and `replaceState` to clean URL.
3. Wire orchestrator: initial render reads store; selection setter writes store + triggers re-render.
4. Add popstate listener — browser back/forward updates selection.
5. lesson-content-list: on mount restore `cm-scroll-<lessonId>` from sessionStorage; on unmount save current scroll.
6. Puzzle Composer round-trip: rely on list mount to auto-restore (sessionStorage survives the route).
7. Manual test: select lesson → reload → restored. Edit puzzle → close composer → scroll position restored. Open URL with hash in new tab → correct selection.

## Todo List

- [x] selection-store.js with hash + localStorage
- [x] Wire orchestrator
- [x] popstate listener
- [x] Scroll save/restore in lesson-content-list
- [x] Invalid-ID graceful fallback
- [x] Manual test all restore paths

## Success Criteria

- Reload preserves selection within ±0 lessons (exact restore).
- Closing Puzzle Composer returns to same scroll position.
- Browser back button moves between recent selections.
- Sharing URL with hash opens to correct course+lesson for another admin.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Storage event triggers infinite update loop | Compare incoming value to current before writing |
| Stale hash referencing deleted lesson | Validate via API on load; clear hash if 404 |
| sessionStorage scroll grows unbounded | Cap to last 20 lessons (LRU); cleanup on save |

## Security Considerations

- Hash IDs are user-controlled — never `eval` or interpolate into SQL. Already passed as numeric params to API.
- No PII in localStorage.

## Next Steps

→ Plan complete. Suggested follow-ups (separate plans):
- Drag-to-reorder lessons / content items.
- Modules layer (course → module → lesson) if product needs hierarchical grouping.
- Multi-challenge puzzle composer redesign.
