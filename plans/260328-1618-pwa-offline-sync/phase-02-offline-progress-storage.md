# Phase 2: Offline Progress Storage (IndexedDB)

## Overview
- Priority: High
- Status: Pending
- Effort: Medium
- Depends on: Phase 1

## New Files
- `packages/client/src/shared/offline-storage.js` — IndexedDB wrapper for puzzle progress

## Modified Files
- `packages/client/src/exercises/ExercisePuzzleViewer.js` — save progress locally on each puzzle solve
- `packages/client/src/auth/StudentDashboard.js` — load cached data when offline

## IndexedDB Schema

**Database:** `chess-trainer-offline`
**Version:** 1

### Object Stores

#### `puzzle-progress`
Stores per-exercise solving progress for offline recovery.

```javascript
{
  key: studentExerciseId, // primary key
  exerciseId: string,
  studentId: string,
  puzzleResults: string,  // "1,0,1,,0"
  puzzleHints: string,    // "0,1,0,,0"
  score: number,
  totalPuzzles: number,
  lastUpdated: timestamp,
  synced: boolean         // false = needs sync to server
}
```

#### `sync-queue`
Failed API calls queued for retry.

```javascript
{
  key: autoIncrement,
  url: string,            // "/student-exercises/:id/attempt"
  method: string,         // "PUT"
  body: object,           // { score, puzzleResults, puzzleHints }
  timestamp: number,
  retryCount: number
}
```

## Implementation: offline-storage.js

```javascript
// Key API:
openDB()                           // init IndexedDB
saveProgress(data)                  // upsert to puzzle-progress store
getProgress(studentExerciseId)      // read cached progress
getAllUnsynced()                     // get records where synced=false
markSynced(studentExerciseId)       // set synced=true after API success
addToSyncQueue(request)             // queue failed API call
getSyncQueue()                      // get all queued requests
clearSyncQueueItem(id)              // remove after successful replay
```

## Integration Points

### ExercisePuzzleViewer (grading mode)
After each correct/wrong button click:
1. Save to IndexedDB first (instant, never fails)
2. Try API call
3. If API fails → add to sync queue, show "Saved offline" toast

### StudentDashboard (puzzle solving)
On launch:
1. Check IndexedDB for cached progress
2. If exists and `synced: false` → show banner "You have unsaved progress"
3. Load exercise with cached results pre-filled

## Implementation Steps

- [ ] Create offline-storage.js with IndexedDB wrapper
- [ ] Add saveProgress() call in grading flow
- [ ] Add getProgress() call on exercise load
- [ ] Show "Saved offline" indicator when API fails
- [ ] Handle IndexedDB not available (fallback to memory-only)

## Success Criteria
- [ ] Puzzle progress saved to IndexedDB on each action
- [ ] Progress survives page refresh
- [ ] Progress survives app close/reopen
- [ ] Works when navigator.onLine is false
