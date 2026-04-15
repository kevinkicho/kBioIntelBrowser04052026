'use client'

import { useAI } from '@/lib/ai/useAI'

export function AIStatusIndicator() {
  const ai = useAI()

  if (!ai.mounted) return null

  if (!ai.ollamaUrl || !ai.enabled) {
    return null
  }

  const color = ai.status === 'available'
    ? 'text-emerald-400'
    : ai.status === 'checking' || ai.status === 'downloading'
    ? 'text-amber-400 animate-pulse'
    : 'text-red-400'

  const title = ai.status === 'available'
    ? `AI ready (${ai.model}) @ ${ai.ollamaUrl}`
    : ai.status === 'checking'
    ? 'Checking AI connection...'
    : ai.status === 'downloading'
    ? 'Downloading AI model...'
    : ai.status === 'error'
    ? `AI error: ${ai.error}`
    : `AI unavailable: ${ai.error ?? 'Not connected'}`

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] ${color}`} title={title}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
      <span className="hidden sm:inline">{ai.status === 'available' ? 'AI' : ai.status === 'downloading' ? ' Installing...' : ''}</span>
      {ai.status === 'available' && (
        <button
          onClick={(e) => { e.stopPropagation(); ai.disconnect() }}
          className="ml-1 text-slate-500 hover:text-red-400 transition-colors"
          title="Disconnect AI"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  )
}