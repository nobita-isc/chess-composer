/**
 * sync-manager.js
 * Processes the offline sync queue when connection restores.
 * Cross-browser: uses online/offline events (no Background Sync API needed).
 */

import { getSyncQueue, clearSyncQueueItem, markSynced, getUnsyncedCount } from './offline-storage.js'

let authTokenGetter = null
let isProcessing = false
let retryTimer = null

/**
 * Initialize the sync manager.
 * @param {Function} getToken - Function that returns the current auth token
 */
export function initSyncManager(getToken) {
  authTokenGetter = getToken

  window.addEventListener('online', () => {
    hideOfflineBanner()
    flushSyncQueue()
  })

  window.addEventListener('offline', () => {
    showOfflineBanner()
  })

  // Flush on startup if online
  if (navigator.onLine) {
    flushSyncQueue()
  } else {
    showOfflineBanner()
  }
}

/**
 * Process all queued API requests.
 */
export async function flushSyncQueue() {
  if (isProcessing) return
  isProcessing = true

  try {
    const queue = await getSyncQueue()
    if (queue.length === 0) {
      updateSyncBadge(0)
      return
    }

    const token = authTokenGetter?.()
    if (!token) return // can't sync without auth

    let successCount = 0

    for (const item of queue) {
      if (!navigator.onLine) break // stop if went offline during processing

      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(item.body)
        })

        if (response.ok || response.status === 400) {
          // Success or server-rejected (e.g. is_final) — remove from queue either way
          await clearSyncQueueItem(item.id)
          if (item.studentExerciseId) {
            await markSynced(item.studentExerciseId)
          }
          successCount++
        }
      } catch {
        // Network error — stop processing, will retry later
        break
      }
    }

    if (successCount > 0) {
      showSyncToast(`${successCount} item${successCount > 1 ? 's' : ''} synced`)
    }

    const remaining = await getUnsyncedCount()
    updateSyncBadge(remaining)

    // Schedule retry if items remain
    if (remaining > 0 && navigator.onLine) {
      scheduleRetry()
    }
  } finally {
    isProcessing = false
  }
}

function scheduleRetry() {
  if (retryTimer) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    flushSyncQueue()
  }, 30000) // retry every 30s
}

// ==================== UI Indicators ====================

function showOfflineBanner() {
  if (document.getElementById('offline-banner')) return
  const banner = document.createElement('div')
  banner.id = 'offline-banner'
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:100000;background:#fef3c7;color:#92400e;text-align:center;padding:8px 16px;font-size:13px;font-weight:500;border-bottom:1px solid #fde68a'
  banner.textContent = "You're offline. Progress is saved locally."
  document.body.prepend(banner)
}

function hideOfflineBanner() {
  document.getElementById('offline-banner')?.remove()
}

function updateSyncBadge(count) {
  let badge = document.getElementById('sync-badge')
  if (count === 0) {
    badge?.remove()
    return
  }
  if (!badge) {
    badge = document.createElement('span')
    badge.id = 'sync-badge'
    badge.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:100000;background:#f59e0b;color:#fff;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.15);cursor:pointer'
    badge.addEventListener('click', () => flushSyncQueue())
    document.body.appendChild(badge)
  }
  badge.textContent = `${count} unsaved`
}

function showSyncToast(message) {
  const toast = document.createElement('div')
  toast.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:100000;display:flex;align-items:center;gap:8px;background:#f0fdf4;color:#059669;border:1px solid #bbf7d0;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,0.1)'
  toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>${message}`
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.3s'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}
