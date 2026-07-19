'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAI } from '@/lib/ai/useAI'
import {
  useAICopilot,
  type CopilotMessage,
  type GenerateInsightOptions,
} from '@/hooks/useAICopilot'
import { renderSimpleMarkdown } from '@/lib/sanitize'
import { sessionHistory } from '@/lib/sessionHistory'
import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'
import {
  filterGaps,
  type RetrievalGap,
  type RetrievalSnapshot,
} from '@/lib/ai/retrievalMonitor'

interface Props {
  categoryData: Partial<Record<CategoryId, Record<string, unknown>>>
  categoryStatus: Record<CategoryId, CategoryLoadState>
  fetchedAt: Partial<Record<CategoryId, Date>>
  identity: {
    name: string
    cid: number
    molecularWeight?: number
    inchiKey?: string
    iupacName?: string
    geneSymbol?: string
  }
  diseaseName?: string
  /** Soft re-fetch a category (profile). */
  refreshCategory?: (categoryId: CategoryId) => void
  /** Initial load for idle categories. */
  loadCategory?: (categoryId: CategoryId) => void
  /** Jump profile UI to a panel (hash / tab). */
  onNavigateToPanel?: (panelId: string, categoryId: CategoryId) => void
}

export function AICopilot(props: Props) {
  return <AICopilotInner {...props} />
}

function AICopilotInner({
  categoryData,
  categoryStatus,
  fetchedAt,
  identity,
  diseaseName,
  refreshCategory,
  loadCategory,
  onNavigateToPanel,
}: Props) {
  const actions = useMemo(
    () => ({ refreshCategory, loadCategory }),
    [refreshCategory, loadCategory],
  )
  const copilot = useAICopilot(
    categoryData,
    categoryStatus,
    fetchedAt,
    identity,
    diseaseName,
    actions,
  )
  const ai = useAI()
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [compareCount, setCompareCount] = useState(sessionHistory.getCount())
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setCompareCount(sessionHistory.getCount())
  }, [copilot.messages])

  useEffect(() => {
    setCompareCount(sessionHistory.getCount())
  }, [ai.ollamaUrl])

  const handleConnect = async () => {
    setConnecting(true)
    await ai.connect()
    setConnecting(false)
  }

  const showFab = true
  // Disable the fab while category data is still loading. Opening the copilot
  // mid-fetch sends partial data to the model and tends to produce confusing
  // output (and made the user anxious about crashes). Re-enable once at least
  // one category has finished loading.
  const anyLoading = Object.values(categoryStatus).some(s => s === 'loading')
  const anyLoaded = Object.values(categoryStatus).some(s => s === 'loaded')
  const fabDisabled = anyLoading && !anyLoaded

  return (
    <>
      {!isOpen && showFab && (
        <button
          onClick={() => { if (!fabDisabled) setIsOpen(true) }}
          disabled={fabDisabled}
          aria-disabled={fabDisabled}
          className={`fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full text-white shadow-lg shadow-indigo-900/40 flex items-center justify-center transition-all group ${
            fabDisabled
              ? 'bg-slate-700 opacity-50 cursor-not-allowed'
              : 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:scale-105'
          }`}
          title={fabDisabled ? 'Loading molecule data — copilot ready in a moment…' : 'Open BioIntel Copilot'}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          {fabDisabled && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-slate-400 rounded-full animate-pulse border-2 border-slate-900" />
          )}
          {!fabDisabled && copilot.isStreaming && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full animate-pulse border-2 border-slate-900" />
          )}
          {!fabDisabled && !copilot.aiAvailable && !copilot.isStreaming && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-900" />
          )}
          {!fabDisabled && copilot.aiAvailable && !copilot.isStreaming && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
          )}
        </button>
      )}

      {isOpen && (
        <div className="fixed right-4 top-16 bottom-4 w-[380px] z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl border border-slate-800/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/40 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">BioIntel Copilot</span>
              {copilot.isStreaming && (
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex border-b border-slate-800/40">
            {(['monitor', 'insights', 'ask', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => copilot.setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  copilot.activeTab === tab
                    ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-950/20'
                    : tab === 'settings' && !copilot.aiAvailable
                      ? 'text-amber-500 hover:text-amber-400'
                      : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                {tab === 'monitor' ? `Monitor${copilot.snapshot.gaps.length > 0 ? ` (${copilot.snapshot.gaps.length})` : ''}` : tab === 'insights' ? 'Insights' : tab === 'ask' ? 'Ask' : 'Settings'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {copilot.activeTab === 'monitor' && (
              <MonitorTab
                snapshot={copilot.snapshot}
                onRetryCategory={(catId) => refreshCategory?.(catId)}
                onLoadCategory={(catId) => loadCategory?.(catId)}
                onOpenPanel={(panelId, catId) => onNavigateToPanel?.(panelId, catId)}
              />
            )}

            {copilot.activeTab === 'insights' && (
              <InsightsTab
                messages={copilot.messages.filter(m => m.mode !== 'free_qa' && m.mode !== 'followup')}
                isStreaming={copilot.isStreaming}
                onGenerate={copilot.generateInsight}
                aiAvailable={copilot.aiAvailable}
                hasComparisons={compareCount > 1}
                isDiseaseContext={!!copilot.isDiseaseContext}
                isGeneContext={!!copilot.isGeneContext}
                previousMolecules={sessionHistory.getRecentMolecules(8).filter(m => m.name !== identity.name).map(m => m.name)}
              />
            )}

            {copilot.activeTab === 'ask' && (
              <AskTab
                messages={copilot.messages.filter(m => m.mode === 'free_qa' || m.mode === 'followup')}
                isStreaming={copilot.isStreaming}
                aiAvailable={copilot.aiAvailable}
                onAsk={(q) => { copilot.askQuestion(q); setInputValue('') }}
                previousMolecules={sessionHistory.getRecentMolecules(5).filter(m => m.name !== identity.name).map(m => m.name)}
                isDiseaseContext={!!copilot.isDiseaseContext}
                isGeneContext={!!copilot.isGeneContext}
                geneSymbol={identity.geneSymbol}
              />
            )}

            {copilot.activeTab === 'settings' && (
              <SettingsTab
                ai={ai}
                connecting={connecting}
                onConnect={handleConnect}
                lastPrompt={copilot.lastPrompt}
              />
            )}
          </div>

          <div className="border-t border-slate-800/40 p-3 bg-slate-900/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputValue.trim()) {
                    copilot.askQuestion(inputValue.trim())
                    setInputValue('')
                    copilot.setActiveTab('ask')
                  }
                }}
                placeholder={copilot.aiAvailable
                  ? copilot.isDiseaseContext
                    ? 'Ask about these diseases...'
                    : copilot.isGeneContext
                      ? `Ask about gene ${identity.geneSymbol}...`
                      : 'Ask about this molecule...'
                  : 'Connect Ollama Cloud in Settings first'}
                className="flex-1 text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                disabled={!copilot.aiAvailable || copilot.isStreaming}
              />
              <button
                onClick={() => {
                  if (inputValue.trim()) {
                    copilot.askQuestion(inputValue.trim())
                    setInputValue('')
                    copilot.setActiveTab('ask')
                  }
                }}
                disabled={!copilot.aiAvailable || copilot.isStreaming || !inputValue.trim()}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
              >
                Send
              </button>
              {copilot.isStreaming && (
                <button
                  onClick={copilot.stopStreaming}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-red-600/80 hover:bg-red-500 text-white transition-colors"
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function gapDotClass(reason: RetrievalGap['reason']): string {
  if (reason === 'error') return 'bg-red-400'
  if (reason === 'timeout') return 'bg-orange-400'
  if (reason === 'empty') return 'bg-amber-400'
  if (reason === 'pending') return 'bg-slate-500'
  return 'bg-slate-600'
}

function MonitorTab({
  snapshot,
  onRetryCategory,
  onLoadCategory,
  onOpenPanel,
}: {
  snapshot: RetrievalSnapshot
  onRetryCategory?: (categoryId: CategoryId) => void
  onLoadCategory?: (categoryId: CategoryId) => void
  onOpenPanel?: (panelId: string, categoryId: CategoryId) => void
}) {
  const [gapFilter, setGapFilter] = useState<
    'all' | 'empty' | 'failed' | 'pending' | 'actionable'
  >('actionable')
  const filteredGaps = useMemo(
    () => filterGaps(snapshot.gaps, gapFilter),
    [snapshot.gaps, gapFilter],
  )
  const failedCount = snapshot.totalApisErrored + snapshot.totalApisTimeout
  const pct = Math.round(snapshot.overallCompleteness * 100)

  return (
    <div className="space-y-3" data-testid="copilot-monitor">
      <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Data retrieval
          </span>
          <span className="text-[10px] text-slate-500" title="Share of terminal outcomes with data">
            {pct}% with data
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div>
            <p className="text-base font-bold text-emerald-400">{snapshot.totalApisSucceeded}</p>
            <p className="text-[8px] text-slate-500 uppercase">With data</p>
          </div>
          <div>
            <p className="text-base font-bold text-amber-400">{snapshot.totalApisEmpty}</p>
            <p className="text-[8px] text-slate-500 uppercase">Empty</p>
          </div>
          <div>
            <p className="text-base font-bold text-red-400">{failedCount}</p>
            <p className="text-[8px] text-slate-500 uppercase">Failed</p>
          </div>
          <div>
            <p className="text-base font-bold text-slate-400">{snapshot.totalApisPending}</p>
            <p className="text-[8px] text-slate-500 uppercase">Pending</p>
          </div>
        </div>
        <p className="mt-2 text-[9px] text-slate-600 leading-relaxed">
          Empty = retrieved, no rows (honest). Failed = timeout/error (retry). Pending = not loaded
          yet.
        </p>
      </div>

      {Object.entries(snapshot.categories).map(([catId, cat]) => (
        <div
          key={catId}
          className="bg-slate-900/40 rounded-lg px-3 py-2 border border-slate-800/30"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-slate-300 truncate">
              {cat.label || catId}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-slate-500">
                {cat.successPanels}/{cat.totalPanels}
              </span>
              <StatusDot status={cat.loadState} />
              {(cat.errorPanels > 0 || cat.timeoutPanels > 0 || cat.loadState === 'error') &&
                onRetryCategory && (
                  <button
                    type="button"
                    onClick={() => onRetryCategory(catId as CategoryId)}
                    className="text-[9px] text-amber-300 hover:text-amber-200 underline"
                    data-testid={`monitor-retry-${catId}`}
                  >
                    Retry
                  </button>
                )}
              {cat.loadState === 'idle' && onLoadCategory && (
                <button
                  type="button"
                  onClick={() => onLoadCategory(catId as CategoryId)}
                  className="text-[9px] text-indigo-300 hover:text-indigo-200 underline"
                >
                  Load
                </button>
              )}
            </div>
          </div>
          {(cat.loadState === 'loaded' || cat.loadState === 'error') && (
            <div className="mt-1.5 w-full bg-slate-800 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all ${
                  cat.completeness >= 0.8
                    ? 'bg-emerald-500'
                    : cat.completeness >= 0.4
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${Math.round(cat.completeness * 100)}%` }}
              />
            </div>
          )}
          {(cat.emptyPanels > 0 || cat.errorPanels > 0 || cat.timeoutPanels > 0) && (
            <p className="mt-1 text-[9px] text-slate-600">
              {cat.emptyPanels > 0 && <span className="text-amber-500/80">{cat.emptyPanels} empty </span>}
              {cat.timeoutPanels > 0 && (
                <span className="text-orange-400/80">{cat.timeoutPanels} timeout </span>
              )}
              {cat.errorPanels > 0 && <span className="text-red-400/80">{cat.errorPanels} error</span>}
            </p>
          )}
        </div>
      ))}

      <div className="bg-amber-950/20 rounded-lg p-3 border border-amber-800/30">
        <div className="flex items-center justify-between mb-2 gap-2">
          <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
            Gaps ({filteredGaps.length}/{snapshot.gaps.length})
          </p>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {(
            [
              ['actionable', 'Actionable'],
              ['failed', 'Failed'],
              ['empty', 'Empty'],
              ['pending', 'Pending'],
              ['all', 'All'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setGapFilter(id)}
              className={`text-[9px] px-1.5 py-0.5 rounded border ${
                gapFilter === id
                  ? 'border-amber-600/60 bg-amber-900/40 text-amber-200'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
              data-testid={`monitor-gap-filter-${id}`}
            >
              {label}
            </button>
          ))}
        </div>
        {filteredGaps.length === 0 ? (
          <p className="text-[10px] text-slate-500">No gaps in this filter.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {filteredGaps.slice(0, 40).map((gap, i) => (
              <div
                key={`${gap.panelKey}-${i}`}
                className="flex items-start gap-2 group"
                title={gap.detail}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${gapDotClass(gap.reason)}`}
                />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={!gap.panelId || !onOpenPanel}
                    onClick={() => {
                      if (gap.panelId && onOpenPanel) {
                        onOpenPanel(gap.panelId, gap.categoryId)
                      }
                    }}
                    className="text-[10px] text-slate-300 text-left hover:text-cyan-300 disabled:hover:text-slate-300 truncate block w-full"
                  >
                    {gap.title}
                  </button>
                  <p className="text-[9px] text-slate-600 truncate">{gap.detail}</p>
                </div>
                <span className="text-[8px] text-slate-600 uppercase shrink-0">{gap.reason}</span>
                {gap.actionable &&
                  (gap.reason === 'error' || gap.reason === 'timeout') &&
                  onRetryCategory && (
                    <button
                      type="button"
                      onClick={() => onRetryCategory(gap.categoryId)}
                      className="text-[8px] text-amber-400 hover:text-amber-200 shrink-0"
                    >
                      Retry
                    </button>
                  )}
                {gap.reason === 'pending' && onLoadCategory && (
                  <button
                    type="button"
                    onClick={() => onLoadCategory(gap.categoryId)}
                    className="text-[8px] text-indigo-400 hover:text-indigo-200 shrink-0"
                  >
                    Load
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {snapshot.anomalies.length > 0 && (
        <div className="bg-red-950/20 rounded-lg p-3 border border-red-800/30">
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">
            Anomalies
          </p>
          {snapshot.anomalies.map((a, i) => (
            <p key={i} className="text-[10px] text-red-300/70 mb-1">
              {a.message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function InsightsTab({
  messages,
  isStreaming,
  onGenerate,
  aiAvailable,
  hasComparisons,
  isDiseaseContext,
  isGeneContext,
  previousMolecules,
}: {
  messages: CopilotMessage[]
  isStreaming: boolean
  onGenerate: (mode: 'auto_insight' | 'executive_brief' | 'gap_analysis' | 'safety_deep_dive' | 'mechanism_analysis' | 'therapeutic_hypothesis' | 'competitive_position' | 'repurposing_scan' | 'cross_molecule_compare' | 'gene_therapeutic' | 'gene_repurposing' | 'gene_mechanism' | 'gene_target_assessment' | 'prior_art_query' | 'differential_safety' | 'suggest_next' | 'hypothesis_seed', opts?: GenerateInsightOptions) => void
  aiAvailable: boolean
  hasComparisons: boolean
  isDiseaseContext: boolean
  isGeneContext: boolean
  previousMolecules: string[]
}) {
  // State for the Plan-06 task widgets (only shown for molecule entities).
  const [diffTarget, setDiffTarget] = useState<string>('')
  const [hypothesisQuestion, setHypothesisQuestion] = useState<string>('')

  // Ensure the diff-target dropdown picks up newly-added molecules.
  useEffect(() => {
    if (diffTarget && !previousMolecules.includes(diffTarget)) {
      setDiffTarget('')
    }
  }, [previousMolecules, diffTarget])

  const showTasks = !isGeneContext && !isDiseaseContext
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {isGeneContext ? (
          <>
            <InsightButton label="Therapeutic Opportunity" onClick={() => onGenerate('gene_therapeutic')} disabled={isStreaming || !aiAvailable} icon="hypothesis" />
            <InsightButton label="Drug Repurposing" onClick={() => onGenerate('gene_repurposing')} disabled={isStreaming || !aiAvailable} icon="repurpose" />
            <InsightButton label="Mechanism Deep Dive" onClick={() => onGenerate('gene_mechanism')} disabled={isStreaming || !aiAvailable} icon="mechanism" />
            <InsightButton label="Target Assessment" onClick={() => onGenerate('gene_target_assessment')} disabled={isStreaming || !aiAvailable} icon="safety" />
            <InsightButton label="Gap Analysis" onClick={() => onGenerate('gap_analysis')} disabled={isStreaming || !aiAvailable} icon="gap" />
            <InsightButton label="Auto Insights" onClick={() => onGenerate('auto_insight')} disabled={isStreaming || !aiAvailable} icon="auto" />
          </>
        ) : isDiseaseContext ? (
          <>
            <InsightButton label="Executive Brief" onClick={() => onGenerate('executive_brief')} disabled={isStreaming || !aiAvailable} icon="brief" />
            <InsightButton label="Mechanism Analysis" onClick={() => onGenerate('mechanism_analysis')} disabled={isStreaming || !aiAvailable} icon="mechanism" />
            <InsightButton label="Repurposing Scan" onClick={() => onGenerate('repurposing_scan')} disabled={isStreaming || !aiAvailable} icon="repurpose" />
            <InsightButton label="Therapeutic Hypotheses" onClick={() => onGenerate('therapeutic_hypothesis')} disabled={isStreaming || !aiAvailable} icon="hypothesis" />
            <InsightButton label="Gap Analysis" onClick={() => onGenerate('gap_analysis')} disabled={isStreaming || !aiAvailable} icon="gap" />
            <InsightButton label="Auto Insights" onClick={() => onGenerate('auto_insight')} disabled={isStreaming || !aiAvailable} icon="auto" />
          </>
        ) : (
          <>
            <InsightButton label="Executive Brief" onClick={() => onGenerate('executive_brief')} disabled={isStreaming || !aiAvailable} icon="brief" />
            <InsightButton label="Safety Deep Dive" onClick={() => onGenerate('safety_deep_dive')} disabled={isStreaming || !aiAvailable} icon="safety" />
            <InsightButton label="Mechanism Analysis" onClick={() => onGenerate('mechanism_analysis')} disabled={isStreaming || !aiAvailable} icon="mechanism" />
            <InsightButton label="Repurposing Scan" onClick={() => onGenerate('repurposing_scan')} disabled={isStreaming || !aiAvailable} icon="repurpose" />
            <InsightButton label="Therapeutic Hypotheses" onClick={() => onGenerate('therapeutic_hypothesis')} disabled={isStreaming || !aiAvailable} icon="hypothesis" />
            <InsightButton label="Competitive Position" onClick={() => onGenerate('competitive_position')} disabled={isStreaming || !aiAvailable} icon="competitive" />
            <InsightButton label="Gap Analysis" onClick={() => onGenerate('gap_analysis')} disabled={isStreaming || !aiAvailable} icon="gap" />
            <InsightButton label="Auto Insights" onClick={() => onGenerate('auto_insight')} disabled={isStreaming || !aiAvailable} icon="auto" />
            {hasComparisons && (
              <InsightButton label="Compare Molecules" onClick={() => onGenerate('cross_molecule_compare')} disabled={isStreaming || !aiAvailable} icon="compare" />
            )}
          </>
        )}
      </div>

      {showTasks && (
        <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/30 space-y-2.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tasks</p>

          <div className="grid grid-cols-2 gap-2">
            <InsightButton label="Prior-Art Query" onClick={() => onGenerate('prior_art_query')} disabled={isStreaming || !aiAvailable} icon="patent" />
            <InsightButton label="Suggest Next" onClick={() => onGenerate('suggest_next')} disabled={isStreaming || !aiAvailable} icon="next" />
          </div>

          {/* Differential Safety: dropdown of recent molecules + run button. */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Differential Safety</label>
            <div className="flex gap-1.5">
              <select
                value={diffTarget}
                onChange={e => setDiffTarget(e.target.value)}
                disabled={isStreaming || !aiAvailable || previousMolecules.length === 0}
                className="flex-1 text-[10px] px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">{previousMolecules.length === 0 ? 'No previous molecules' : 'Pick a molecule…'}</option>
                {previousMolecules.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onGenerate('differential_safety', { diffTargetName: diffTarget })}
                disabled={isStreaming || !aiAvailable || !diffTarget}
                className="px-2.5 py-1.5 rounded-md text-[10px] font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
              >
                Diff
              </button>
            </div>
          </div>

          {/* Hypothesis Seed: free-text question + run button. */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Hypothesis Seed</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={hypothesisQuestion}
                onChange={e => setHypothesisQuestion(e.target.value)}
                placeholder="e.g. EGFR inhibitors in late-stage trials"
                disabled={isStreaming || !aiAvailable}
                className="flex-1 text-[10px] px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => onGenerate('hypothesis_seed', { researchQuestion: hypothesisQuestion })}
                disabled={isStreaming || !aiAvailable || !hypothesisQuestion.trim()}
                className="px-2.5 py-1.5 rounded-md text-[10px] font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
              >
                Seed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message list */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant'} />
      ))}

      {messages.length === 0 && !isStreaming && (
        <div className="text-center py-8">
          <p className="text-[10px] text-slate-500">Click a button above to generate AI insights</p>
          <p className="text-[10px] text-slate-600 mt-1">Insights auto-generate when 3+ categories load</p>
        </div>
      )}

      {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content && (
        <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse rounded-full" />
      )}
    </div>
  )
}

function AskTab({
  messages,
  isStreaming,
  aiAvailable,
  onAsk,
  previousMolecules,
  isDiseaseContext,
  isGeneContext,
  geneSymbol,
}: {
  messages: CopilotMessage[]
  isStreaming: boolean
  aiAvailable: boolean
  onAsk: (question: string) => void
  previousMolecules: string[]
  isDiseaseContext: boolean
  isGeneContext: boolean
  geneSymbol?: string
}) {
  const suggestions = isGeneContext
    ? [
        'What is this gene\'s primary therapeutic opportunity?',
        'Which drugs targeting this gene could be repurposed?',
        'What are the key safety concerns for targeting this gene?',
        'What pathways does this gene participate in?',
        'What experiments should a researcher run next?',
      ]
    : isDiseaseContext
      ? [
          'What molecules are most promising for this condition?',
          'What are the key mechanisms across these diseases?',
          'What repurposing opportunities exist?',
          'What are the main therapeutic gaps?',
          'Which gene targets are most druggable?',
        ]
      : [
          'What is the primary mechanism of action?',
          'Could this drug be repurposed for other diseases?',
          'Which adverse events are mechanism-related vs off-target?',
          'What data is missing or empty for this molecule, and should I retry anything?',
          'What experiments should a researcher run next?',
        ]

  if (!isGeneContext && !isDiseaseContext && previousMolecules.length > 0) {
    suggestions.push(`How does this compare to ${previousMolecules[0]}?`)
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-slate-500 leading-relaxed">
        Agentic Ask can use evidence tools (retrieval snapshot, panel samples, load/retry
        category) — max {5} steps, claim-bound only.
      </p>
      {messages.length === 0 && (
        <div className="text-center py-8">
          <p className="text-[10px] text-slate-500">
            {isGeneContext ? `Ask anything about gene ${geneSymbol}` : isDiseaseContext ? 'Ask anything about these diseases' : 'Ask anything about this molecule'}
          </p>
          <div className="mt-3 space-y-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onAsk(s)}
                disabled={!aiAvailable}
                className="block w-full text-left text-[10px] text-slate-400 hover:text-indigo-300 bg-slate-800/40 hover:bg-indigo-900/30 rounded px-3 py-1.5 border border-slate-700/20 hover:border-indigo-700/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant'} />
      ))}

      {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content && (
        <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse rounded-full" />
      )}

      {!aiAvailable && (
        <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3">
          <p className="text-[10px] text-amber-300">AI is not connected. Open Settings to connect.</p>
        </div>
      )}
    </div>
  )
}

function StatusDot({ status }: { status: CategoryLoadState }) {
  const color = status === 'loaded'
    ? 'bg-emerald-400'
    : status === 'loading'
    ? 'bg-amber-400 animate-pulse'
    : status === 'error'
    ? 'bg-red-400'
    : 'bg-slate-600'
  return <span className={`w-2 h-2 rounded-full ${color}`} />
}

function MessageBubble({ message, isStreaming }: { message: CopilotMessage; isStreaming: boolean }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="text-center py-1">
        <span className="text-[9px] text-slate-600 italic">{message.content}</span>
      </div>
    )
  }

  // Plan-06 task message: render the structured payload (the raw model output
  // is hidden behind a "Show raw output" disclosure for debugging).
  if (!isUser && message.task && !isStreaming) {
    return (
      <div className="mr-2">
        <TaskBubble task={message.task} rawContent={message.content} />
        {message.error && (
          <div className="mt-1.5 rounded-md px-3 py-2 text-[11px] leading-relaxed bg-red-950/30 border border-red-800/30 text-red-300">
            <span className="font-semibold">Stream error:</span> {message.error}
          </div>
        )}
      </div>
    )
  }

  // Plan-06 task validation failure: show the polite message instead of raw text.
  if (!isUser && message.validationError && !isStreaming) {
    return (
      <div className="mr-2">
        <div className="rounded-lg px-3 py-2 text-xs leading-relaxed bg-amber-950/30 border border-amber-800/30 text-amber-200">
          {message.validationError}
        </div>
        <details className="mt-1.5 text-[10px] text-slate-500">
          <summary className="cursor-pointer hover:text-slate-300">Show raw output</summary>
          <div className="mt-1 px-3 py-2 rounded-md bg-slate-900/40 border border-slate-800/30 text-slate-400 font-mono whitespace-pre-wrap break-words">
            {message.content || '(empty)'}
          </div>
        </details>
      </div>
    )
  }

  const rendered = isUser
    ? message.content
    : renderMarkdown(message.content || (isStreaming ? '' : '...'))

  return (
    <div className={`${isUser ? 'ml-6' : 'mr-2'}`}>
      {!isUser && message.tools && message.tools.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1" data-testid="copilot-tool-chips">
          {message.tools.map((t, i) => (
            <span
              key={`${t.name}-${i}`}
              title={t.summary}
              className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${
                t.ok
                  ? 'border-emerald-800/50 bg-emerald-950/40 text-emerald-300'
                  : 'border-red-800/50 bg-red-950/40 text-red-300'
              }`}
            >
              {t.ok ? '✓' : '✗'} {t.name}
            </span>
          ))}
        </div>
      )}
      <div
        className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
          isUser
            ? 'bg-indigo-600/20 border border-indigo-700/30 text-indigo-200'
            : 'bg-slate-900/40 border border-slate-800/30 text-slate-300'
        }`}
      >
        {isUser ? message.content || (isStreaming ? '' : '...') : rendered}
      </div>
      {message.error && (
        <div className="mt-1.5 mr-2 rounded-md px-3 py-2 text-[11px] leading-relaxed bg-red-950/30 border border-red-800/30 text-red-300">
          <span className="font-semibold">Stream error:</span> {message.error}
        </div>
      )}
      {isStreaming && !message.content && (
        <div className="flex gap-1 mt-1 px-3">
          <span
            className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      )}
    </div>
  )
}

function TaskBubble({ task, rawContent }: { task: NonNullable<CopilotMessage['task']>; rawContent: string }) {
  if (task.kind === 'prior_art') {
    return (
      <div className="rounded-lg px-3 py-2 text-xs leading-relaxed bg-slate-900/40 border border-slate-800/30 text-slate-300">
        <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold mb-1.5">Prior-art query</p>
        <code className="block font-mono text-[11px] bg-slate-950/60 border border-slate-800/40 rounded p-2 text-emerald-300 whitespace-pre-wrap break-words">{task.query}</code>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(task.query).catch(() => {}) }}
            className="text-[10px] text-slate-400 hover:text-indigo-300 transition-colors"
          >
            Copy
          </button>
          <a
            href={`https://patents.google.com/?q=${encodeURIComponent(task.query)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-400 hover:text-indigo-300 transition-colors"
          >
            Google Patents →
          </a>
          <a
            href={`https://europepmc.org/search?query=${encodeURIComponent(task.query)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-400 hover:text-indigo-300 transition-colors"
          >
            EuropePMC →
          </a>
        </div>
      </div>
    )
  }

  if (task.kind === 'diff_safety') {
    return (
      <div className="rounded-lg px-3 py-2 text-xs leading-relaxed bg-slate-900/40 border border-slate-800/30 text-slate-300">
        <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold mb-1.5">
          Differential safety: {task.currentName} vs {task.otherName}
        </p>
        <div className="space-y-2">
          {task.text.split(/\n\s*\n+/).map((p, i) => (
            <p key={i} className="text-xs leading-relaxed">{p}</p>
          ))}
        </div>
      </div>
    )
  }

  if (task.kind === 'suggest_next') {
    return (
      <div className="rounded-lg px-3 py-2 text-xs leading-relaxed bg-slate-900/40 border border-slate-800/30 text-slate-300">
        <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold mb-1.5">Suggested next entities</p>
        <ul className="space-y-1.5">
          {task.entities.map((e, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider ${
                e.type === 'molecule' ? 'bg-purple-900/40 text-purple-300' :
                e.type === 'gene' ? 'bg-emerald-900/40 text-emerald-300' :
                'bg-cyan-900/40 text-cyan-300'
              }`}>{e.type}</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-200">{e.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{e.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (task.kind === 'hypothesis_seed') {
    return (
      <div className="rounded-lg px-3 py-2 text-xs leading-relaxed bg-slate-900/40 border border-slate-800/30 text-slate-300">
        <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold mb-1.5">Hypothesis seed</p>
        <ul className="space-y-1 mb-2">
          {task.filters.map((f, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 font-mono">{f.axis}</span>
              <span className="text-slate-600">=</span>
              <span className="text-slate-200 font-medium">{f.value}</span>
            </li>
          ))}
        </ul>
        <Link
          href={task.url}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
        >
          Run in Hypothesis Builder →
        </Link>
      </div>
    )
  }

  // Fallback (should not happen).
  return <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">{rawContent}</pre>
}

function renderMarkdown(text: string) {
  const parts: React.ReactNode[] = []
  const lines = text.split('\n')
  let inList = false
  let listKey = 0
  let listType: 'ul' | 'ol' | null = null

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (/^[-*]\s/.test(raw)) {
      if (!inList || listType !== 'ul') {
        listType = 'ul'
        parts.push(<ul key={`list-${listKey++}`} className="list-disc list-inside space-y-0.5 ml-1" />)
        inList = true
      }
      const content = renderSimpleMarkdown(raw.replace(/^[-*]\s/, ''))
      parts.push(<li key={`li-${i}`} className="ml-2" dangerouslySetInnerHTML={{ __html: content }} />)
    } else if (/^\d+\.\s/.test(raw)) {
      if (!inList || listType !== 'ol') {
        listType = 'ol'
        parts.push(<ol key={`list-${listKey++}`} className="list-decimal list-inside space-y-0.5 ml-1" />)
        inList = true
      }
      const content = renderSimpleMarkdown(raw.replace(/^\d+\.\s/, ''))
      parts.push(<li key={`li-${i}`} className="ml-2" dangerouslySetInnerHTML={{ __html: content }} />)
    } else {
      inList = false
      listType = null
      if (raw.trim() === '') {
        parts.push(<br key={`br-${i}`} />)
      } else {
        const content = renderSimpleMarkdown(raw)
        parts.push(<span key={`line-${i}`} className="block" dangerouslySetInnerHTML={{ __html: content }} />)
      }
    }
  }

  return <>{parts}</>
}

function InsightButton({ label, onClick, disabled, icon }: { label: string; onClick: () => void; disabled: boolean; icon: string }) {
  const icons: Record<string, string> = { brief: '📋', safety: '🛡️', gap: '🔍', auto: '✨', mechanism: '🎯', hypothesis: '💡', competitive: '📊', repurpose: '🔄', compare: '⚗️', patent: '📜', next: '➡️' }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-medium bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 hover:border-indigo-700/40 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition-colors"
    >
      <span>{icons[icon] || '•'}</span>
      {label}
    </button>
  )
}

function SettingsTab({
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
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Ollama Cloud</p>
        <p className="text-[10px] text-slate-500 mb-3">
          Uses Ollama Cloud with your API key (configure via the header AI button). No local host or port.
        </p>

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
          <p className="text-[9px] text-slate-600 mt-1.5">
            {ai.availableModels.length} model{ai.availableModels.length !== 1 ? 's' : ''} available
          </p>
        </div>
      )}

      <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/30">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">About</p>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          BioIntel Copilot uses <span className="text-cyan-400">Ollama Cloud</span> with your API key.
          Configure the key via the header <strong className="text-slate-400">AI</strong> button, then connect.
          Traffic goes browser → this app’s server → ollama.com (not local port 11434).
          Insights must cite loaded panels; sparse data triggers a refuse-and-gap response.
        </p>
        <Link
          href="/how-it-works"
          className="mt-2 inline-block text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
        >
          View prompts & algorithms →
        </Link>
      </div>

      {lastPrompt && (
        <div
          className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/30"
          data-testid="copilot-last-prompt"
        >
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Last prompt
            <span className="ml-2 font-mono font-normal text-slate-600">
              {lastPrompt.version} · {lastPrompt.mode}
            </span>
          </p>
          <p className="text-[9px] text-slate-600 mb-2">
            What was sent to the model (truncated). Does not affect Discover ranks.
          </p>
          <details className="text-[10px] text-slate-500">
            <summary className="cursor-pointer text-indigo-400/90 hover:text-indigo-300">
              System ({lastPrompt.system.length} chars)
            </summary>
            <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-2 text-[9px] text-slate-500">
              {lastPrompt.system.slice(0, 4000)}
              {lastPrompt.system.length > 4000 ? '\n…' : ''}
            </pre>
          </details>
          <details className="mt-1.5 text-[10px] text-slate-500">
            <summary className="cursor-pointer text-indigo-400/90 hover:text-indigo-300">
              User ({lastPrompt.user.length} chars)
            </summary>
            <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-2 text-[9px] text-slate-500">
              {lastPrompt.user.slice(0, 6000)}
              {lastPrompt.user.length > 6000 ? '\n…' : ''}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}