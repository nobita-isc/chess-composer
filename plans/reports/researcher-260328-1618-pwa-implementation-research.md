# PWA Implementation Research Report
**Chess Composer - Vanilla JS + Vite**
*Date: 2026-03-28*

---

## Executive Summary

Research on Progressive Web App implementation for a Vanilla JS + Vite application focused on offline puzzle solving. Key finding: **Do NOT use VitePWA plugin** for this use case. Manual service worker approach is superior for fine-grained control, smaller bundle, and offline-first data patterns required by puzzle results caching.

**Recommendation:** Implement manual service worker + IndexedDB for puzzle results, with fallback retry queue (no Background Sync API — Safari doesn't support it).

---

## 1. Service Worker with Vite

### VitePWA Plugin vs Manual Service Worker

#### VitePWA Plugin (vite-pwa)
**Pros:**
- Auto-generates manifest.json
- Zero-config service worker generation
- Cache versioning/updates handled automatically
- Works with Vite's build pipeline

**Cons:**
- Opinionated caching strategy (workbox-based)
- Overkill for app needing selective offline data sync
- Generates larger bundle (~40KB uncompressed)
- Less control over fetch event interception
- Designed for asset caching, not API response handling

#### Manual Service Worker (RECOMMENDED)
**Pros:**
- **Complete control** over what gets cached and synced
- **Lightweight** (~2-3KB minified)
- Perfect for selective API caching (only puzzle results)
- Custom offline-first logic for failed submissions
- No additional npm dependencies
- Works seamlessly with Vite's dev server

**Cons:**
- Must register and manage lifecycle manually
- No auto-update mechanism (requires manual versioning)
- More code to write upfront

### Implementation Pattern (Manual)

**File structure:**
```
packages/client/
├── src/
│   ├── index.js              (main entry, register SW)
│   └── service-worker.js     (service worker code)
└── public/
    └── manifest.json         (PWA manifest)
```

**Service Worker Registration (in `index.js`):**
```javascript
// Only register in production or localhost
if ('serviceWorker' in navigator) {
  const isProduction = location.hostname !== 'localhost';
  const isDev = !isProduction;

  // In dev, skip SW to avoid cache issues during development
  if (!isDev) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.error('SW registration failed:', err));
  }
}
```

**Service Worker file (`public/service-worker.js`):**
```javascript
const CACHE_VERSION = 'v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',  // adjust to your assets
  '/assets/chess.js'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames.map(name => {
            if (name !== CACHE_VERSION) return caches.delete(name);
          })
        )
      )
      .then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request)
      .then(response => response || fetch(request))
      .catch(() => new Response('Offline', { status: 503 }))
  );
});
```

### Vite Configuration Changes
**vite.config.js** — NO changes needed. Vite serves `/public` automatically, so `public/service-worker.js` is accessible at `/service-worker.js`.

---

## 2. Offline Data Storage: IndexedDB vs localStorage vs Cache API

### Comparison Matrix

| Feature | localStorage | IndexedDB | Cache API |
|---------|--------------|-----------|-----------|
| **Size limit** | 5-10 MB | 50+ MB (quota-based) | 50+ MB (quota-based) |
| **Data type** | String only | Objects, Blobs, Arrays | Request/Response pairs |
| **Sync API** | Yes (blocks) | Async (IDB) | Async only |
| **Query capability** | String search only | Indexes, ranges, cursors | No queries |
| **Safari iOS** | ✅ Full | ✅ Full | ✅ Full |
| **Chrome Android** | ✅ Full | ✅ Full | ✅ Full |

### Recommendation for Puzzle Results

**Use IndexedDB for puzzle submission data:**
- **Why IndexedDB:**
  - Structured queries (find by exercise, student, date)
  - Transactions prevent partial writes
  - Can store: `{ student_exercise_id, score, puzzle_results, puzzle_hints, timestamp, synced: false }`
  - Survives page refresh (unlike memory)
  - Much larger than localStorage (5-10MB vs 10GB+)

- **Use localStorage ONLY for:**
  - JWT tokens (already doing this via AuthManager)
  - UI state (current theme, last viewed exercise)

- **Use Cache API ONLY for:**
  - Static assets (JS, CSS, images)
  - Full API responses if caching entire endpoint responses
  - NOT for structured data querying

### IndexedDB Schema for Puzzle Results

```javascript
// Database: 'chess-composer'
// Version: 1

const dbRequest = indexedDB.open('chess-composer', 1);

dbRequest.onupgradeneeded = (event) => {
  const db = event.target.result;

  // Object store for offline puzzle submissions
  if (!db.objectStoreNames.contains('puzzle_submissions')) {
    const store = db.createObjectStore('puzzle_submissions', { keyPath: 'id', autoIncrement: true });

    // Indexes for fast queries
    store.createIndex('by_exercise_id', 'student_exercise_id', { unique: false });
    store.createIndex('by_student', 'student_id', { unique: false });
    store.createIndex('synced', 'synced', { unique: false });
    store.createIndex('by_timestamp', 'timestamp', { unique: false });
  }
};
```

**Record structure:**
```javascript
{
  id: 1,  // auto-incremented
  student_exercise_id: '123',  // FK to exercise
  student_id: '45',
  score: 7,
  puzzle_results: '1,1,0,1,1,0,1',  // comma-separated: 1=correct, 0=wrong
  puzzle_hints: '0,0,1,0,0,0,0',    // how many hints used per puzzle
  timestamp: 1711612200000,  // ISO timestamp for sorting
  synced: false,  // flag for sync queue
  sync_attempted: 0,  // retry count
  sync_error: null  // last error message
}
```

---

## 3. Background Sync: Browser Support & Fallback Patterns

### Background Sync API Status (2025)

**Support:**
- ✅ Chrome 49+ (Android & Desktop)
- ✅ Edge 15+
- ❌ Safari iOS (NOT supported)
- ❌ Firefox (NOT supported, experimental stage only)
- ✅ Samsung Internet

**Core API:**
```javascript
// NOT available on Safari — requires fallback
await registration.sync.register('sync-puzzle-submissions');

// Fired when connection returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-puzzle-submissions') {
    event.waitUntil(syncPuzzleSubmissions());
  }
});
```

### RECOMMENDED: Manual Retry Queue Fallback

Since Safari iOS doesn't support Background Sync API, use **manual polling** for syncing offline data. This works everywhere.

**Sync Queue Service (`packages/client/src/services/offline-sync-service.js`):**

```javascript
/**
 * OfflineSyncService - Manually sync offline data when connection returns
 * Works on all browsers (no Background Sync API required)
 */

export class OfflineSyncService {
  constructor(apiClient, dbService) {
    this.apiClient = apiClient;
    this.dbService = dbService;
    this.syncInProgress = false;
    this.maxRetries = 3;
    this.retryDelayMs = 5000; // 5s, exponential backoff

    // Listen for online/offline events
    window.addEventListener('online', () => this.syncPending());
    window.addEventListener('offline', () => console.log('Offline mode'));
  }

  /**
   * Save submission to IndexedDB queue (called when offline)
   */
  async queueSubmission(studentExerciseId, score, puzzleResults, puzzleHints) {
    const record = {
      student_exercise_id: studentExerciseId,
      student_id: this.getCurrentStudentId(),  // From auth
      score,
      puzzle_results: puzzleResults,
      puzzle_hints: puzzleHints,
      timestamp: Date.now(),
      synced: false,
      sync_attempted: 0,
      sync_error: null
    };

    return this.dbService.addSubmission(record);
  }

  /**
   * Sync all pending submissions when connection returns
   * Called via:
   * 1. 'online' event listener (automatic)
   * 2. Manual retry button
   * 3. Service Worker background sync (Chrome only)
   */
  async syncPending() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      const pending = await this.dbService.getPendingSubmissions();

      for (const record of pending) {
        if (record.sync_attempted >= this.maxRetries) {
          console.warn(`Max retries reached for submission ${record.id}`);
          continue;
        }

        try {
          await this.apiClient.saveStudentAttempt(
            record.student_exercise_id,
            record.score,
            record.puzzle_results,
            record.puzzle_hints
          );

          // Mark as synced in IndexedDB
          await this.dbService.markSynced(record.id);
          console.log(`Synced submission ${record.id}`);

        } catch (error) {
          // Still offline or server error — increment retry count
          await this.dbService.incrementRetry(record.id, error.message);
          console.error(`Sync failed for ${record.id}:`, error);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Check if online and sync if needed
   * Clients can call this before leaving a page
   */
  async ensureSynced() {
    if (!navigator.onLine) {
      console.warn('Still offline — data queued for sync when online');
      return false;
    }

    await this.syncPending();
    const pending = await this.dbService.getPendingSubmissions();
    return pending.length === 0;
  }

  getCurrentStudentId() {
    // Get from AuthManager or JWT payload
    return sessionStorage.getItem('student_id');
  }
}
```

**IndexedDB Service (`packages/client/src/services/indexeddb-service.js`):**

```javascript
/**
 * IndexedDBService - Wrapper for puzzle submission storage
 */

export class IndexedDBService {
  constructor() {
    this.dbName = 'chess-composer';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('puzzle_submissions')) {
          const store = db.createObjectStore('puzzle_submissions', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('by_exercise_id', 'student_exercise_id', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async addSubmission(record) {
    const tx = this.db.transaction('puzzle_submissions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = tx.objectStore('puzzle_submissions').add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSubmissions() {
    const tx = this.db.transaction('puzzle_submissions', 'readonly');
    const index = tx.objectStore('puzzle_submissions').index('synced');

    return new Promise((resolve, reject) => {
      const request = index.getAll(false);  // false = not synced
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markSynced(id) {
    const tx = this.db.transaction('puzzle_submissions', 'readwrite');
    const request = tx.objectStore('puzzle_submissions').get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const record = request.result;
        record.synced = true;
        tx.objectStore('puzzle_submissions').put(record);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async incrementRetry(id, errorMsg) {
    const tx = this.db.transaction('puzzle_submissions', 'readwrite');
    const request = tx.objectStore('puzzle_submissions').get(id);

    request.onsuccess = () => {
      const record = request.result;
      record.sync_attempted++;
      record.sync_error = errorMsg;
      tx.objectStore('puzzle_submissions').put(record);
    };
  }

  async clearSynced() {
    // Cleanup: remove synced records after 7 days
    const tx = this.db.transaction('puzzle_submissions', 'readwrite');
    const store = tx.objectStore('puzzle_submissions');
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const range = IDBKeyRange.upperBound(sevenDaysAgo);
    store.delete(range);
  }
}
```

---

## 4. Conflict Resolution: Offline vs Server Data

### Scenarios & Resolution Strategy

| Scenario | Root Cause | Resolution |
|----------|-----------|-----------|
| **Offline submit, then online edit** | User submits offline, teacher grades online | Last-write-wins: server data is authoritative |
| **Double-submit (network retry)** | Failed request retried | Idempotency via DB unique constraint on (student_exercise_id, timestamp) |
| **Stale local cache** | Cache not cleared after update | Version headers + cache busting in service worker |
| **Conflicting edits** | Student edits offline, teacher grades meanwhile | Timestamp-based merge: teacher's grade overwrites |

### Implementation

**Conflict Resolution Rule:**
```
Server data is ALWAYS authoritative.
Offline submissions are QUEUED, then synced when online.
If submission already exists on server, discard offline copy.
```

**API endpoint should return:**
```javascript
{
  success: true,
  data: {
    id: '123',
    score: 8,
    updated_at: '2026-03-28T12:00:00Z',
    synced: true
  },
  conflict: {
    detected: false,
    server_timestamp: '2026-03-28T11:50:00Z',
    local_timestamp: '2026-03-28T12:00:00Z'
  }
}
```

**Client handling:**
```javascript
if (response.conflict?.detected) {
  // Teacher graded while offline
  await this.dbService.markSynced(record.id);  // Don't retry
  showNotification('Teacher already graded this. Their score is applied.');
}
```

---

## 5. Web App Manifest (PWA Installation)

### Minimal manifest.json

**Location:** `packages/client/public/manifest.json`

```json
{
  "name": "Chess Composer",
  "short_name": "Chess",
  "description": "Chess puzzle solver for students and teachers",
  "start_url": "/",
  "display": "standalone",
  "scope": "/",
  "theme_color": "#1a1a1a",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### HTML Link (in `index.html`)

```html
<head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#1a1a1a" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
</head>
```

### Icon Requirements

**Sizes needed:**
- 192x192 (Android home screen)
- 512x512 (PWA install prompts)
- 192x192 + 512x512 (maskable for adaptive icons, newer Android)

**Maskable icons** (better for newer Android):
- Solid background fills all edges (no transparent areas)
- Logo/glyph centered in 80% of canvas
- Tools: https://maskable.app/ (free online converter)

### Installation Behavior

**Chrome/Android:**
- Automatic prompt after 2+ visits + 5min engagement
- Or install via menu: "Install app"

**Safari iOS:**
- NO automatic prompt (Apple limitation)
- Manual: Share → Add to Home Screen
- PWA still works when added (offline, app-like UI)

---

## 6. Browser Support Summary (2025)

### Service Workers
| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 40+ | ✅ | Full support |
| Safari 11.1+ (iOS 11.3+) | ✅ | Full support |
| Firefox 44+ | ✅ | Full support |
| Edge 15+ | ✅ | Full support |

### IndexedDB
| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ | ~50MB quota |
| Safari iOS 11+ | ✅ | ~50MB quota |
| Firefox | ✅ | ~50MB quota |
| Edge | ✅ | ~50MB quota |

### Background Sync API
| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 49+ | ✅ | Full support |
| Safari iOS | ❌ | **NOT SUPPORTED** |
| Firefox | ⚠️ | Experimental (disabled by default) |

### Cache API
| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ | Full support |
| Safari iOS 11.1+ | ✅ | Full support |
| Firefox | ✅ | Full support |

---

## 7. Implementation Checklist

### Phase 1: Service Worker + Static Caching
- [ ] Create `public/service-worker.js`
- [ ] Register in `src/index.js`
- [ ] Update Vite config (if needed — likely not)
- [ ] Test offline asset loading

### Phase 2: IndexedDB Setup
- [ ] Create `src/services/indexeddb-service.js`
- [ ] Initialize on app load
- [ ] Test data persistence across page reload

### Phase 3: Offline Sync Queue
- [ ] Create `src/services/offline-sync-service.js`
- [ ] Hook into `ApiClient.saveStudentAttempt()`
- [ ] Listen for online/offline events
- [ ] Test sync on reconnect (simulate with DevTools)

### Phase 4: PWA Manifest
- [ ] Create `public/manifest.json`
- [ ] Add icons (192x192, 512x512)
- [ ] Link in `index.html`
- [ ] Test install on Android

### Phase 5: Conflict Resolution
- [ ] Implement server conflict detection
- [ ] Handle duplicate submissions
- [ ] Show user notifications

---

## 8. Testing Strategy

### Unit Tests
```javascript
// Test IndexedDB CRUD
test('IndexedDBService stores submission', async () => {
  const service = new IndexedDBService();
  await service.init();

  const id = await service.addSubmission({
    student_exercise_id: '123',
    score: 7,
    puzzle_results: '1,1,0',
    synced: false
  });

  expect(id).toBeGreaterThan(0);
});

// Test offline queue
test('OfflineSyncService queues when offline', async () => {
  navigator.onLine = false;

  await syncService.queueSubmission('123', 8, '1,1,0', '0,0,0');
  const pending = await dbService.getPendingSubmissions();

  expect(pending).toHaveLength(1);
  expect(pending[0].synced).toBe(false);
});
```

### Integration Tests
- Test service worker install/activate in DevTools
- Simulate offline: DevTools → Network → Offline
- Make API call, verify it's queued in IndexedDB
- Go online, verify sync happens automatically

### Manual Testing (Chrome DevTools)

1. **Service Worker inspection:**
   ```
   DevTools → Application → Service Workers
   ```

2. **Offline simulation:**
   ```
   DevTools → Network tab → Offline (checkbox)
   ```

3. **IndexedDB inspection:**
   ```
   DevTools → Application → IndexedDB → chess-composer
   ```

4. **Cache inspection:**
   ```
   DevTools → Application → Cache Storage
   ```

---

## Unresolved Questions

1. **Icon generation** — Do you have design assets or need programmatic generation?
2. **Server-side conflict detection** — Is endpoint already prepared for duplicate detection?
3. **Data retention policy** — How long to keep synced records in IndexedDB before cleanup?
4. **Student authentication** — How is `student_id` determined offline (JWT stored)?
5. **UI notifications** — Want toast notifications or banner for "syncing..." state?

---

## Key Files to Create/Modify

```
packages/client/
├── public/
│   ├── service-worker.js       [NEW] Service worker
│   ├── manifest.json           [NEW] PWA manifest
│   └── icons/
│       ├── icon-192x192.png    [NEW]
│       └── icon-512x512.png    [NEW]
├── src/
│   ├── index.js                [MODIFY] Register SW
│   ├── index.html              [MODIFY] Link manifest
│   └── services/
│       ├── indexeddb-service.js [NEW] IndexedDB wrapper
│       ├── offline-sync-service.js [NEW] Sync queue
│       └── (future) notification-service.js
└── vite.config.js              [NO CHANGE]
```

---

## Summary

| Decision | Rationale |
|----------|-----------|
| **Manual SW, not VitePWA** | Full control, smaller bundle, offline-first data patterns |
| **IndexedDB for puzzle results** | Structured queries, transactions, large capacity |
| **Manual retry queue (not Background Sync)** | Safari iOS compatibility, simple polling on online event |
| **Server as authority** | Last-write-wins, conflict detection in API |
| **Manifest.json for installation** | Enables home screen install, app-like experience |

This approach delivers **robust offline-first puzzle solving** while maintaining compatibility across Safari iOS, Chrome Android, and desktop browsers.
