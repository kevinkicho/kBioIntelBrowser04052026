'use client'

import { useState } from 'react'
import { useAI } from '@/lib/ai/useAI'

export function AIBanner() {
  const ai = useAI()
  const [urlInput, setUrlInput] = useState(ai.ollamaUrl || 'localhost:11434')
  const [connecting, setConnecting] = useState(false)

  if (!ai.mounted) return null

  if (ai.enabled && ai.status === 'available') return null

  if (ai.status === 'checking') {
    return (
      <div className="w-full max-w-2xl mx-auto mb-4 px-4">
        <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-indigo-900/40 border border-indigo-700/40 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p className="text-xs text-indigo-300">Connecting to {ai.ollamaUrl}...</p>
          </div>
        </div>
      </div>
    )
  }

  if (ai.status === 'downloading') {
    return (
      <div className="w-full max-w-2xl mx-auto mb-4 px-4">
        <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-indigo-900/40 border border-indigo-700/40 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-indigo-200">Downloading AI Model...</h3>
              {ai.pullProgress && ai.pullProgress.progress >= 0 && (
                <div className="mt-2">
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${ai.pullProgress.progress}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{ai.pullProgress.status} — {ai.pullProgress.progress}%</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleConnect = async () => {
    setConnecting(true)
    await ai.connect(urlInput)
    setConnecting(false)
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-4 px-4">
      <div className="bg-gradient-to-r from-slate-900/60 via-indigo-900/20 to-slate-900/60 border border-slate-700/40 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-300">AI Mode — Not Connected</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter your Ollama server address to enable local AI. 100% local, no data leaves your machine.
            </p>

            <div className="mt-3 flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && urlInput.trim()) handleConnect() }}
                  placeholder="localhost:11434"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
              <button
                onClick={handleConnect}
                disabled={connecting || !urlInput.trim()}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>

            {ai.error && (
              <p className="text-[10px] text-red-400 mt-2">{ai.error}</p>
            )}

            {ai.status === 'unavailable' && ai.availableModels.length === 0 && !ai.error?.includes('CORS') && (
              <p className="text-[10px] text-slate-600 mt-2">
                Make sure Ollama is running: <code className="text-slate-500">ollama serve</code>
              </p>
            )}

            {ai.error?.includes('CORS') && (
              <div className="mt-2 p-2 rounded-lg bg-amber-900/20 border border-amber-800/30">
                <p className="text-[10px] text-amber-300 font-medium">CORS Fix Required</p>
                <p className="text-[10px] text-amber-400/70 mt-0.5">
                  Set environment variable before starting Ollama:
                </p>
                <code className="block text-[10px] text-amber-200/80 mt-1 font-mono bg-amber-950/40 px-2 py-1 rounded">
                  OLLAMA_ORIGINS=* ollama serve
                </code>
              </div>
            )}

            {ai.pullProgress && ai.pullProgress.progress >= 0 && (
              <div className="mt-2">
                <div className="w-full bg-slate-700 rounded-full h-1.5">
                  <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${ai.pullProgress.progress}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{ai.pullProgress.status} — {ai.pullProgress.progress}%</p>
              </div>
            )}
          </div>
          {ai.ollamaUrl && (
            <button
              onClick={() => ai.disconnect()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-400 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  )
}