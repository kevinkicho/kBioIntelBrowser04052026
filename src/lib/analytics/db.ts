import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'analytics.json')

interface MetricRow {
  id: number
  source: string
  endpoint: string
  status: number
  duration_ms: number
  error: string | null
  has_data: number
  items_count: number | null
  timestamp: string
}

export interface SourceSummary {
  source: string
  total_requests: number
  success_count: number
  error_count: number
  empty_count: number
  avg_duration_ms: number
  last_success_at: string | null
  last_error: string | null
  last_error_at: string | null
  success_rate: number
}

export interface DailySnapshot {
  date: string
  source: string
  total_requests: number
  success_count: number
  error_count: number
  avg_duration_ms: number
}

export interface ApiMetricRow {
  id: number
  source: string
  endpoint: string
  status: number
  duration_ms: number
  error: string | null
  has_data: number
  items_count: number | null
  timestamp: string
}

let _rows: MetricRow[] = []
let _nextId = 1
let _writeTimer: ReturnType<typeof setTimeout> | null = null

function load(): MetricRow[] {
  if (_rows.length > 0) return _rows
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8')
      _rows = JSON.parse(raw)
      _nextId = _rows.length > 0 ? Math.max(..._rows.map(r => r.id)) + 1 : 1
    } else {
      _rows = []
      _nextId = 1
    }
  } catch {
    _rows = []
    _nextId = 1
  }
  return _rows
}

function scheduleWrite() {
  if (_writeTimer) clearTimeout(_writeTimer)
  _writeTimer = setTimeout(() => {
    try {
      if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
      fs.writeFileSync(DB_PATH, JSON.stringify(_rows, null, 2), 'utf-8')
    } catch (err) {
      console.error('[analytics] Failed to write:', err)
    }
  }, 1000)
}

export function recordMetric(metric: {
  source: string
  endpoint: string
  status: number
  duration_ms: number
  error?: string
  has_data?: boolean
  items_count?: number
}): void {
  const rows = load()
  rows.push({
    id: _nextId++,
    source: metric.source,
    endpoint: metric.endpoint,
    status: metric.status,
    duration_ms: metric.duration_ms,
    error: metric.error ?? null,
    has_data: metric.has_data !== false ? 1 : 0,
    items_count: metric.items_count ?? null,
    timestamp: new Date().toISOString(),
  })
  scheduleWrite()
}

export function getSummary(since?: string): SourceSummary[] {
  const rows = load()
  const filtered = since ? rows.filter(r => r.timestamp >= since) : rows
  const groups = new Map<string, MetricRow[]>()
  for (const r of filtered) {
    if (!groups.has(r.source)) groups.set(r.source, [])
    groups.get(r.source)!.push(r)
  }
  const result: SourceSummary[] = []
  const sourceNames = Array.from(groups.keys())
  for (const source of sourceNames) {
    const group = groups.get(source)!
    const total = group.length
    const success = group.filter(r => r.status >= 200 && r.status < 300).length
    const errors = group.filter(r => r.status >= 400 || r.status === 0).length
    const empty = group.filter(r => r.has_data === 0).length
    const avgMs = total > 0 ? Math.round(group.reduce((s, r) => s + r.duration_ms, 0) / total) : 0
    const successRows = group.filter(r => r.status >= 200 && r.status < 300)
    const errorRows = group.filter(r => r.status >= 400 || r.status === 0)
    result.push({
      source,
      total_requests: total,
      success_count: success,
      error_count: errors,
      empty_count: empty,
      avg_duration_ms: avgMs,
      last_success_at: successRows.length > 0 ? successRows.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0].timestamp : null,
      last_error: errorRows.length > 0 ? (errorRows.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0].error || 'Unknown error') : null,
      last_error_at: errorRows.length > 0 ? errorRows.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0].timestamp : null,
      success_rate: total > 0 ? Math.round((success / total) * 1000) / 10 : 0,
    })
  }
  return result.sort((a, b) => a.source.localeCompare(b.source))
}

export function getDailyTrend(since: string): DailySnapshot[] {
  const rows = load()
  const filtered = rows.filter(r => r.timestamp >= since)
  const groups = new Map<string, MetricRow[]>()
  for (const r of filtered) {
    const day = r.timestamp.slice(0, 10)
    const key = `${day}|${r.source}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }
  const result: DailySnapshot[] = []
  const groupKeys = Array.from(groups.keys())
  for (const key of groupKeys) {
    const group = groups.get(key)!
    const day = group[0].timestamp.slice(0, 10)
    const total = group.length
    const success = group.filter(r => r.status >= 200 && r.status < 300).length
    const errors = group.filter(r => r.status >= 400 || r.status === 0).length
    const avgMs = total > 0 ? group.reduce((s, r) => s + r.duration_ms, 0) / total : 0
    result.push({
      date: day,
      source: group[0].source,
      total_requests: total,
      success_count: success,
      error_count: errors,
      avg_duration_ms: avgMs,
    })
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.source.localeCompare(b.source))
}

export function getRecentErrors(limit = 50): ApiMetricRow[] {
  const rows = load()
  return rows
    .filter(r => r.status >= 400 || r.status === 0)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)
}

export function purgeOldMetrics(maxAgeDays = 90): number {
  const rows = load()
  const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString()
  const before = rows.length
  const kept = rows.filter(r => r.timestamp >= cutoff)
  _rows = kept
  const removed = before - kept.length
  if (removed > 0) scheduleWrite()
  return removed
}

export function getDbStatus(): Record<string, unknown> {
  const rows = load()
  return {
    dbOpen: true,
    dbType: 'json',
    dbPath: DB_PATH,
    totalRows: rows.length,
    recentRows: rows.slice(-5).map(r => ({ source: r.source, timestamp: r.timestamp })),
  }
}