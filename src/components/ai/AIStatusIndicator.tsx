'use client'

import { useState } from 'react'
import { useAI } from '@/lib/ai/useAI'
import { AIConfigModal } from './AIConfigModal'

/**
 * Top-bar AI control: always clickable; opens configure modal.
 * No disconnect affordance here (disconnect lives in the modal only).
 */
export function AIStatusIndicator() {
  const ai = useAI()
  const [modalOpen, setModalOpen] = useState(false)

  if (!ai.mounted) return null

  // Ready when status is available, or we still have a saved key + model (session usable for Pack AI)
  const hasSession = Boolean(ai.hasUserApiKey && ai.model)
  const ready =
    ai.status === 'available' ||
    (hasSession && ai.enabled && ai.status !== 'error' && ai.status !== 'checking')
  const busy = ai.status === 'checking' || ai.status === 'downloading'
  const failed =
    !ready &&
    !busy &&
    (ai.status === 'error' || ai.status === 'unavailable' || (ai.enabled && !hasSession))

  const ring = ready
    ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300 hover:border-emerald-600 hover:bg-emerald-900/40'
    : busy
      ? 'border-amber-800/50 bg-amber-950/30 text-amber-300 hover:border-amber-700'
      : failed
        ? 'border-red-900/50 bg-red-950/30 text-red-300/90 hover:border-red-800'
        : 'border-slate-700/60 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'

  const title = ready
    ? `AI ready${ai.model ? ` (${ai.model})` : ''} — click to configure`
    : busy
      ? 'Checking AI connection…'
      : ai.status === 'downloading'
        ? 'Downloading AI model…'
        : failed
          ? `AI unavailable${ai.error ? `: ${ai.error}` : ''} — click to configure`
          : 'Configure AI (Ollama Cloud)'

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${ring} ${
          busy ? 'animate-pulse' : ''
        }`}
        title={title}
        aria-label={title}
        data-testid="ai-config-button"
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            ready
              ? 'bg-emerald-400'
              : busy
                ? 'bg-amber-400'
                : failed
                  ? 'bg-red-400'
                  : 'bg-slate-500'
          }`}
          aria-hidden
        />
        <span>AI</span>
      </button>
      <AIConfigModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
