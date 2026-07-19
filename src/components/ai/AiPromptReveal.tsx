'use client'

/**
 * Prompt transparency for learning — shows system + user messages sent to the model.
 * Never claims of-record ranking.
 */

import { useState } from 'react'

export interface AiPromptRevealProps {
  system?: string | null
  user?: string | null
  mode?: string
  version?: string
  /** Compact toggle label */
  label?: string
  className?: string
  testId?: string
}

export function AiPromptReveal({
  system,
  user,
  mode,
  version,
  label = 'Show prompt (learn how this was asked)',
  className = '',
  testId = 'ai-prompt-reveal',
}: AiPromptRevealProps) {
  const [open, setOpen] = useState(false)
  if (!system && !user) return null

  return (
    <div className={`rounded-lg border border-slate-800/80 bg-slate-950/40 ${className}`} data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[10px] text-indigo-400/90 hover:text-indigo-300"
        data-testid={`${testId}-toggle`}
      >
        <span>
          {open ? 'Hide prompt' : label}
          {mode ? (
            <span className="ml-1.5 font-mono text-slate-600">
              {mode}
              {version ? ` · ${version}` : ''}
            </span>
          ) : null}
        </span>
        <span className="text-slate-600">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-800/60 px-2.5 py-2">
          <p className="text-[9px] text-slate-600 leading-relaxed">
            For your learning: this is the exact system + user text sent to your connected model.
            It is not a regulatory record. Of-record Discover ranks stay deterministic free-API
            scores.
          </p>
          {system && (
            <details open className="text-[10px] text-slate-500">
              <summary className="cursor-pointer text-slate-400">
                System ({system.length.toLocaleString()} chars)
              </summary>
              <pre
                className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-2 text-[9px] text-slate-500"
                data-testid={`${testId}-system`}
              >
                {system}
              </pre>
            </details>
          )}
          {user && (
            <details open className="text-[10px] text-slate-500">
              <summary className="cursor-pointer text-slate-400">
                User ({user.length.toLocaleString()} chars)
              </summary>
              <pre
                className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-2 text-[9px] text-slate-500"
                data-testid={`${testId}-user`}
              >
                {user}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
