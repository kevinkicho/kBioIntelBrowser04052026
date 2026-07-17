'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAI } from '@/lib/ai/useAI'
import { validateOllamaUrl, OLLAMA_DEFAULT_PORT } from '@/lib/ai/config'
import { maskApiKey } from '@/lib/ai/userApiKey'
import { canBrowserCallLocalHttp, isLocalOrLanOllamaUrl } from '@/lib/ai/localTransport'
import { useFirebaseAuth } from '@/lib/firebase/FirebaseProvider'

interface AIConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

/** Local Ollama form defaults — always port 11434 (Ollama standard). */
function localFormDefaults(ollamaUrl?: string): { host: string; port: string } {
  if (ollamaUrl && isLocalOrLanOllamaUrl(ollamaUrl)) {
    try {
      const raw = ollamaUrl.includes('://') ? ollamaUrl : `http://${ollamaUrl}`
      const u = new URL(raw)
      return {
        host: u.hostname || '127.0.0.1',
        // Ollama listens on 11434 when port omitted
        port: u.port || String(OLLAMA_DEFAULT_PORT),
      }
    } catch {
      /* fall through */
    }
  }
  // Cloud / empty / invalid → local defaults (never ollama.com:11434)
  return { host: '127.0.0.1', port: String(OLLAMA_DEFAULT_PORT) }
}

/**
 * Modal for Ollama / Ollama Cloud connection (replaces homepage AIBanner card).
 */
export function AIConfigModal({ isOpen, onClose }: AIConfigModalProps) {
  const ai = useAI()
  const auth = useFirebaseAuth()
  const initial = localFormDefaults(ai.ollamaUrl)
  const [hostInput, setHostInput] = useState(initial.host)
  const [portInput, setPortInput] = useState(initial.port)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [keySaving, setKeySaving] = useState(false)
  const [keyHint, setKeyHint] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [validationHint, setValidationHint] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const d = localFormDefaults(ai.ollamaUrl)
    setHostInput(d.host)
    setPortInput(d.port)
    // Do not prefill raw key into the input; show blank until user pastes a new one
    setApiKeyInput('')
    setKeyHint(null)
    setShowApiKey(false)
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

  const handleConnect = async () => {
    // Empty / invalid port → Ollama default 11434
    const trimmedPort = portInput.trim()
    const portNum = trimmedPort === '' ? OLLAMA_DEFAULT_PORT : parseInt(trimmedPort, 10)
    const port =
      isNaN(portNum) || portNum < 1 || portNum > 65535 ? OLLAMA_DEFAULT_PORT : portNum
    if (String(port) !== portInput) setPortInput(String(port))
    const host = hostInput.trim() || '127.0.0.1'
    const fullUrl = `${host}:${port}`
    const validation = validateOllamaUrl(fullUrl)
    if (!validation.valid) {
      setValidationHint(validation.error || 'Invalid URL')
      return
    }
    if (validation.warning === 'lan-warning') {
      setValidationHint(
        'LAN Ollama: browser will call this host directly. Ensure Ollama allows CORS (OLLAMA_ORIGINS=*) on that machine.',
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
    let hasKey = ai.hasUserApiKey
    // Persist key from input first if user typed one this session
    if (apiKeyInput.trim()) {
      setKeySaving(true)
      await ai.setOllamaApiKey(apiKeyInput.trim())
      setKeySaving(false)
      setApiKeyInput('')
      hasKey = true
    }
    if (!hasKey) {
      setValidationHint(
        'Paste your Ollama Cloud API key above (from ollama.com), save it, then click Use Cloud. Without a key, the server may use a shared app key if configured.',
      )
    }
    setConnecting(true)
    await ai.connect('https://ollama.com')
    setConnecting(false)
  }

  const handleSaveApiKey = async () => {
    const t = apiKeyInput.trim()
    if (!t) {
      setKeyHint('Paste a non-empty API key')
      return
    }
    setKeySaving(true)
    setKeyHint(null)
    try {
      await ai.setOllamaApiKey(t)
      setApiKeyInput('')
      setKeyHint(
        auth.user
          ? 'Saved under your account (Firestore) and this browser.'
          : 'Saved in this browser. Sign in to store it under your user in the cloud.',
      )
    } finally {
      setKeySaving(false)
    }
  }

  const handleClearApiKey = async () => {
    setKeySaving(true)
    setKeyHint(null)
    try {
      await ai.clearOllamaApiKey()
      setApiKeyInput('')
      setKeyHint('Your Ollama API key was removed from this browser and your cloud settings.')
    } finally {
      setKeySaving(false)
    }
  }

  const statusColor =
    ai.status === 'available'
      ? 'bg-emerald-400'
      : ai.status === 'checking' || ai.status === 'downloading'
        ? 'bg-amber-400 animate-pulse'
        : ai.status === 'error' || ai.status === 'unavailable'
          ? 'bg-red-400'
          : 'bg-slate-500'

  const pageAllowsLocalHttp = typeof window !== 'undefined' ? canBrowserCallLocalHttp() : true
  const statusLabel =
    ai.status === 'available'
      ? `Connected to ${ai.ollamaUrl}${ai.transport === 'browser' ? ' · this PC' : ai.transport === 'server' && ai.ollamaUrl.includes('ollama.com') ? ' · cloud' : ''}`
      : ai.status === 'checking'
        ? 'Connecting…'
        : ai.status === 'downloading'
          ? 'Downloading model…'
          : ai.status === 'unavailable'
            ? 'Not connected'
            : ai.status === 'error'
              ? `Error: ${ai.error || 'unknown'}`
              : 'Not configured'

  const handleConnectLocal = async () => {
    setValidationHint(null)
    setHostInput('127.0.0.1')
    setPortInput(String(OLLAMA_DEFAULT_PORT))
    setConnecting(true)
    await ai.connect(`127.0.0.1:${OLLAMA_DEFAULT_PORT}`)
    setConnecting(false)
  }

  // Portal to body so sticky header z-40 stacking does not bury the overlay
  if (!isOpen || typeof document === 'undefined') return null

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4"
      data-testid="ai-config-modal-root"
    >
      {/* Full-viewport dim + blur; click away closes */}
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default border-0 bg-slate-950/75 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close AI settings"
        data-testid="ai-config-backdrop"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-config-title"
        className="relative z-10 flex w-full max-w-lg max-h-[min(100dvh,100vh)] sm:max-h-[min(100dvh-2rem,100vh-2rem)] flex-col overflow-hidden rounded-t-2xl border border-slate-700/60 bg-[#0f1117] shadow-2xl shadow-black/50 sm:my-auto sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Sticky header so close stays reachable when body scrolls */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800/60 bg-slate-900 px-5 py-3.5">
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
          <div>
            <p className="text-xs text-slate-400">
              <strong className="text-slate-300">Ollama on this PC:</strong> the app talks to Ollama{' '}
              <em>from your browser</em> (not the cloud server). Host{' '}
              <code className="rounded bg-slate-800 px-1 text-slate-400">127.0.0.1</code> or{' '}
              <code className="rounded bg-slate-800 px-1 text-slate-400">localhost</code>, port{' '}
              <code className="rounded bg-slate-800 px-1 text-slate-400">11434</code>.
            </p>
            {!pageAllowsLocalHttp && (
              <p className="mt-1.5 text-xs text-amber-400/90 leading-relaxed">
                You are on <strong>HTTPS</strong> — browsers block{' '}
                <code className="text-amber-200">http://127.0.0.1</code> and{' '}
                <code className="text-amber-200">http://localhost</code> the same way (mixed content).
                Typing 127.0.0.1 does not bypass that. To use local models: run{' '}
                <code className="text-amber-200">npm run dev</code> and open{' '}
                <code className="text-amber-200">http://localhost:3000</code>, or use Ollama Cloud with
                your API key below on this site.
              </p>
            )}
            {pageAllowsLocalHttp && (
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                If Connect fails, allow CORS on Ollama:{' '}
                <code className="text-slate-400">$env:OLLAMA_ORIGINS=&quot;*&quot;; ollama serve</code>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusColor}`} />
            <span className="truncate text-[11px] text-slate-400">{statusLabel}</span>
          </div>

          {/* Per-user Ollama Cloud API key */}
          <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/90">
                Your Ollama Cloud API key
              </p>
              {ai.hasUserApiKey && (
                <span className="font-mono text-[10px] text-slate-500" title="Key is stored">
                  saved {maskApiKey(ai.ollamaApiKey)}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Create a key at{' '}
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
              >
                ollama.com
              </a>
              . It is sent only to our AI proxy for your requests, preferred over any app default key.
              Sign in to store it under{' '}
              <code className="text-slate-400">users/…/settings/ai</code> (owner-only).
            </p>
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value)
                  setKeyHint(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSaveApiKey()
                }}
                placeholder={ai.hasUserApiKey ? 'Paste new key to replace…' : 'Paste API key…'}
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-300 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                data-testid="ai-api-key-input"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="shrink-0 rounded-lg border border-slate-700 px-2 py-2 text-[10px] text-slate-400 hover:text-slate-200"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSaveApiKey()}
                disabled={keySaving || !apiKeyInput.trim()}
                className="rounded-lg bg-cyan-800/80 px-3 py-1.5 text-xs font-medium text-cyan-50 hover:bg-cyan-700 disabled:bg-slate-700 disabled:text-slate-500"
                data-testid="ai-api-key-save"
              >
                {keySaving ? 'Saving…' : 'Save key'}
              </button>
              {ai.hasUserApiKey && (
                <button
                  type="button"
                  onClick={() => void handleClearApiKey()}
                  disabled={keySaving}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-red-800 hover:text-red-300 disabled:opacity-50"
                  data-testid="ai-api-key-clear"
                >
                  Remove key
                </button>
              )}
            </div>
            {keyHint && <p className="text-[10px] text-cyan-300/80">{keyHint}</p>}
            {!auth.user && (
              <p className="text-[10px] text-amber-400/80">
                Not signed in — key stays on this device only until you sign in.
              </p>
            )}
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
                placeholder="127.0.0.1"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-[10px] text-slate-500">
                Port <span className="text-slate-600">(default {OLLAMA_DEFAULT_PORT})</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={portInput}
                onChange={(e) => {
                  setPortInput(e.target.value)
                  setValidationHint(null)
                }}
                onBlur={() => {
                  if (!portInput.trim()) setPortInput(String(OLLAMA_DEFAULT_PORT))
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
              onClick={() => void handleConnectLocal()}
              disabled={connecting}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500"
              title="Connect to Ollama on this computer at 127.0.0.1:11434"
              data-testid="ai-connect-local"
            >
              {connecting ? 'Connecting…' : 'Use my Ollama (11434)'}
            </button>
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
              title="Connect to Ollama Cloud using your saved API key (or app fallback)"
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
            Your API key and AI outputs are stored under your signed-in account in Firestore (private,
            owner-only). Delete all cloud data from the user menu if you want them wiped.
          </p>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
