'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useAI } from '@/lib/ai/useAI'
import { persistAiGeneration } from '@/lib/ai/aiHistoryStore'
import { AiRegenerateModal } from '@/components/ai/AiRegenerateModal'
import {
  type DiseaseDetailContext,
  type DiseaseIntelligenceMode,
  DISEASE_INTELLIGENCE_MODES,
  buildDiseaseIntelligencePrompt,
  diseasePromptParameters,
} from '@/lib/ai/diseasePrompts'
import { buildDiscoverHref } from '@/lib/discovery/discoverUrl'
import { renderInsightMarkdown } from '@/lib/sanitize'

interface ModeState {
  content: string
  isStreaming: boolean
  wasTriggered: boolean
  prompt: { system: string; user: string } | null
  customQuestion?: string
}

interface DiseaseIntelligencePanelProps {
  context: DiseaseDetailContext
}

const emptyMode = (): ModeState => ({
  content: '',
  isStreaming: false,
  wasTriggered: false,
  prompt: null,
})

export function DiseaseIntelligencePanel({ context }: DiseaseIntelligencePanelProps) {
  const ai = useAI()
  const [activeTab, setActiveTab] = useState<DiseaseIntelligenceMode>('summary')
  const [modes, setModes] = useState<Record<DiseaseIntelligenceMode, ModeState>>(() => ({
    summary: emptyMode(),
    repurposing: emptyMode(),
    gap: emptyMode(),
    connections: emptyMode(),
    custom: emptyMode(),
  }))
  const [showPrompt, setShowPrompt] = useState(false)
  const [regenOpen, setRegenOpen] = useState(false)
  const [customDraft, setCustomDraft] = useState('')
  const [followUp, setFollowUp] = useState('')
  const mountedRef = useRef(true)
  const autoSummaryRef = useRef(false)
  const streamingModeRef = useRef<DiseaseIntelligenceMode | null>(null)
  const streamGenRef = useRef(0)

  const aiAvailable = ai.enabled && ai.status === 'available'
  const hasSomeData =
    context.genes.length > 0 ||
    context.drugInterventions.length > 0 ||
    context.molecules.length > 0

  const topTargets = context.genes
    .slice(0, 5)
    .map((g) => g.geneSymbol)
    .filter(Boolean)

  const discoverHref = buildDiscoverHref({
    q: context.diseaseName,
    diseaseId: context.diseaseId,
    targets: topTargets.length > 0 ? topTargets : undefined,
  })

  const params = useMemo(() => diseasePromptParameters(context), [context])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      ai.cancelAskAI()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount cancel only
  }, [])

  const streamMode = useCallback(
    async (mode: DiseaseIntelligenceMode, customQuestion?: string) => {
      // Cost guard: one stream at a time; cancel previous
      ai.cancelAskAI()
      const gen = ++streamGenRef.current
      streamingModeRef.current = mode

      const prompts = buildDiseaseIntelligencePrompt(mode, context, customQuestion)
      setModes((prev) => {
        const next = { ...prev }
        // Clear streaming flags on other modes
        for (const k of Object.keys(next) as DiseaseIntelligenceMode[]) {
          next[k] = {
            ...next[k],
            isStreaming: k === mode,
            ...(k === mode
              ? {
                  wasTriggered: true,
                  content: '',
                  prompt: prompts,
                  customQuestion,
                }
              : {}),
          }
        }
        return next
      })

      try {
        const { emitProductEvent } = await import('@/lib/productEvents')
        emitProductEvent('ui_surface_action', {
          surface: 'disease_intelligence',
          action: 'stream_start',
          mode,
          disease: context.diseaseName,
        })
      } catch {
        /* ignore */
      }

      let full = ''
      try {
        for await (const token of ai.askAI([
          { role: 'system', content: prompts.system },
          { role: 'user', content: prompts.user },
        ])) {
          if (!mountedRef.current || gen !== streamGenRef.current) break
          full += token
          setModes((prev) => ({
            ...prev,
            [mode]: { ...prev[mode], content: full },
          }))
        }
      } catch {
        if (gen === streamGenRef.current) {
          full += '\n\n*[Error: Analysis interrupted]*'
          if (mountedRef.current) {
            setModes((prev) => ({
              ...prev,
              [mode]: { ...prev[mode], content: full },
            }))
          }
        }
      }

      if (gen !== streamGenRef.current) return

      if (full.trim()) {
        void persistAiGeneration({
          kind: 'disease',
          mode: `disease_${mode}`,
          content: full,
          context: {
            name: context.diseaseName,
            diseaseId: context.diseaseId,
          },
          model: ai.model,
          ollamaUrl: ai.ollamaUrl,
          promptSystem: prompts.system,
          promptUser: prompts.user,
        })
      }

      if (mountedRef.current) {
        setModes((prev) => ({
          ...prev,
          [mode]: { ...prev[mode], isStreaming: false, content: full },
        }))
      }
      if (streamingModeRef.current === mode) streamingModeRef.current = null
    },
    [ai, context],
  )

  // Cost guard: no auto-spend of the user's Ollama Cloud key.
  // Summary runs only when the user clicks Generate (see handleGenerate).
  useEffect(() => {
    if (!aiAvailable || !hasSomeData) return
    autoSummaryRef.current = true
  }, [aiAvailable, hasSomeData])

  const active = modes[activeTab]
  const meta = DISEASE_INTELLIGENCE_MODES.find((m) => m.id === activeTab)!

  function handleGenerate() {
    if (active.isStreaming || ai.isChatStreaming) return
    if (activeTab === 'custom' && !customDraft.trim()) return
    void streamMode(activeTab, activeTab === 'custom' ? customDraft.trim() : undefined)
  }

  function handleFollowUp() {
    const q = followUp.trim()
    if (!q || active.isStreaming || ai.isChatStreaming) return
    setActiveTab('custom')
    setCustomDraft(q)
    setFollowUp('')
    void streamMode('custom', q)
  }

  function handleStop() {
    streamGenRef.current += 1
    streamingModeRef.current = null
    ai.cancelAskAI()
    setModes((prev) => {
      const next = { ...prev }
      for (const k of Object.keys(next) as DiseaseIntelligenceMode[]) {
        next[k] = { ...next[k], isStreaming: false }
      }
      return next
    })
  }

  return (
    <section className="mb-8" data-testid="disease-intelligence-panel">
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h2 className="text-xl font-semibold text-slate-100">Disease Intelligence</h2>
        {aiAvailable && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800/50">
            AI-Powered
          </span>
        )}
        <Link
          href={discoverHref}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-900/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:border-emerald-500 hover:bg-emerald-900/50 hover:text-emerald-200"
          data-testid="disease-intelligence-discover-cta"
        >
          Rank candidates in Discover
          <span aria-hidden>→</span>
        </Link>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Evidence-bound synthesis over genes, trial drugs, and molecules for this disease — not a
        clinical prediction.
      </p>

      {!aiAvailable && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <span className="text-sm text-slate-400">
              Connect Ollama to enable AI-powered disease analysis
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Connect Ollama or Cloud via the AI button in the top bar to unlock intelligence features.
          </p>
        </div>
      )}

      {aiAvailable && !hasSomeData && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
          <p className="text-sm text-slate-500">
            No gene, drug, or molecule data available to analyze. AI insights will appear when data
            is present.
          </p>
        </div>
      )}

      {aiAvailable && hasSomeData && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 overflow-hidden">
          {/* Tabs */}
          <div
            className="flex flex-wrap gap-1 border-b border-slate-800 bg-slate-950/40 p-1.5"
            role="tablist"
            data-testid="disease-intel-tabs"
          >
            {DISEASE_INTELLIGENCE_MODES.map((m) => {
              const st = modes[m.id]
              const activeTabOn = activeTab === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTabOn}
                  onClick={() => setActiveTab(m.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    activeTabOn
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                  data-testid={`disease-intel-tab-${m.id}`}
                >
                  {m.shortLabel}
                  {st.wasTriggered && !st.isStreaming && st.content ? (
                    <span className="ml-1 text-emerald-300">✓</span>
                  ) : null}
                  {st.isStreaming ? <span className="ml-1 text-indigo-200">…</span> : null}
                </button>
              )
            })}
          </div>

          <div className="p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  {meta.title}
                  {active.isStreaming && <StreamingDots />}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{meta.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPrompt((s) => !s)}
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-[10px] text-slate-400 hover:text-indigo-300 hover:border-indigo-700/50"
                  data-testid="disease-intel-show-prompt"
                >
                  {showPrompt ? 'Hide prompt' : 'Show prompt'}
                </button>
                {active.isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="rounded-lg border border-amber-800/50 bg-amber-950/40 px-3 py-1.5 text-[11px] font-medium text-amber-200 hover:bg-amber-900/50 transition-colors"
                    data-testid="disease-intel-stop"
                  >
                    Stop
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(activeTab !== 'summary' || active.wasTriggered || !active.content) && (
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={activeTab === 'custom' && !customDraft.trim()}
                        className="rounded-lg bg-indigo-600/90 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 px-3 py-1.5 text-[11px] font-medium text-white transition-colors"
                        data-testid="disease-intel-generate"
                      >
                        {active.wasTriggered ? 'Quick re-run' : 'Generate'}
                      </button>
                    )}
                    {active.wasTriggered && (
                      <button
                        type="button"
                        onClick={() => setRegenOpen(true)}
                        className="rounded-lg border border-indigo-700/50 px-3 py-1.5 text-[11px] text-indigo-200 hover:bg-indigo-950/40"
                        data-testid="disease-intel-regenerate"
                      >
                        Regenerate…
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {activeTab === 'custom' && (
              <div className="mb-4 space-y-1.5" data-testid="disease-intel-custom">
                <label className="block text-[10px] font-medium text-slate-400">
                  Your research question
                </label>
                <textarea
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  rows={3}
                  placeholder={`e.g. Which of the top genes for ${context.diseaseName} lack trial drugs, and what modalities could address them?`}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-600 focus:outline-none"
                />
              </div>
            )}

            {showPrompt && (
              <PromptTransparency
                mode={activeTab}
                prompt={
                  active.prompt ??
                  buildDiseaseIntelligencePrompt(
                    activeTab,
                    context,
                    activeTab === 'custom' ? customDraft : undefined,
                  )
                }
                params={params}
                customQuestion={
                  activeTab === 'custom' ? customDraft || active.customQuestion : undefined
                }
              />
            )}

            {(() => {
              const live =
                active.prompt ??
                buildDiseaseIntelligencePrompt(
                  activeTab,
                  context,
                  activeTab === 'custom' ? customDraft : undefined,
                )
              return (
                <AiRegenerateModal
                  open={regenOpen}
                  onClose={() => setRegenOpen(false)}
                  kind="disease"
                  mode={`disease_${activeTab}`}
                  title="Regenerate disease intelligence"
                  systemPrompt={live.system}
                  userPrompt={live.user}
                  contextKey={context.diseaseName}
                  busy={active.isStreaming}
                  allowOverrideSystem
                  onLoadEntry={(entry) => {
                    setModes((prev) => ({
                      ...prev,
                      [activeTab]: {
                        ...prev[activeTab],
                        content: entry.content,
                        wasTriggered: true,
                        isStreaming: false,
                        prompt:
                          entry.promptSystem || entry.promptUser
                            ? {
                                system: entry.promptSystem || '',
                                user: entry.promptUser || '',
                              }
                            : prev[activeTab].prompt,
                      },
                    }))
                    setRegenOpen(false)
                  }}
                  onRegenerate={async ({ system, user }) => {
                    // Stream with overridden prompts via temporary custom path
                    ai.cancelAskAI()
                    const gen = ++streamGenRef.current
                    streamingModeRef.current = activeTab
                    setModes((prev) => ({
                      ...prev,
                      [activeTab]: {
                        ...prev[activeTab],
                        isStreaming: true,
                        wasTriggered: true,
                        content: '',
                        prompt: { system, user },
                      },
                    }))
                    let full = ''
                    try {
                      for await (const token of ai.askAI([
                        { role: 'system', content: system },
                        { role: 'user', content: user },
                      ])) {
                        if (!mountedRef.current || gen !== streamGenRef.current) break
                        full += token
                        setModes((prev) => ({
                          ...prev,
                          [activeTab]: { ...prev[activeTab], content: full },
                        }))
                      }
                    } catch {
                      full += '\n\n*[Error: Analysis interrupted]*'
                    }
                    if (gen !== streamGenRef.current) return
                    if (full.trim()) {
                      void persistAiGeneration({
                        kind: 'disease',
                        mode: `disease_${activeTab}`,
                        content: full,
                        context: {
                          name: context.diseaseName,
                          diseaseId: context.diseaseId,
                        },
                        model: ai.model,
                        ollamaUrl: ai.ollamaUrl,
                        promptSystem: system,
                        promptUser: user,
                      })
                    }
                    if (mountedRef.current) {
                      setModes((prev) => ({
                        ...prev,
                        [activeTab]: {
                          ...prev[activeTab],
                          isStreaming: false,
                          content: full,
                        },
                      }))
                    }
                    setRegenOpen(false)
                  }}
                  testId="disease-intel-regen-modal"
                />
              )
            })()}

            <div
              className="disease-intel-body mt-2 min-h-[4rem]"
              data-testid="disease-intel-body"
            >
              {active.isStreaming && !active.content && <ShimmerBlock />}
              {active.content ? (
                <div
                  className="insight-markdown text-sm text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: renderInsightMarkdown(active.content),
                  }}
                />
              ) : (
                !active.isStreaming && (
                  <div
                    className="rounded-lg border border-dashed border-slate-700/80 bg-slate-950/40 px-4 py-5 text-center"
                    data-testid="disease-intel-empty"
                  >
                    <p className="text-sm text-slate-300 font-medium mb-1">
                      {activeTab === 'custom'
                        ? 'Write a research question, then generate'
                        : `Generate ${meta.shortLabel.toLowerCase()} analysis`}
                    </p>
                    <p className="text-xs text-slate-500 mb-3 max-w-md mx-auto leading-relaxed">
                      Uses your Ollama Cloud key and the genes, trial drugs, and molecules already
                      loaded for this disease — not a clinical prediction. Nothing runs until you
                      click Generate.
                    </p>
                    {activeTab !== 'custom' && (
                      <button
                        type="button"
                        onClick={handleGenerate}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-medium text-white transition-colors"
                        data-testid="disease-intel-generate-empty"
                      >
                        Generate {meta.shortLabel}
                      </button>
                    )}
                  </div>
                )
              )}
              {active.wasTriggered && !active.isStreaming && !active.content && (
                <p className="text-xs text-slate-500 mt-2">No analysis generated. Try again.</p>
              )}
            </div>

            {/* Follow-up / more questions */}
            <div className="mt-5 border-t border-slate-800 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Ask another question
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFollowUp()
                  }}
                  placeholder="Generate more insight with a follow-up question…"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-600 focus:outline-none"
                  data-testid="disease-intel-followup"
                />
                <button
                  type="button"
                  onClick={handleFollowUp}
                  disabled={active.isStreaming || !followUp.trim()}
                  className="rounded-lg border border-indigo-700/50 bg-indigo-950/40 px-3 py-2 text-[11px] font-medium text-indigo-200 hover:bg-indigo-900/50 disabled:opacity-40"
                >
                  Ask
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  `What is the strongest therapeutic gap for ${context.diseaseName}?`,
                  'Which trial drugs miss the highest-scoring genes?',
                  'Suggest 3 free-API follow-up queries for this disease.',
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setActiveTab('custom')
                      setCustomDraft(q)
                      void streamMode('custom', q)
                    }}
                    disabled={active.isStreaming}
                    className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] text-slate-500 hover:text-slate-300 hover:border-slate-500 disabled:opacity-40 max-w-full truncate"
                    title={q}
                  >
                    {q.length > 48 ? `${q.slice(0, 46)}…` : q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .insight-markdown .insight-h{font-weight:600;color:#e2e8f0;margin:.85rem 0 .35rem;font-size:.9rem}
        .insight-markdown .insight-p{margin:.45rem 0;line-height:1.65;color:#cbd5e1}
        .insight-markdown .insight-ul,.insight-markdown .insight-ol{margin:.4rem 0 .6rem 1.1rem;padding:0}
        .insight-markdown .insight-ol{list-style:decimal}
        .insight-markdown .insight-ul{list-style:disc}
        .insight-markdown .insight-li{margin:.25rem 0;line-height:1.55;color:#cbd5e1}
        .insight-markdown .insight-pre,.insight-markdown .insight-wire{display:block;margin:.35rem 0;padding:.5rem .65rem;border-radius:.5rem;border:1px solid #1e293b;background:#020617;font-family:ui-monospace,monospace;font-size:.7rem;color:#94a3b8;white-space:pre-wrap;overflow-x:auto}
        .insight-markdown .insight-code{font-family:ui-monospace,monospace;font-size:.75em;padding:.1em .35em;border-radius:.25rem;background:#1e293b;color:#a5b4fc}
        .insight-markdown strong{color:#f1f5f9;font-weight:600}
      `,
        }}
      />
    </section>
  )
}

function PromptTransparency({
  mode,
  prompt,
  params,
  customQuestion,
}: {
  mode: DiseaseIntelligenceMode
  prompt: { system: string; user: string }
  params: Record<string, string | number>
  customQuestion?: string
}) {
  return (
    <div
      className="mb-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-2"
      data-testid="disease-intel-prompt"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Prompt used · mode={mode}
        {customQuestion ? ` · question set` : ''}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(params).map(([k, v]) => (
          <span
            key={k}
            className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] text-slate-500"
            title={`${k}=${v}`}
          >
            <span className="text-slate-600">{k}=</span>
            {String(v).length > 28 ? `${String(v).slice(0, 26)}…` : String(v)}
          </span>
        ))}
      </div>
      <details className="text-[10px] text-slate-500">
        <summary className="cursor-pointer text-indigo-400/90 hover:text-indigo-300">
          System prompt ({prompt.system.length} chars)
        </summary>
        <pre className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap rounded border border-slate-800 bg-black/40 p-2 text-[9px] text-slate-500">
          {prompt.system.slice(0, 5000)}
          {prompt.system.length > 5000 ? '\n…' : ''}
        </pre>
      </details>
      <details className="text-[10px] text-slate-500">
        <summary className="cursor-pointer text-indigo-400/90 hover:text-indigo-300">
          User prompt + data block ({prompt.user.length} chars)
        </summary>
        <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-slate-800 bg-black/40 p-2 text-[9px] text-slate-500">
          {prompt.user.slice(0, 8000)}
          {prompt.user.length > 8000 ? '\n…' : ''}
        </pre>
      </details>
      <Link href="/how-it-works" className="inline-block text-[10px] text-indigo-400 hover:underline">
        How AI is wired →
      </Link>
    </div>
  )
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-0.5 ml-1">
      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  )
}

function ShimmerBlock() {
  return (
    <div className="space-y-2 mt-2">
      <div className="h-3 bg-slate-800/80 rounded w-full animate-pulse" />
      <div className="h-3 bg-slate-800/80 rounded w-5/6 animate-pulse" />
      <div className="h-3 bg-slate-800/80 rounded w-4/6 animate-pulse" />
    </div>
  )
}
