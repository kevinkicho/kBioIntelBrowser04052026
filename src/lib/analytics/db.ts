import type DatabaseType from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'analytics.db')

let _db: DatabaseType.Database | null = null
let _dbAvailable = false

function getDb(): DatabaseType.Database | null {
  if (_db) return _db
  if (_dbAvailable === false) return null
  try {
    // Use eval('require') to bypass webpack bundling for native module
    const Database = eval('require')('better-sqlite3') as typeof DatabaseType
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true })
    }
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.exec(`
      CREATE TABLE IF NOT EXISTS api_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        status INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        error TEXT,
        has_data INTEGER NOT NULL DEFAULT 1,
        items_count INTEGER,
        timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_metrics_source ON api_metrics(source);
      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON api_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_metrics_source_timestamp ON api_metrics(source, timestamp);
    `)
    // Checkpoint WAL to ensure data from previous sessions is visible
    _db.pragma('wal_checkpoint(TRUNCATE)')
    _dbAvailable = true
    return _db
  } catch (err) {
    console.error('[analytics] Failed to open database:', err)
    _dbAvailable = false
    return null
  }
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

export function recordMetric(metric: {
  source: string
  endpoint: string
  status: number
  duration_ms: number
  error?: string
  has_data?: boolean
  items_count?: number
}): void {
  const db = getDb()
  if (!db) return
  db.prepare(`
    INSERT INTO api_metrics (source, endpoint, status, duration_ms, error, has_data, items_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    metric.source,
    metric.endpoint,
    metric.status,
    metric.duration_ms,
    metric.error ?? null,
    metric.has_data !== false ? 1 : 0,
    metric.items_count ?? null,
  )
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

export function getSummary(since?: string): SourceSummary[] {
  const db = getDb()
  if (!db) return []
  const sinceClause = since ? `AND timestamp >= ?` : ''
  const rows = db.prepare(`
    SELECT
      source,
      COUNT(*) as total_requests,
      SUM(CASE WHEN status >= 200 AND status < 300 THEN 1 ELSE 0 END) as success_count,
      SUM(CASE WHEN status >= 400 OR status = 0 THEN 1 ELSE 0 END) as error_count,
      SUM(CASE WHEN has_data = 0 THEN 1 ELSE 0 END) as empty_count,
      AVG(duration_ms) as avg_duration_ms,
      MAX(CASE WHEN status >= 200 AND status < 300 THEN timestamp END) as last_success_at,
      MAX(CASE WHEN status >= 400 OR status = 0 THEN error END) as last_error,
      MAX(CASE WHEN status >= 400 OR status = 0 THEN timestamp END) as last_error_at
    FROM api_metrics
    WHERE 1=1 ${sinceClause}
    GROUP BY source
    ORDER BY source
  `).all(...(since ? [since] : [])) as (Omit<SourceSummary, 'success_rate'> & { success_count: number; error_count: number; avg_duration_ms: number })[]

  return rows.map(r => ({
    ...r,
    success_rate: r.total_requests > 0
      ? Math.round((r.success_count / r.total_requests) * 1000) / 10
      : 0,
    avg_duration_ms: Math.round(r.avg_duration_ms),
  }))
}

export function getDailyTrend(since: string): DailySnapshot[] {
  const db = getDb()
  if (!db) return []
  return db.prepare(`
    SELECT
      DATE(timestamp) as date,
      source,
      COUNT(*) as total_requests,
      SUM(CASE WHEN status >= 200 AND status < 300 THEN 1 ELSE 0 END) as success_count,
      SUM(CASE WHEN status >= 400 OR status = 0 THEN 1 ELSE 0 END) as error_count,
      AVG(duration_ms) as avg_duration_ms
    FROM api_metrics
    WHERE timestamp >= ?
    GROUP BY DATE(timestamp), source
    ORDER BY date, source
  `).all(since) as DailySnapshot[]
}

export function getRecentErrors(limit = 50): ApiMetricRow[] {
  const db = getDb()
  if (!db) return []
  return db.prepare(`
    SELECT * FROM api_metrics
    WHERE status >= 400 OR status = 0
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit) as ApiMetricRow[]
}

export function getDbStatus(): Record<string, unknown> {
  const db = getDb()
  if (!db) return { error: 'Database not available', dbPath: DB_PATH, dbAvailable: _dbAvailable }
  const count = db.prepare('SELECT COUNT(*) as c FROM api_metrics').get() as { c: number }
  const recent = db.prepare('SELECT source, timestamp FROM api_metrics ORDER BY timestamp DESC LIMIT 5').all()
  return { 
    dbOpen: true, 
    dbPath: DB_PATH, 
    totalRows: count.c, 
    recentRows: recent,
  }
}

export function purgeOldMetrics(maxAgeDays = 90): number {
  const db = getDb()
  if (!db) return 0
  const cutoff = new Date(Date.now() - maxAgeDays * 86400000).toISOString()
  const result = db.prepare('DELETE FROM api_metrics WHERE timestamp < ?').run(cutoff)
  return result.changes
}