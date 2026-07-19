"use client"

import { useEffect, useState } from 'react'
import type { CopilotMessage, GenerateInsightOptions } from '@/hooks/useAICopilot'
import { MessageBubble } from './MessageBubble'
import { InsightButton } from './InsightButton'

export function InsightsTab({
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
