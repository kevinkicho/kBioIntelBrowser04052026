/**
 * Client → server agent activity log (JSONL under /logs).
 * Privacy: logs/ is gitignored. Dev/local by default; force with NEXT_PUBLIC_AGENT_LOG=1.
 *
 * File naming: logs/agent-activity-YYYY-MM-DD.jsonl
 * Each line: { ts, name, level, sessionId?, source, props? }
 */

export type AgentLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface AgentLogEvent {
  ts: string
  name: string
  level: AgentLogLevel
  sessionId?: string
  source: string
  props?: Record<string, unknown>
}

const queue: AgentLogEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_MS = 800
const MAX_BATCH = 40

function enabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (process.env.NEXT_PUBLIC_AGENT_LOG === '0') return false
    if (process.env.NEXT_PUBLIC_AGENT_LOG === '1') return true
    // Default on in development
    return process.env.NODE_ENV === 'development'
  } catch {
    return false
  }
}

function sessionId(): string | undefined {
  try {
    const raw = localStorage.getItem('biointel-local-session-v1')
    if (!raw) return undefined
    const o = JSON.parse(raw) as { sessionId?: string }
    return typeof o.sessionId === 'string' ? o.sessionId : undefined
  } catch {
    return undefined
  }
}

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushAgentLog()
  }, FLUSH_MS)
}

/**
 * Append a structured activity line for agent/debug review.
 * Never throws; best-effort only.
 */
export function logAgentActivity(
  name: string,
  props?: Record<string, unknown>,
  opts?: { level?: AgentLogLevel; source?: string },
): void {
  if (!enabled()) return
  try {
    queue.push({
      ts: new Date().toISOString(),
      name,
      level: opts?.level ?? 'info',
      sessionId: sessionId(),
      source: opts?.source ?? 'client',
      props: props ? truncateProps(props) : undefined,
    })
    if (queue.length >= MAX_BATCH) {
      void flushAgentLog()
    } else {
      scheduleFlush()
    }
  } catch {
    /* ignore */
  }
}

function truncateProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' && v.length > 500) {
      out[k] = v.slice(0, 500) + '…'
    } else if (v && typeof v === 'object') {
      try {
        const s = JSON.stringify(v)
        out[k] = s.length > 800 ? JSON.parse(s.slice(0, 800) + '"}') : v
      } catch {
        out[k] = '[unserializable]'
      }
    } else {
      out[k] = v
    }
  }
  return out
}

export async function flushAgentLog(): Promise<void> {
  if (!enabled() || queue.length === 0) return
  if (typeof fetch !== 'function') return
  const batch = queue.splice(0, MAX_BATCH)
  try {
    await fetch('/api/agent-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    })
  } catch {
    // drop batch on failure — do not requeue forever
  }
}

/** Test helper */
export function _agentLogQueueLength(): number {
  return queue.length
}

export function _clearAgentLogQueue(): void {
  queue.length = 0
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
}
