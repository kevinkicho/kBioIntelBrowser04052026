'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useAI } from '@/lib/ai/useAI'
import { useAICopilot } from '@/hooks/useAICopilot'
import { sessionHistory } from '@/lib/sessionHistory'
import type { CategoryId } from '@/lib/categoryConfig'
import type { CategoryLoadState } from '@/lib/fetchCategory'
import { MonitorTab } from './copilot/MonitorTab'
import { InsightsTab } from './copilot/InsightsTab'
import { AskTab } from './copilot/AskTab'
import { SettingsTab } from './copilot/SettingsTab'

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
  onNavigateToPanel?: (panelId: string, categoryId?: CategoryId) => void
  /** Project context for board/pack agent tools (e.g. ?project=). */
  projectId?: string
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
  projectId,
}: Props) {
  const actions = useMemo(
    () => ({
      refreshCategory,
      loadCategory,
      openPanel: onNavigateToPanel,
      defaultProjectId: projectId,
    }),
    [refreshCategory, loadCategory, onNavigateToPanel, projectId],
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
