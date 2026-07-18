'use client'

/**
 * Configure AI — Ollama Cloud + user API key only.
 * No local host/port / 11434 UI.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAI } from '@/lib/ai/useAI'
import { maskApiKey } from '@/lib/ai/userApiKey'
import { useFirebaseAuth } from '@/lib/firebase/FirebaseProvider'

interface AIConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AIConfigModal({ isOpen, onClose }: AIConfigModalProps) {
  const ai = useAI()
  const auth = useFirebaseAuth()
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [keySaving, setKeySaving] = useState(false)
  const [keyHint, setKeyHint] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [validationHint, setValidationHint] = useState<string | null>(null)
  const [celebrateConnect, setCelebrateConnect] = useState(false)
  const prevStatusRef = useRef(ai.status)

  useEffect(() => {
    if (!isOpen) return
    setApiKeyInput('')
    setKeyHint(null)
    setShowApiKey(false)
    setCelebrateConnect(false)
    setValidationHint(null)
    prevStatusRef.current = ai.status
  }, [isOpen, ai.status])

  useEffect(() => {
    if (!isOpen) return
    const prev = prevStatusRef.current
    prevStatusRef.current = ai.status
    if (ai.status === 'available' && prev !== 'available') {
      setCelebrateConnect(true)
      const t = window.setTimeout(() => setCelebrateConnect(false), 2800)
      return () => window.clearTimeout(t)
    }
  }, [isOpen, ai.status])

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

  const handleSaveApiKey = async () => {
    const t = apiKeyInput.trim()
    if (!t) {
      setKeyHint('Paste a non-empty API key from ollama.com')
      return
    }
    setKeySaving(true)
    setKeyHint(null)
    try {
      await ai.setOllamaApiKey(t)
      setApiKeyInput('')
      setKeyHint(
        auth.user
          ? 'Saved under your account and this browser.'
          : 'Saved in this browser. Sign in to store it under your account.',
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
      setKeyHint('API key cleared.')
    } finally {
      setKeySaving(false)
    }
  }

  const handleConnect = async () => {
    setValidationHint(null)
    // Persist key from input first if user typed one this session
    if (apiKeyInput.trim()) {
      setKeySaving(true)
      await ai.setOllamaApiKey(apiKeyInput.trim())
      setKeySaving(false)
      setApiKeyInput('')
    }
    const hasKey = ai.hasUserApiKey || Boolean(apiKeyInput.trim())
    if (!hasKey) {
      setValidationHint(
        'Paste your Ollama Cloud API key above and save it, then connect. Get a key at ollama.com/settings/keys.',
      )
      return
    }
    setConnecting(true)
    await ai.connect()
    setConnecting(false)
  }

  if (!isOpen || typeof document === 'undefined') return null

  const statusDot =
    ai.status === 'available'
      ? 'bg-emerald-400'
      : ai.status === 'checking' || ai.status === 'downloading'
        ? 'bg-amber-400 animate-pulse'
        : ai.status === 'error' || ai.status === 'unavailable'
          ? 'bg-red-400'
          : 'bg-slate-500'

  const statusLabel =
    ai.status === 'available'
      ? `Connected to Ollama Cloud${ai.model ? ` · ${ai.model}` : ''}`
      : ai.status === 'checking'
        ? 'Connecting to Ollama Cloud…'
        : ai.status === 'downloading'
          ? 'Downloading model…'
          : ai.status === 'unavailable'
            ? 'Not connected'
            : ai.status === 'error'
              ? `Error: ${ai.error || 'unknown'}`
              : 'Not configured'

  const statusTextClass =
    ai.status === 'available'
      ? 'text-emerald-300'
      : ai.status === 'error' || ai.status === 'unavailable'
        ? 'text-red-300'
        : 'text-slate-400'

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4"
      data-testid="ai-config-modal-root"
    >
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
            <p className="text-xs text-slate-400 leading-relaxed">
              BioIntel uses <strong className="text-slate-300">Ollama Cloud</strong> only. Your
              browser talks to this site’s server, which calls{' '}
              <code className="rounded bg-slate-800 px-1 text-slate-400">ollama.com</code> with{' '}
              <strong className="text-slate-300">your API key</strong>. Local Ollama (port 11434)
              is not configured in this app.
            </p>
          </div>

          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
              celebrateConnect
                ? 'border-emerald-600/50 bg-emerald-950/30'
                : 'border-slate-800 bg-slate-900/50'
            }`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium ${statusTextClass}`}>{statusLabel}</p>
              {ai.statusNote && (
                <p className="text-[10px] text-slate-500 mt-0.5">{ai.statusNote}</p>
              )}
              {ai.error && ai.status !== 'available' && (
                <p className="text-[10px] text-red-400/90 mt-0.5 leading-relaxed">{ai.error}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">
              Ollama Cloud API key
            </label>
            <p className="mb-2 text-[10px] text-slate-500 leading-relaxed">
              Create a key at{' '}
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
              >
                ollama.com
              </a>
              . Stored in this browser
              {auth.user ? ' and under your signed-in account' : ''} — never logged.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
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
                  placeholder={
                    ai.hasUserApiKey ? `Saved: ${maskApiKey(ai.ollamaApiKey)}` : 'Paste API key…'
                  }
                  autoComplete="off"
                  data-testid="ai-api-key-input"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="rounded-lg border border-slate-700 px-2 text-[10px] text-slate-400 hover:text-slate-200"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSaveApiKey()}
                disabled={keySaving || !apiKeyInput.trim()}
                className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-600 disabled:opacity-40"
                data-testid="ai-api-key-save"
              >
                {keySaving ? 'Saving…' : 'Save key'}
              </button>
              {ai.hasUserApiKey && (
                <button
                  type="button"
                  onClick={() => void handleClearApiKey()}
                  disabled={keySaving}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-red-300"
                >
                  Clear key
                </button>
              )}
            </div>
            {keyHint && <p className="mt-1.5 text-[10px] text-slate-400">{keyHint}</p>}
          </div>

          {validationHint && (
            <p className="text-[11px] text-amber-400/90 leading-relaxed">{validationHint}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={connecting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500"
              data-testid="ai-connect-cloud"
            >
              {connecting
                ? 'Connecting…'
                : ai.status === 'available'
                  ? 'Reconnect to Cloud'
                  : 'Connect to Ollama Cloud'}
            </button>
            {ai.status === 'available' && (
              <button
                type="button"
                onClick={() => ai.disconnect()}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Disconnect
              </button>
            )}
          </div>

          {ai.availableModels.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Model</label>
              <select
                value={ai.model}
                onChange={(e) => ai.selectModel(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                data-testid="ai-model-select"
              >
                {ai.availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              {ai.modelInfo && (
                <p className="mt-1.5 text-[10px] text-slate-500">
                  {[
                    ai.modelInfo.parameterSize,
                    ai.modelInfo.family,
                    ai.modelInfo.quantizationLevel,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
