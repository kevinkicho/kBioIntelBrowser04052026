import { NextRequest, NextResponse } from 'next/server'
import { recordMetric } from '@/lib/analytics/db'

const MAX_SOURCE_LENGTH = 100
const MAX_ENDPOINT_LENGTH = 500
const MAX_ERROR_LENGTH = 500
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 120

const rateLimitMap = new Map<string, { count: number; windowStart: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return true
  }
  entry.count++
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) return false
  return true
}

function truncate(value: unknown, maxLength: number): string {
  const str = typeof value === 'string' ? value : String(value ?? '')
  return str.length > maxLength ? str.slice(0, maxLength) : str
}

interface IncomingMetric {
  source: string
  endpoint: string
  status: number
  duration_ms: number
  error?: string
  has_data?: boolean
  items_count?: number
}

function normalizeAndRecord(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return 'Invalid metric object'
  const m = raw as IncomingMetric
  if (!m.source || !m.endpoint || m.status === undefined || m.duration_ms === undefined) {
    return 'Missing required fields: source, endpoint, status, duration_ms'
  }
  recordMetric({
    source: truncate(m.source, MAX_SOURCE_LENGTH),
    endpoint: truncate(m.endpoint, MAX_ENDPOINT_LENGTH),
    status: Number(m.status),
    duration_ms: Math.min(Number(m.duration_ms), 600000),
    error: m.error ? truncate(m.error, MAX_ERROR_LENGTH) : undefined,
    has_data: m.has_data !== false,
    items_count: m.items_count != null ? Math.min(Number(m.items_count), 100000) : undefined,
  })
  return null
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()

    if (Array.isArray(body)) {
      const MAX_BATCH = 200
      const metrics = body.slice(0, MAX_BATCH)
      const errors: string[] = []
      let recorded = 0
      for (const item of metrics) {
        const err = normalizeAndRecord(item)
        if (err) errors.push(err)
        else recorded++
      }
      return NextResponse.json({ ok: true, recorded, errors: errors.length > 0 ? errors : undefined })
    }

    const err = normalizeAndRecord(body)
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 })
    }
    return NextResponse.json({ ok: true, recorded: 1 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}