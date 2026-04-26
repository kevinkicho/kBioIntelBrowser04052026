'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAI } from '@/lib/ai/useAI'
import { useAICopilot, type CopilotMessage, type GenerateInsightOptions } from '@/hooks/useAICopilot'
import { renderSimpleMarkdown } from '@/lib/sanitize'
import { sessionHistory } from '@/lib/sessionHistory'
import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'
import type { RetrievalSnapshot } from '@/lib/ai/retrievalMonitor'
import { validateOllamaUrl, OLLAMA_DEFAULT_PORT } from '@/lib/ai/config'

interface Props {
  categoryData: Partial<Record<CategoryId, Record<string, unknown>>>
  categoryStatus: Record<CategoryId, CategoryLoadState>
  fetchedAt: Partial<Record<CategoryId, Date>>
  identity: { name: string; cid: number; molecularWeight?: number; inchiKey?: string; iupacName?: string; geneSymbol?: string }
  diseaseName?: string
}

export function AICopilot(props: Props) {
  return (
    <AICopilotInner {...props} />
  )
}

function AICopilotInner({ categoryData, categoryStatus, fetchedAt, identity, diseaseName }: Props) {
  const copilot = useAICopilot(categoryData, categoryStatus, fetchedAt, identity, diseaseName)
  const ai = useAI()
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [hostInput, setHostInput] = useState(() => {
    try { return new URL(ai.ollamaUrl || 'http://localhost:11434').hostname } catch { return 'localhost' }
  })
  const [portInput, setPortInput] = useState(() => {
    try { return String(new URL(ai.ollamaUrl || 'http://localhost:11434').port || OLLAMA_DEFAULT_PORT) } catch { return String(OLLAMA_DEFAULT_PORT) }
  })
  const [connecting, setConnecting] = useState(false)
  const [validationHint, setValidationHint] = useState<string | null>(null)
  const [compareCount, setCompareCount] = useState(sessionHistory.getCount())
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setCompareCount(sessionHistory.getCount())
  }, [copilot.messages])

  useEffect(() => {
    try {
      const url = new URL(ai.ollamaUrl || 'http://localhost:11434')
      setHostInput(url.hostname)
      setPortInput(url.port || String(OLLAMA_DEFAULT_PORT))
    } catch {}
    setCompareCount(sessionHistory.getCount())
  }, [ai.ollamaUrl])

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
      setValidationHint('Connecting to a non-localhost address. Ensure this server is trusted and on your network.')
    } else {
      setValidationHint(null)
    }
    setConnecting(true)
    await ai.connect(validation.normalized || fullUrl)
    setConnecting(false)
  }

  const showFab = true

  return (
    <>
      {!isOpen && showFab && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/40 flex items-center justify-center transition-all hover:scale-105 group"
          title="Open BioIntel Copilot"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          {copilot.isStreaming && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full animate-pulse border-2 border-slate-900" />
          )}
          {!copilot.aiAvailable && !copilot.isStreaming && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-900" />
          )}
          {copilot.aiAvailable && !copilot.isStreaming && (
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
              <MonitorTab snapshot={copilot.snapshot} />
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
                hostInput={hostInput}
                setHostInput={setHostInput}
                portInput={portInput}
                setPortInput={setPortInput}
                validationHint={validationHint}
                connecting={connecting}
                onConnect={handleConnect}
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
                  : 'Connect Ollama in Settings first'}
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

function MonitorTab({ snapshot }: { snapshot: RetrievalSnapshot }) {
  return (
    <div className="space-y-3">
      {/* Overall status */}
      <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Data Retrieval</span>
          <span className="text-[10px] text-slate-500">{Math.round(snapshot.overallCompleteness * 100)}% complete</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.round(snapshot.overallCompleteness * 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-emerald-400">{snapshot.totalApisSucceeded}</p>
            <p className="text-[9px] text-slate-500 uppercase">WithData</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-400">{snapshot.totalApisEmpty}</p>
            <p className="text-[9px] text-slate-500 uppercase">Empty</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-400">{snapshot.totalApisErrored}</p>
            <p className="text-[9px] text-slate-500 uppercase">Failed</p>
          </div>
        </div>
      </div>

      {/* Per-category status */}
      {Object.entries(snapshot.categories).map(([catId, cat]) => (
        <div key={catId} className="bg-slate-900/40 rounded-lg px-3 py-2 border border-slate-800/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 capitalize">{catId.replace(/-/g, ' ')}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">{cat.successPanels}/{cat.totalPanels}</span>
              <StatusDot status={cat.loadState} />
            </div>
          </div>
          {cat.loadState === 'loaded' && (
            <div className="mt-1.5 w-full bg-slate-800 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all ${cat.completeness >= 0.8 ? 'bg-emerald-500' : cat.completeness >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.round(cat.completeness * 100)}%` }}
              />
            </div>
          )}
        </div>
      ))}

      {/* Gaps */}
      {snapshot.gaps.length > 0 && (
        <div className="bg-amber-950/20 rounded-lg p-3 border border-amber-800/30">
          <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-2">Data Gaps ({snapshot.gaps.length})</p>
          <div className="space-y-1">
            {snapshot.gaps.slice(0, 8).map((gap, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${gap.reason === 'error' ? 'bg-red-400' : gap.reason === 'empty' ? 'bg-amber-400' : 'bg-slate-500'}`} />
                <span className="text-[10px] text-slate-400">{gap.panelKey}</span>
                <span className="text-[9px] text-slate-600 ml-auto uppercase">{gap.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {snapshot.anomalies.length > 0 && (
        <div className="bg-red-950/20 rounded-lg p-3 border border-red-800/30">
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">Anomalies</p>
          {snapshot.anomalies.map((a, i) => (
            <p key={i} className="text-[10px] text-red-300/70">{a.message}</p>
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
          'What genes and pathways connect this drug to its indications?',
          'What experiments should a researcher run next?',
        ]

  if (!isGeneContext && !isDiseaseContext && previousMolecules.length > 0) {
    suggestions.push(`How does this compare to ${previousMolecules[0]}?`)
  }

  return (
    <div className="space-y-3">
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

  const rendered = isUser ? message.content : renderMarkdown(message.content || (isStreaming ? '' : '...'))

  return (
    <div className={`${isUser ? 'ml-6' : 'mr-2'}`}>
      <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
        isUser
          ? 'bg-indigo-600/20 border border-indigo-700/30 text-indigo-200'
          : 'bg-slate-900/40 border border-slate-800/30 text-slate-300'
      }`}>
        {isUser ? message.content || (isStreaming ? '' : '...') : rendered}
      </div>
      {message.error && (
        <div className="mt-1.5 mr-2 rounded-md px-3 py-2 text-[11px] leading-relaxed bg-red-950/30 border border-red-800/30 text-red-300">
          <span className="font-semibold">Stream error:</span> {message.error}
        </div>
      )}
      {isStreaming && !message.content && (
        <div className="flex gap-1 mt-1 px-3">
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
  hostInput,
  setHostInput,
  portInput,
  setPortInput,
  validationHint,
  connecting,
  onConnect,
}: {
  ai: ReturnType<typeof useAI>
  hostInput: string
  setHostInput: (v: string) => void
  portInput: string
  setPortInput: (v: string) => void
  validationHint: string | null
  connecting: boolean
  onConnect: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/30">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Ollama Connection</p>
        <p className="text-[10px] text-slate-500 mb-3">
          Connect to your local Ollama server. All AI processing stays on your machine.
        </p>

        <div className="flex gap-2 mb-1">
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 mb-1 block">Host</label>
            <input
              type="text"
              value={hostInput}
              onChange={(e) => { setHostInput(e.target.value) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && hostInput.trim()) onConnect() }}
              placeholder="localhost"
              className="w-full text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
            />
          </div>
          <div className="w-20">
            <label className="text-[10px] text-slate-500 mb-1 block">Port</label>
            <input
              type="text"
              value={portInput}
              onChange={(e) => { setPortInput(e.target.value) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && hostInput.trim()) onConnect() }}
              placeholder={String(OLLAMA_DEFAULT_PORT)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        <button
          onClick={onConnect}
          disabled={connecting || !hostInput.trim()}
          className="w-full mt-2 px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
        >
          {connecting ? 'Connecting...' : ai.ollamaUrl ? 'Reconnect' : 'Connect'}
        </button>

        {validationHint && (
          <p className={`text-[10px] mt-2 ${validationHint.includes('non-localhost') ? 'text-amber-400' : 'text-red-400'}`}>{validationHint}</p>
        )}

        <div className="flex items-center gap-2 mt-3">
          <span className={`w-2 h-2 rounded-full ${
            ai.status === 'available' ? 'bg-emerald-400' :
            ai.status === 'checking' ? 'bg-amber-400 animate-pulse' :
            ai.status === 'downloading' ? 'bg-blue-400 animate-pulse' :
            'bg-red-400'
          }`} />
          <span className="text-[10px] text-slate-400">
            {ai.status === 'available' ? `Connected to ${ai.ollamaUrl}` :
             ai.status === 'checking' ? 'Connecting...' :
             ai.status === 'downloading' ? 'Downloading model...' :
             ai.status === 'unavailable' ? 'Not connected' :
             ai.status === 'error' ? `Error: ${ai.error || 'unknown'}` :
             'Not configured'}
          </span>
        </div>

        {ai.error && ai.status !== 'error' && !validationHint && (
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
          BioIntel Copilot uses Ollama for 100% local AI processing. No data leaves your machine.
          Install Ollama from <span className="text-cyan-400">ollama.com</span>, then run <code className="text-slate-400 bg-slate-800 px-1 rounded">ollama serve</code> and connect above.
        </p>
        <p className="text-[10px] text-slate-600 mt-1.5">
          Default port is {OLLAMA_DEFAULT_PORT}. You can also connect to Ollama on another machine on your network (e.g., <code className="text-slate-500 bg-slate-800 px-1 rounded">192.168.1.50</code>).
        </p>
      </div>
    </div>
  )
}