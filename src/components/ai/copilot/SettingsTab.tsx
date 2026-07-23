'use client'

import Link from 'next/link'
import { useAI } from '@/lib/ai/useAI'
import { AiPromptReveal } from '@/components/ai/AiPromptReveal'
import { AiGenerationHistory } from '@/components/ai/AiGenerationHistory'
import { HelperTip } from '@/components/ui/HelperTip'

export function SettingsTab({
  ai,
  connecting,
  onConnect,
  lastPrompt,
}: {
  ai: ReturnType<typeof useAI>
  connecting: boolean
  onConnect: () => void
  lastPrompt?: {
    mode: string
    system: string
    user: string
    at: number
    version: string
  } | null
}) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/30">
        <div className="mb-3 flex items-center gap-1.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Ollama Cloud
          </p>
          <HelperTip
            content="Uses Ollama Cloud with your API key (configure via the header AI button). No local host or port."
            label="About Ollama Cloud"
            testId="copilot-settings-cloud-help"
          />
        </div>

        <button
          onClick={onConnect}
          disabled={connecting}
          className="w-full mt-2 px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
        >
          {connecting ? 'Connecting…' : ai.status === 'available' ? 'Reconnect to Cloud' : 'Connect to Ollama Cloud'}
        </button>

        <div className="flex items-center gap-2 mt-3">
          <span className={`w-2 h-2 rounded-full ${
            ai.status === 'available' ? 'bg-emerald-400' :
            ai.status === 'checking' ? 'bg-amber-400 animate-pulse' :
            ai.status === 'downloading' ? 'bg-blue-400 animate-pulse' :
            'bg-red-400'
          }`} />
          <span className="text-[10px] text-slate-400">
            {ai.status === 'available' ? `Connected to Ollama Cloud` :
             ai.status === 'checking' ? 'Connecting…' :
             ai.status === 'downloading' ? 'Downloading model…' :
             ai.status === 'unavailable' ? 'Not connected' :
             ai.status === 'error' ? `Error: ${ai.error || 'unknown'}` :
             'Not configured'}
          </span>
        </div>

        {ai.statusNote && ai.status === 'available' && (
          <p className="text-[10px] text-emerald-400 mt-1">{ai.statusNote}</p>
        )}
        {ai.error && ai.status !== 'error' && ai.status !== 'available' && (
          <p className="text-[10px] text-red-400 mt-1">{ai.error}</p>
        )}

        {ai.ollamaUrl && ai.status !== 'unknown' && (
          <button
            onClick={() => ai.disconnect()}
            className="text-[10px] text-slate-500 hover:text-red-400 transition-colors mt-2"
          >
            Disconnect
          </button>
        )}
      </div>

      {ai.availableModels.length > 0 && (
        <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/30">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Model</p>
          <select
            value={ai.model}
            onChange={(e) => ai.selectModel(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            {ai.availableModels.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {ai.modelInfo && ai.model && (
            <div className="mt-2 space-y-1">
              {ai.modelInfo.contextLength && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-500">Context window</span>
                  <span className="text-slate-400">{ai.modelInfo.contextLength.toLocaleString()} tokens</span>
                </div>
              )}
              {ai.modelInfo.parameterSize && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-500">Parameters</span>
                  <span className="text-slate-400">{ai.modelInfo.parameterSize}</span>
                </div>
              )}
              {ai.modelInfo.quantizationLevel && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-500">Quantization</span>
                  <span className="text-slate-400">{ai.modelInfo.quantizationLevel}</span>
                </div>
              )}
              {ai.modelInfo.family && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-500">Family</span>
                  <span className="text-slate-400">{ai.modelInfo.family}</span>
                </div>
              )}
              {ai.modelInfo.sizeBytes && (
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-500">Size</span>
                  <span className="text-slate-400">{(ai.modelInfo.sizeBytes / 1073741824).toFixed(1)} GB</span>
                </div>
              )}
            </div>
          )}
          <p className="mt-1.5 text-[9px] text-slate-600">
            {ai.availableModels.length} model{ai.availableModels.length !== 1 ? 's' : ''} available
          </p>
        </div>
      )}

      <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/30">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">About</p>
          <HelperTip
            content="BioIntel Copilot uses Ollama Cloud with your API key. Configure the key via the header AI button, then connect. Traffic goes browser → this app's server → ollama.com (not local port 11434). Insights must cite loaded panels; sparse data triggers a refuse-and-gap response."
            label="About Copilot"
            testId="copilot-settings-about-help"
            maxWidth="20rem"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/how-it-works"
            className="inline-block text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            View prompts & algorithms →
          </Link>
          <Link
            href="/ai-history"
            className="inline-block text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            My AI history →
          </Link>
        </div>
      </div>

      {lastPrompt && (
        <AiPromptReveal
          system={lastPrompt.system}
          user={lastPrompt.user}
          mode={lastPrompt.mode}
          version={lastPrompt.version}
          className="mt-1"
          testId="copilot-last-prompt"
          label="Last prompt sent to the model (learn the protocol)"
        />
      )}
      <AiGenerationHistory
        kind="copilot"
        className="mt-2"
        testId="copilot-ai-history"
      />
    </div>
  )
}
