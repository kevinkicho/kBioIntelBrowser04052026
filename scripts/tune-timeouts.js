/**
 * Read data/analytics.json, compute p95 per source, and write
 * data/timeout-overrides.json with tuned per-source timeouts.
 *
 * Run with: npm run tune-timeouts
 *
 * The app loads this file at request time via src/lib/analytics/timeouts.ts.
 * Values are clamped to [5000, 15000] ms by the loader, so a corrupted run
 * can't blow the timeout budget.
 */

const path = require('path')
const fs = require('fs')

const ANALYTICS_PATH = path.join(process.cwd(), 'data', 'analytics.json')
const OVERRIDE_PATH = path.join(process.cwd(), 'data', 'timeout-overrides.json')

// Tune from successful calls only — error-path latencies (DNS fail, abort)
// don't tell us how long real responses take.
const MIN_SAMPLES = 20
const SAFETY_MARGIN = 1.3 // p95 * 1.3, so we don't cut off marginal slow responses

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

function main() {
  if (!fs.existsSync(ANALYTICS_PATH)) {
    console.error(`No analytics file at ${ANALYTICS_PATH}. Browse some molecules first to collect telemetry.`)
    process.exit(1)
  }

  const raw = fs.readFileSync(ANALYTICS_PATH, 'utf-8')
  const rows = JSON.parse(raw)

  const oneWeekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const recent = rows.filter(r =>
    r.timestamp >= oneWeekAgo && r.status >= 200 && r.status < 300,
  )

  const bySource = new Map()
  for (const r of recent) {
    const arr = bySource.get(r.source) ?? []
    arr.push(r.duration_ms)
    bySource.set(r.source, arr)
  }

  const overrides = {}
  const skipped = []
  for (const [source, durations] of bySource) {
    if (durations.length < MIN_SAMPLES) {
      skipped.push(`${source} (only ${durations.length} samples)`)
      continue
    }
    const sorted = [...durations].sort((a, b) => a - b)
    const p95 = percentile(sorted, 95)
    overrides[source] = Math.round(p95 * SAFETY_MARGIN)
  }

  fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(overrides, null, 2), 'utf-8')

  const sortedOverrides = Object.entries(overrides).sort((a, b) => b[1] - a[1])
  console.log(`Wrote ${sortedOverrides.length} per-source timeouts to ${OVERRIDE_PATH}`)
  console.log(`(values are p95 × ${SAFETY_MARGIN}; loader clamps to [5000, 15000] ms)\n`)
  console.log('Top 10 by tuned timeout:')
  for (const [source, ms] of sortedOverrides.slice(0, 10)) {
    console.log(`  ${ms.toString().padStart(6)} ms  ${source}`)
  }
  if (skipped.length > 0) {
    console.log(`\nSkipped ${skipped.length} sources with <${MIN_SAMPLES} successful samples.`)
  }
}

main()
