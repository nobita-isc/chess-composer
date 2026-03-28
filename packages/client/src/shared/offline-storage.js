/**
 * offline-storage.js
 * IndexedDB wrapper for offline puzzle progress and sync queue.
 * Local-first: always save here BEFORE API call.
 */

const DB_NAME = 'chess-trainer-offline'
const DB_VERSION = 1
const PROGRESS_STORE = 'puzzle-progress'
const SYNC_QUEUE_STORE = 'sync-queue'

let dbInstance = null

/**
 * Open (or create) the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        const store = db.createObjectStore(PROGRESS_STORE, { keyPath: 'studentExerciseId' })
        store.createIndex('synced', 'synced', { unique: false })
      }

      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }

    request.onsuccess = (event) => {
      dbInstance = event.target.result
      resolve(dbInstance)
    }

    request.onerror = () => reject(request.error)
  })
}

/**
 * Save puzzle progress locally.
 * @param {object} data - { studentExerciseId, exerciseId, puzzleResults, puzzleHints, score, totalPuzzles }
 */
export async function saveProgress(data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROGRESS_STORE, 'readwrite')
    tx.objectStore(PROGRESS_STORE).put({
      ...data,
      lastUpdated: Date.now(),
      synced: false
    })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Get cached progress for a student exercise.
 * @param {string} studentExerciseId
 * @returns {Promise<object|null>}
 */
export async function getProgress(studentExerciseId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROGRESS_STORE, 'readonly')
    const request = tx.objectStore(PROGRESS_STORE).get(studentExerciseId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all unsynced progress records.
 * @returns {Promise<object[]>}
 */
export async function getAllUnsynced() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROGRESS_STORE, 'readonly')
    const index = tx.objectStore(PROGRESS_STORE).index('synced')
    const request = index.getAll(false)
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Mark a progress record as synced.
 * @param {string} studentExerciseId
 */
export async function markSynced(studentExerciseId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROGRESS_STORE, 'readwrite')
    const store = tx.objectStore(PROGRESS_STORE)
    const request = store.get(studentExerciseId)
    request.onsuccess = () => {
      const record = request.result
      if (record) {
        store.put({ ...record, synced: true })
      }
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Add a failed API request to the sync queue.
 * @param {object} request - { url, method, body }
 */
export async function addToSyncQueue(request) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite')
    tx.objectStore(SYNC_QUEUE_STORE).add({
      ...request,
      timestamp: Date.now(),
      retryCount: 0
    })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Get all items in the sync queue.
 * @returns {Promise<object[]>}
 */
export async function getSyncQueue() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly')
    const request = tx.objectStore(SYNC_QUEUE_STORE).getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Remove a successfully synced item from the queue.
 * @param {number} id - Auto-incremented key
 */
export async function clearSyncQueueItem(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite')
    tx.objectStore(SYNC_QUEUE_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Get count of unsynced items (progress + queue).
 * @returns {Promise<number>}
 */
export async function getUnsyncedCount() {
  const [unsynced, queue] = await Promise.all([getAllUnsynced(), getSyncQueue()])
  return unsynced.length + queue.length
}
