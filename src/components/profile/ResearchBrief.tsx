'use client'

import { useState, useMemo } from 'react'
import { clientFetch } from '@/lib/clientFetch'
import { buildStructuredBrief, buildOllamaPrompt, type StructuredBrief } from '@/lib/aiSummarizer'

interface Props {
  data: Record<string, unknown>
  moleculeName: string
}

const sentimentColors: Record<string, string> = {
  positive: 'border-l-emerald-500 bg-emerald-950/20',
  neutral: 'border-l-slate-500 bg-slate-900/30',
  caution: 'border-l-amber-500 bg-amber-950/20',
  warning: 'border-l-red-500 bg-red-950/20',
}

export function ResearchBrief({ data, moleculeName }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const brief: StructuredBrief = useMemo(
    () => buildStructuredBrief(data, moleculeName),
    [data, moleculeName]
  )

  // Don't render if we have no meaningful data
  if (brief.sections.length === 0) return null

  async function handleAiBrief() {
    setAiLoading(true)
    setAiError(null)
    try {
      const prompt = buildOllamaPrompt(brief, moleculeName)
      const res = await clientFetch('/api/ai-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const result = await res.json()
      if (result.fallback) {
        setAiError(result.message)
      } else {
        setAiSummary(result.summary)
      }
    } catch {
      setAiError('Failed to connect to AI service.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="mb-6">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between bg-gradient-to-r from-indigo-950/40 to-slate-900/60 border border-indigo-800/30 rounded-xl px-5 py-3 hover:border-indigo-700/50 transition-all group"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🧠</span>
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Research Intelligence Brief
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
              {brief.headline}
            </p>
          </div>
        </div>
        <span className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4 animate-[fadeSlideIn_0.2s_ease-out]">
          {/* Headline */}
          <p className="text-sm font-medium text-slate-200">{brief.headline}</p>

          {/* AI Summary Section */}
          {aiSummary ? (
            <div className="bg-indigo-950/30 border border-indigo-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">✨ AI-Generated Summary</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{aiSummary}</p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleAiBrief}
                disabled={aiLoading}
                className="text-xs bg-indigo-600/80 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                {aiLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>✨ Generate AI Brief</>
                )}
              </button>
              <span className="text-[10px] text-slate-600">Requires local Ollama instance</span>
            </div>
          )}

          {aiError && (
            <p className="text-xs text-amber-400/80 bg-amber-950/20 border border-amber-800/20 rounded-lg px-3 py-2">
              {aiError}
            </p>
          )}

          {/* Structured brief sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {brief.sections.map((section, i) => (
              <div
                key={i}
                className={`border-l-2 rounded-r-lg px-4 py-3 ${sentimentColors[section.sentiment]}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{section.emoji}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </span>
                </div>
                <ul className="space-y-1">
                  {section.bullets.map((bullet, j) => (
                    <li key={j} className="text-xs text-slate-400 leading-relaxed flex items-start gap-1.5">
                      <span className="text-slate-600 mt-0.5 shrink-0">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-[9px] text-slate-600 text-right">
            Brief generated at {new Date(brief.generatedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}
