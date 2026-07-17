'use client'

import { useEffect, useState } from 'react'
import { useAI } from '@/lib/ai/useAI'
import { validateOllamaUrl, OLLAMA_DEFAULT_PORT } from '@/lib/ai/config'

interface AIConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal for Ollama / Ollama Cloud connection (replaces homepage AIBanner card).
 */
export function AIConfigModal({ isOpen, onClose }: AIConfigModalProps) {
  const ai = useAI()
  const [hostInput, setHostInput] = useState(() => {
    try {
      return new URL(ai.ollamaUrl || 'http://localhost:11434').hostname
    } catch {
      return 'localhost'
    }
  })
  const [portInput, setPortInput] = useState(() => {
    try {
      return String(new URL(ai.ollamaUrl || 'http://localhost:11434').port || OLLAMA_DEFAULT_PORT)
    } catch {
      return String(OLLAMA_DEFAULT_PORT)
    }
  })
  const [connecting, setConnecting] = useState(false)
  const [validationHint, setValidationHint] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    try {
      const u = new URL(ai.ollamaUrl || 'http://localhost:11434')
      setHostInput(u.hostname)
      setPortInput(String(u.port || OLLAMA_DEFAULT_PORT))
    } catch {
      /* keep */
    }
  }, [isOpen, ai.ollamaUrl])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleConnect = async () => {
    const portNum = parseInt(portInput, 10)
    const port = isNaN(portNum) || portNum < 1 || portNum > 65535 ? OLLAMA_DEFAULT_PORT : portNum
    const fullUrl = `${hostInput.trim() || 'localhost'}:${port}`
    const validation = validateOllamaUrl(fullUrl)
    if (!validation.valid) {
      setValidationHint(validation.error || 'Invalid URL')
      return
    }
    if (validation.warning === 'lan-warning') {
      setValidationHint(
        'LAN Ollama requires OLLAMA_ALLOW_LAN=1 on the Next.js server. Ensure this host is trusted and on your network.',
      )
    } else {
      setValidationHint(null)
    }
    setConnecting(true)
    await ai.connect(validation.normalized || fullUrl)
    setConnecting(false)
  }

  const handleConnectCloud = async () => {
    setValidationHint(null)
    setConnecting(true)
    await ai.connect('https://ollama.com')
    setConnecting(false)
  }

  const statusColor =
    ai.status === 'available'
      ? 'bg-emerald-400'
      : ai.status === 'checking' || ai.status === 'downloading'
        ? 'bg-amber-400 animate-pulse'
        : ai.status === 'error' || ai.status === 'unavailable'
          ? 'bg-red-400'
          : 'bg-slate-500'

  const statusLabel =
    ai.status === 'available'
      ? `Connected to ${ai.ollamaUrl}`
      : ai.status === 'checking'
        ? 'Connecting…'
        : ai.status === 'downloading'
          ? 'Downloading model…'
          : ai.status === 'unavailable'
            ? 'Not connected'
            : ai.status === 'error'
              ? `Error: ${ai.error || 'unknown'}`
              : 'Not configured'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-config-title"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/60 bg-[#0f1117] shadow-2xl shadow-black/50"
      >
        <div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-900/40 px-5 py-3.5">
          <h2 id="ai-config-title" className="text-base font-semibold text-slate-100">
            Configure AI
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto p-5">
          <div>
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">Hosted site:</strong> use{' '}
              <span className="text-cyan-400">Ollama Cloud</span> (server-side API key). Your PC&apos;s{' '}
              <code className="rounded bg-slate-800 px-1 text-slate-400">localhost:11434</code> is not
              reachable from App Hosting.
            </p>
            <p className="mt-1.5 text-xs text-slate-500">
              <strong className="text-slate-400">Local Ollama:</strong> run{' '}
              <code className="rounded bg-slate-800 px-1 text-slate-400">npm run dev</code>, open{' '}
              <code className="text-slate-400">http://localhost:3000</code>, then connect to{' '}
              <code className="text-slate-400">localhost:11434</code>.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusColor}`} />
            <span className="truncate text-[11px] text-slate-400">{statusLabel}</span>
          </div>

          {ai.status === 'downloading' && ai.pullProgress && ai.pullProgress.progress >= 0 && (
            <div>
              <div className="h-1.5 w-full rounded-full bg-slate-700">
                <div
                  className="h-1.5 rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${ai.pullProgress.progress}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                {ai.pullProgress.status} — {ai.pullProgress.progress}%
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-slate-500">Host</label>
              <input
                type="text"
                value={hostInput}
                onChange={(e) => {
                  setHostInput(e.target.value)
                  setValidationHint(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleConnect()
                }}
                placeholder="localhost"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-[10px] text-slate-500">Port</label>
              <input
                type="text"
                value={portInput}
                onChange={(e) => {
                  setPortInput(e.target.value)
                  setValidationHint(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleConnect()
                }}
                placeholder={String(OLLAMA_DEFAULT_PORT)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={connecting || !hostInput.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500"
            >
              {connecting ? 'Connecting…' : ai.ollamaUrl ? 'Reconnect' : 'Connect'}
            </button>
            <button
              type="button"
              onClick={() => void handleConnectCloud()}
              disabled={connecting}
              className="rounded-lg border border-cyan-800/50 bg-cyan-950/40 px-3 py-2 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-900/40 disabled:opacity-50"
              title="Use Ollama Cloud via App Hosting (OLLAMA_API_KEY)"
            >
              Use Cloud
            </button>
          </div>

          {validationHint && (
            <p
              className={`text-[10px] ${
                validationHint.includes('LAN') ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {validationHint}
            </p>
          )}

          {ai.error && !validationHint && (
            <p className="text-[10px] text-red-400">{ai.error}</p>
          )}

          {ai.status === 'unavailable' &&
            ai.availableModels.length === 0 &&
            !ai.error?.includes('CORS') && (
              <p className="text-[10px] text-slate-600">
                Make sure Ollama is running: <code className="text-slate-500">ollama serve</code>
              </p>
            )}

          {ai.error?.includes('CORS') && (
            <div className="rounded-lg border border-amber-800/30 bg-amber-900/20 p-2">
              <p className="text-[10px] font-medium text-amber-300">CORS fix required</p>
              <code className="mt-1 block rounded bg-amber-950/40 px-2 py-1 font-mono text-[10px] text-amber-200/80">
                OLLAMA_ORIGINS=* ollama serve
              </code>
            </div>
          )}

          {ai.availableModels.length > 0 && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Model
              </label>
              <select
                value={ai.model}
                onChange={(e) => ai.selectModel(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
              >
                {ai.availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {ai.ollamaUrl && ai.status !== 'unknown' && (
            <button
              type="button"
              onClick={() => ai.disconnect()}
              className="text-[10px] text-slate-500 transition-colors hover:text-red-400"
            >
              Disconnect AI
            </button>
          )}

          <p className="text-[10px] text-slate-600">
            AI outputs are stored under your signed-in account in Firestore (private, owner-only). Sign
            in from the user menu for cloud privacy storage.
          </p>
        </div>
      </div>
    </div>
  )
}
