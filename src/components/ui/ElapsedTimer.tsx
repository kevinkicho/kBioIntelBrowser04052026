'use client'

import { useEffect, useState } from 'react'
import { elapsedWaitHint, formatElapsed } from '@/lib/elapsedTime'

/**
 * Live elapsed clock while `active` is true. Resets when becoming active again.
 * Updates ~4×/s for a smooth “ticking” feel without high CPU cost.
 */
export function useElapsedMs(active: boolean): number {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!active) {
      setElapsed(0)
      return
    }
    const started = performance.now()
    setElapsed(0)
    const id = window.setInterval(() => {
      setElapsed(performance.now() - started)
    }, 250)
    return () => window.clearInterval(id)
  }, [active])

  return elapsed
}

interface ElapsedTimerProps {
  /** When true, clock runs from 0. When false, shows 0.0s or hides via parent. */
  active: boolean
  className?: string
  /** Show evolving wait hint under the clock */
  showHint?: boolean
  /** Optional label prefix, e.g. "Elapsed" */
  label?: string
  /** test id */
  testId?: string
}

/**
 * Animated elapsed-time display for long free-API waits.
 */
export function ElapsedTimer({
  active,
  className = '',
  showHint = false,
  label = 'Elapsed',
  testId = 'elapsed-timer',
}: ElapsedTimerProps) {
  const elapsed = useElapsedMs(active)

  return (
    <div className={className} data-testid={testId} data-active={active ? 'true' : 'false'}>
      <div className="flex items-center justify-center gap-2">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            active ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'
          }`}
          aria-hidden
        />
        <span className="text-xs text-slate-400">
          {label}{' '}
          <span
            className="font-mono tabular-nums text-indigo-300 transition-colors duration-300"
            data-testid={`${testId}-value`}
          >
            {formatElapsed(elapsed)}
          </span>
        </span>
      </div>
      {showHint && active && (
        <p
          className="mt-1.5 text-center text-[10px] text-slate-500 leading-relaxed transition-opacity duration-500"
          data-testid={`${testId}-hint`}
        >
          {elapsedWaitHint(elapsed)}
        </p>
      )}
    </div>
  )
}
