/**
 * Shared elapsed-time helpers for loading UX (profile overlay, discover, gene).
 * Keep formatting deterministic for tests and tabular-nums displays.
 */

/** Format milliseconds as a short human clock: `0.0s`, `12.4s`, `1:05`, `12:03`. */
export function formatElapsed(ms: number): string {
  const totalMs = Math.max(0, Math.floor(ms))
  if (totalMs < 60_000) {
    return `${(totalMs / 1000).toFixed(1)}s`
  }
  const totalSec = Math.floor(totalMs / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Friendly status line that evolves with wait time (reduces “is it stuck?” anxiety). */
export function elapsedWaitHint(ms: number): string {
  if (ms < 3_000) return 'Starting free public APIs…'
  if (ms < 8_000) return 'Querying sources — usually a few seconds'
  if (ms < 15_000) return 'Still working — some sources are slower'
  if (ms < 30_000) return 'Taking longer than usual — hang tight'
  return 'Almost there or timing out soon — you can refresh a card later'
}
