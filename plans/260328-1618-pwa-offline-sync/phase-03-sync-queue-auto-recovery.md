# Phase 3: Sync Queue + Auto-Recovery

## Overview
- Priority: High
- Status: Pending
- Effort: Medium
- Depends on: Phase 2

## New Files
- `packages/client/src/shared/sync-manager.js` — sync queue processor with retry logic

## Modified Files
- `packages/client/src/api/ApiClient.js` — wrap PUT/POST calls with offline-aware error handling
- `packages/client/src/index.js` — initialize sync manager on app start
- `packages/client/src/auth/StudentDashboard.js` — show sync status indicator

## Sync Strategy

### Why not Background Sync API?
Safari iOS does not support Background Sync. Since students use iPads/iPhones, we need a cross-browser approach.

### Manual Sync Queue
```
Online event fires → flushSyncQueue()
App opens → flushSyncQueue()
Periodic check (every 30s if queue non-empty) → flushSyncQueue()
```

### Conflict Resolution
- **Last-write-wins** — offline data overwrites server (student's latest attempt is most recent)
- Server rejects if `is_final=1` — sync fails gracefully, notify student
- No merge needed — puzzle_results is a complete snapshot, not incremental

## Implementation: sync-manager.js

```javascript
class SyncManager {
  constructor(offlineStorage) { ... }

  // Start listening for online/offline events
  initialize() {
    window.addEventListener('online', () => this.flush())
    window.addEventListener('offline', () => this.showOfflineBanner())
    // Flush on startup
    this.flush()
  }

  // Process all queued requests
  async flush() {
    const queue = await offlineStorage.getSyncQueue()
    for (const item of queue) {
      try {
        await fetch(item.url, { method: item.method, body: JSON.stringify(item.body), headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } })
        await offlineStorage.clearSyncQueueItem(item.id)
        await offlineStorage.markSynced(item.body.studentExerciseId)
      } catch {
        item.retryCount++
        if (item.retryCount > 5) {
          // Give up after 5 retries, keep in queue for manual retry
          break
        }
      }
    }
    this.updateSyncBadge()
  }

  // Show count of unsynced items
  updateSyncBadge() { ... }
}
```

## UI Indicators

### Offline Banner
- Appears when `navigator.onLine === false`
- Yellow bar at top: "You're offline. Progress is saved locally."
- Disappears when back online

### Sync Status
- Small badge on student nav: "2 unsaved" (count of unsynced items)
- Auto-clears when flush succeeds
- Click to manually trigger sync

### Toast Messages
- "Saved offline" — when API fails but IndexedDB succeeds
- "Progress synced" — when flush completes successfully
- "Sync failed" — after 5 retries

## Implementation Steps

- [ ] Create sync-manager.js with queue processor
- [ ] Add online/offline event listeners
- [ ] Wrap ApiClient.saveStudentAttempt with offline fallback
- [ ] Add offline banner component
- [ ] Add sync badge to student nav
- [ ] Initialize sync manager in app startup
- [ ] Test: solve puzzles offline → go online → verify sync
- [ ] Handle auth token expiry during sync (re-auth if needed)

## Edge Cases
- **Tab closed while offline** — data persists in IndexedDB, syncs on next visit
- **Multiple tabs** — IndexedDB is shared, sync manager uses transaction locks
- **Token expired during offline** — sync fails, student must re-login, data preserved in IndexedDB
- **Server rejects (is_final)** — remove from queue, show error toast
- **Very slow connection** — API call times out → queued like offline

## Success Criteria
- [ ] Solving puzzles offline saves locally
- [ ] Data syncs automatically when connection restores
- [ ] No data loss even if app is closed while offline
- [ ] Visual feedback for offline/online state
- [ ] Works on Safari iOS + Chrome Android
