/**
 * Determine whether a tracked API payload contains real user-visible data.
 * Treats empty arrays, empty objects, and nullish values as no data.
 * Nested shapes like { associations: [] } or { data: { studies: [] } } count as empty.
 */
export function payloadHasData(val: unknown): boolean {
  if (val === null || val === undefined) return false
  if (Array.isArray(val)) return val.length > 0
  if (typeof val !== 'object') {
    if (typeof val === 'string') return val.trim().length > 0
    if (typeof val === 'number' || typeof val === 'boolean') return true
    return false
  }

  const obj = val as Record<string, unknown>
  const keys = Object.keys(obj)
  if (keys.length === 0) return false

  // Wrapper shapes from standardizeResponse / NIH clients
  if ('data' in obj && keys.length <= 3) {
    const nested = obj.data
    if (nested !== undefined) return payloadHasData(nested)
  }

  // If every value is empty, the whole payload is empty
  let anyData = false
  for (const k of keys) {
    // Metadata keys don't count as scientific data
    if (k === 'source' || k === 'timestamp' || k === 'error' || k === 'status') continue
    if (payloadHasData(obj[k])) {
      anyData = true
      break
    }
  }
  return anyData
}
