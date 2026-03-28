# PWA with Offline Puzzle Progress

**Goal:** Make Chess Trainer installable as a PWA. Save puzzle-solving progress offline and sync when connection restores. Zero data loss.

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | PWA Manifest + Service Worker | Pending | Medium |
| 2 | Offline Progress Storage | Pending | Medium |
| 3 | Sync Queue + Auto-Recovery | Pending | Medium |

## Architecture Overview

```
Student solves puzzle
  → Save to IndexedDB immediately (local-first)
  → Try API call
    → Success: mark synced in IndexedDB
    → Fail (offline): queue for retry
  → On reconnect: flush sync queue to server
  → On next app load: check for unsynced data
```

## Key Design Decisions

1. **IndexedDB over localStorage** — structured data, larger storage, works in service workers
2. **Local-first** — always save locally BEFORE API call (never lose data)
3. **Manual sync queue** — Background Sync API not supported on Safari iOS, so we use `navigator.onLine` + periodic retry
4. **vite-plugin-pwa** — generates service worker and manifest automatically from Vite config
5. **Cache strategy** — Shell (HTML/CSS/JS) cached with stale-while-revalidate; API responses NOT cached (always live)

## Phase Details

See individual phase files for implementation steps.
