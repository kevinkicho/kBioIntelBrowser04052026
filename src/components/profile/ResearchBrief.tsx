'use client'

/**
 * Research Intelligence Brief — structured free-API summary + optional AI prose.
 * Full transparency: why available, method, data used, AI prompt/context.
 */

import { useMemo, useState } from 'react'
import { HelperTip } from '@/components/ui/HelperTip'
import { clientFetch } from '@/lib/clientFetch'
import {
  buildOllamaBriefSystemPrompt,
  buildOllamaPrompt,
  buildStructuredBrief,
  type StructuredBrief,
} from '@/lib/aiSummarizer'
import { useAI } from '@/lib/ai/useAI'
import { AiPromptReveal } from '@/components/ai/AiPromptReveal'
import { persistAiGeneration } from '@/lib/ai/aiHistoryStore'

interface Props {
  data: Record<string, unknown>
  moleculeName: string
  /** PubChem CID when known — for history context */
  cid?: number | null
}

const sentimentColors: Record<string, string> = {
  positive: 'border-l-emerald-500 bg-emerald-950/20',
  neutral: 'border-l-slate-500 bg-slate-900/30',
  caution: 'border-l-amber-500 bg-amber-950/20',
  warning: 'border-l-red-500 bg-red-950/20',
}

export function ResearchBrief({ data, moleculeName, cid }: Props) {
  const ai = useAI()
  const [expanded, setExpanded] = useState(false)
  const [showMethod, setShowMethod] = useState(true)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiMeta, setAiMeta] = useState<{
    model?: string
    viaCloud?: boolean
    generatedAt?: string
  } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const brief: StructuredBrief = useMemo(
    () => buildStructuredBrief(data, moleculeName),
    [data, moleculeName],
  )

  const aiSystem = useMemo(() => buildOllamaBriefSystemPrompt(), [])
  const aiUserPrompt = useMemo(
    () => buildOllamaPrompt(brief, moleculeName),
    [brief, moleculeName],
  )

  if (brief.sections.length === 0) return null

  async function handleAiBrief() {
    if (!ai.model || (!ai.ollamaUrl && !ai.hasUserApiKey)) {
      setAiError('Connect Ollama (header AI) and select a model first.')
      return
    }
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await clientFetch('/api/ai-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiUserPrompt,
          model: ai.model,
          ollamaUrl: ai.ollamaUrl,
          ...(ai.ollamaApiKey ? { ollamaApiKey: ai.ollamaApiKey } : {}),
        }),
      })
      const result = (await res.json()) as {
        error?: string
        fallback?: boolean
        message?: string
        summary?: string
        viaCloud?: boolean
      }
      if (result.error) {
        setAiError(result.error)
        void persistAiGeneration({
          kind: 'other',
          mode: 'research_intelligence_brief',
          content: '',
          error: result.error,
          context: { name: moleculeName, cid: cid ?? undefined },
          model: ai.model ?? undefined,
          ollamaUrl: ai.ollamaUrl,
          promptSystem: aiSystem,
          promptUser: aiUserPrompt,
        })
      } else if (result.fallback) {
        setAiError(result.message || 'AI unavailable — structured brief only.')
      } else if (result.summary) {
        setAiSummary(result.summary)
        setAiMeta({
          model: ai.model ?? undefined,
          viaCloud: result.viaCloud,
          generatedAt: new Date().toISOString(),
        })
        void persistAiGeneration({
          kind: 'other',
          mode: 'research_intelligence_brief',
          content: result.summary,
          context: { name: moleculeName, cid: cid ?? undefined },
          model: ai.model ?? undefined,
          ollamaUrl: ai.ollamaUrl,
          promptSystem: aiSystem,
          promptUser: aiUserPrompt,
          task: {
            structuredHeadline: brief.headline,
            sectionTitles: brief.sections.map((s) => s.title),
            dataFieldCount: brief.provenance.dataUsed.length,
          },
        })
      }
    } catch {
      setAiError('Failed to connect to AI service.')
    } finally {
      setAiLoading(false)
    }
  }

  const p = brief.provenance

  return (
    <div className="mb-6" data-testid="research-intelligence-brief">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between bg-gradient-to-r from-indigo-950/40 to-slate-900/60 border border-indigo-800/30 rounded-xl px-5 py-3 hover:border-indigo-700/50 transition-all group"
        data-testid="research-brief-toggle"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg shrink-0" aria-hidden>
            🧠
          </span>
          <div className="text-left min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Research Intelligence Brief
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{brief.headline}</p>
            <p className="text-[9px] text-slate-600 mt-0.5">
              Free-API structured summary
              {aiSummary ? ' · + optional AI prose' : ''} · expand for method & sources
            </p>
          </div>
        </div>
        <span
          className={`text-slate-500 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div className="mt-2 bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4 animate-[fadeSlideIn_0.2s_ease-out]">
          {/* Why / how transparency (always first for understanding) */}
          <div
            className="rounded-lg border border-slate-700/80 bg-slate-950/50 overflow-hidden"
            data-testid="research-brief-method"
          >
            <button
              type="button"
              onClick={() => setShowMethod((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-semibold text-indigo-300 hover:bg-slate-900/60"
            >
              <span>Why this exists · how it is reasoned · what data was used</span>
              <span className="text-slate-600">{showMethod ? 'Hide' : 'Show'}</span>
            </button>
            {showMethod && (
              <div className="space-y-3 border-t border-slate-800 px-3 py-3 text-[11px] text-slate-400 leading-relaxed">
                <MethodBlock title="Why this information is available">{p.whyAvailable}</MethodBlock>
                <MethodBlock title="Structured brief method (no AI)">{p.structuredMethod}</MethodBlock>
                <MethodBlock title="Optional AI method">{p.aiMethod}</MethodBlock>
                <MethodBlock title="What AI receives if you generate">{p.aiInputDescription}</MethodBlock>
                <MethodBlock title="Free sources">{p.freeSourcesNote}</MethodBlock>

                {p.dataUsed.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                      Data bags used in this session
                    </p>
                    <ul className="max-h-36 overflow-y-auto space-y-1 rounded border border-slate-800 bg-slate-950/40 p-2">
                      {p.dataUsed.map((d) => (
                        <li
                          key={d.field}
                          className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[10px]"
                        >
                          <span className="text-slate-300">{d.field}</span>
                          <span className="text-indigo-300/90 tabular-nums">{d.count}</span>
                          <span className="w-full text-[9px] text-slate-600 normal-case">
                            → {d.usedIn}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Caveats
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-200/80">
                    {p.caveats.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm font-medium leading-snug text-slate-100">{brief.headline}</p>

          {/* AI Summary */}
          {aiSummary ? (
            <div
              className="bg-indigo-950/30 border border-indigo-800/30 rounded-lg p-4 space-y-2"
              data-testid="research-brief-ai-summary"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  AI-generated synthesis
                </span>
                {aiMeta?.model && (
                  <span className="font-mono text-[9px] text-slate-500">{aiMeta.model}</span>
                )}
                {aiMeta?.viaCloud && (
                  <span className="text-[9px] text-slate-600">via cloud</span>
                )}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {aiSummary}
              </p>
              <p className="text-[9px] text-slate-600 leading-relaxed">
                This prose was produced by your connected model from the structured bullets only
                (see method above). It is not a regulatory record and is not of-record Discover
                ranking. Verify every claim against free-API panels.
              </p>
              <AiPromptReveal
                system={aiSystem}
                user={aiUserPrompt}
                mode="research_intelligence_brief"
                version="aiBrief@v1"
                label="Show exact prompt sent to the model"
                testId="research-brief-ai-prompt"
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                type="button"
                onClick={() => void handleAiBrief()}
                disabled={aiLoading || !ai.model}
                className="text-xs bg-indigo-600/80 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 w-fit"
                data-testid="research-brief-ai-run"
              >
                {aiLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>Generate AI synthesis</>
                )}
              </button>
              <span className="text-[10px] text-slate-600 leading-snug">
                Optional. Uses your Ollama model + only the structured free-API facts below. Review
                prompt before/after via method panel.
              </span>
            </div>
          )}

          {aiError && (
            <p
              className="text-xs text-amber-400/80 bg-amber-950/20 border border-amber-800/20 rounded-lg px-3 py-2"
              role="alert"
            >
              {aiError}
            </p>
          )}

          {!aiSummary && (
            <AiPromptReveal
              system={aiSystem}
              user={aiUserPrompt}
              mode="research_intelligence_brief"
              version="aiBrief@v1"
              label="Preview prompt that would be sent (before generate)"
              testId="research-brief-ai-prompt-preview"
            />
          )}

          {/* Structured brief sections */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Structured free-API brief (deterministic)
            </p>
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
                  <ul className="space-y-1.5">
                    {section.bullets.map((bullet, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-300"
                      >
                        <span className="mt-0.5 shrink-0 text-slate-600" aria-hidden>
                          •
                        </span>
                        <span className="min-w-0 break-words whitespace-pre-wrap">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  {section.sourceFields && section.sourceFields.length > 0 && (
                    <p className="mt-2 text-[9px] font-mono text-slate-600">
                      Fields: {section.sourceFields.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-600">
            <span>
              Structured brief built at {new Date(brief.generatedAt).toLocaleString()}
              {aiMeta?.generatedAt
                ? ` · AI at ${new Date(aiMeta.generatedAt).toLocaleString()}`
                : ''}
            </span>
            <HelperTip
              content="Not clinical / regulatory decision support. Evidence-first brief from free public sources only."
              label="About this research brief"
              testId="research-brief-disclaimer"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MethodBlock({ title, children }: { title: string; children: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-indigo-300/90 mb-0.5">{title}</p>
      <p className="text-[11px] text-slate-400 leading-relaxed">{children}</p>
    </div>
  )
}
