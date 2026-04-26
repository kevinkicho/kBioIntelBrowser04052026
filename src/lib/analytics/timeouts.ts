import path from 'path'
import fs from 'fs'

const OVERRIDE_PATH = path.join(process.cwd(), 'data', 'timeout-overrides.json')

const MIN_TIMEOUT_MS = 5000
const MAX_TIMEOUT_MS = 15000

let cached: Record<string, number> | null = null
let cachedMtime = 0

/**
 * Load tuned per-source timeouts from data/timeout-overrides.json.
 * Returns an empty object if the file is missing or unreadable — callers
 * should merge with their hardcoded defaults so missing entries fall back.
 *
 * Values outside [MIN_TIMEOUT_MS, MAX_TIMEOUT_MS] are clamped, never blindly
 * trusted: a runaway tuning run can't blow the timeout budget.
 */
export function loadTunedTimeouts(): Record<string, number> {
  try {
    const stat = fs.statSync(OVERRIDE_PATH)
    if (cached && stat.mtimeMs === cachedMtime) return cached
    const raw = fs.readFileSync(OVERRIDE_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, number>
    const clamped: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v !== 'number' || !isFinite(v)) continue
      clamped[k] = Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, Math.round(v)))
    }
    cached = clamped
    cachedMtime = stat.mtimeMs
    return clamped
  } catch {
    cached = {}
    return cached
  }
}
