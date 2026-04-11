interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()
const MAX_ENTRIES = 200
const CLEANUP_INTERVAL = 60000 // Run cleanup every minute

/**
 * Remove all expired entries from the cache
 * Called periodically to prevent memory bloat from stale entries
 */
function cleanupExpired(): void {
  const now = Date.now()
  const keysToDelete: string[] = []
  store.forEach((entry, key) => {
    if (now > entry.expiresAt) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => store.delete(key))
}

// Run periodic cleanup in browser/client environment
if (typeof window !== 'undefined') {
  setInterval(cleanupExpired, CLEANUP_INTERVAL)
}

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return undefined
  }
  return entry.data as T
}

export function setCache<T>(key: string, data: T, ttlMs: number = 3600000): void {
  // Evict oldest if at capacity
  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value
    if (oldestKey !== undefined) store.delete(oldestKey)
  }
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}

/**
 * Get cache statistics for debugging/monitoring
 */
export function getCacheStats(): { size: number; expiredCount: number } {
  const now = Date.now()
  let expiredCount = 0
  store.forEach((entry) => {
    if (now > entry.expiresAt) expiredCount++
  })
  return { size: store.size, expiredCount }
}

/**
 * Clear all cache entries (useful for testing)
 */
export function clearCache(): void {
  store.clear()
}
