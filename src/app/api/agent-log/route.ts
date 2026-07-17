import { NextRequest, NextResponse } from 'next/server'
import { appendFile, mkdir } from 'fs/promises'
import path from 'path'

/**
 * Append agent activity events as JSONL under repo logs/.
 * Enabled in development or when AGENT_ACTIVITY_LOG=1.
 * Never logs secrets; clients should not send tokens/keys.
 */

function loggingEnabled(): boolean {
  if (process.env.AGENT_ACTIVITY_LOG === '0') return false
  if (process.env.AGENT_ACTIVITY_LOG === '1') return true
  return process.env.NODE_ENV === 'development'
}

function dayStamp(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function logsDir(): string {
  return path.join(process.cwd(), 'logs')
}

function logFilePath(): string {
  // Identifying name + date for easy agent review
  return path.join(logsDir(), `agent-activity-${dayStamp()}.jsonl`)
}

export async function POST(request: NextRequest) {
  if (!loggingEnabled()) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 204 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const events = Array.isArray((body as { events?: unknown }).events)
    ? (body as { events: unknown[] }).events
    : body && typeof body === 'object' && 'name' in (body as object)
      ? [body]
      : null

  if (!events || events.length === 0) {
    return NextResponse.json({ error: 'Expected events[]' }, { status: 400 })
  }

  const lines: string[] = []
  for (const ev of events.slice(0, 50)) {
    if (!ev || typeof ev !== 'object') continue
    const o = ev as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name.slice(0, 120) : 'unnamed'
    const row = {
      ts: typeof o.ts === 'string' ? o.ts : new Date().toISOString(),
      name,
      level: typeof o.level === 'string' ? o.level : 'info',
      sessionId: typeof o.sessionId === 'string' ? o.sessionId.slice(0, 64) : undefined,
      source: typeof o.source === 'string' ? o.source.slice(0, 40) : 'client',
      props: o.props && typeof o.props === 'object' ? o.props : undefined,
      serverReceivedAt: new Date().toISOString(),
    }
    try {
      lines.push(JSON.stringify(row))
    } catch {
      /* skip bad event */
    }
  }

  if (lines.length === 0) {
    return NextResponse.json({ error: 'No valid events' }, { status: 400 })
  }

  try {
    const dir = logsDir()
    await mkdir(dir, { recursive: true })
    const file = logFilePath()
    await appendFile(file, lines.join('\n') + '\n', 'utf8')
    return NextResponse.json({
      ok: true,
      written: lines.length,
      file: path.basename(file),
    })
  } catch (err) {
    console.error('[agent-log] write failed', err)
    return NextResponse.json({ error: 'Failed to write log' }, { status: 500 })
  }
}

export async function GET() {
  if (!loggingEnabled()) {
    return NextResponse.json({ enabled: false })
  }
  return NextResponse.json({
    enabled: true,
    filePattern: 'logs/agent-activity-YYYY-MM-DD.jsonl',
    hint: 'POST { events: [{ ts, name, level, sessionId?, source, props? }] }',
  })
}
