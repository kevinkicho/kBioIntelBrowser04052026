"use client"

import { useEffect, useState } from 'react'
import type { CopilotMessage, GenerateInsightOptions } from '@/hooks/useAICopilot'
import type { EvidenceGroundingStats } from '@/lib/ai/copilot/evidenceDensity'
import { MessageBubble } from './MessageBubble'
import { InsightButton } from './InsightButton'

type InsightMode = Parameters<
  NonNullable<
    {
      onGenerate: (
        mode:
          | 'auto_insight'
          | 'executive_brief'
          | 'gap_analysis'
          | 'safety_deep_dive'
          | 'mechanism_analysis'
          | 'therapeutic_hypothesis'
          | 'competitive_position'
          | 'repurposing_scan'
          | 'cross_molecule_compare'
          | 'gene_therapeutic'
          | 'gene_repurposing'
          | 'gene_mechanism'
          | 'gene_target_assessment'
          | 'prior_art_query'
          | 'differential_safety'
          | 'suggest_next'
          | 'hypothesis_seed'
          | 'safety_memo'
          | 'next_actions',
        opts?: GenerateInsightOptions,
      ) => void
    }['onGenerate']
  >
>[0]

export function InsightsTab({
  messages,
  isStreaming,
  onGenerate,
  aiAvailable,
  hasComparisons,
  isDiseaseContext,
  isGeneContext,
  previousMolecules,
  grounding,
}: {
  messages: CopilotMessage[]
  isStreaming: boolean
  onGenerate: (mode: InsightMode, opts?: GenerateInsightOptions) => void
  aiAvailable: boolean
  hasComparisons: boolean
  isDiseaseContext: boolean
  isGeneContext: boolean
  previousMolecules: string[]
  grounding?: EvidenceGroundingStats | null
}) {
  const [diffTarget, setDiffTarget] = useState<string>('')
  const [hypothesisQuestion, setHypothesisQuestion] = useState<string>('')

  useEffect(() => {
    if (diffTarget && !previousMolecules.includes(diffTarget)) {
      setDiffTarget('')
    }
  }, [previousMolecules, diffTarget])

  const showTasks = !isGeneContext && !isDiseaseContext
  const deepOk = grounding?.canDeepSynthesize ?? false
  const deepDisabled = isStreaming || (!aiAvailable && !deepOk)
  // Job tasks work without AI when deterministic
  const jobDisabled = isStreaming

  return (
    <div className="space-y-3">
      {grounding && showTasks && (
        <div
          className={`rounded-lg border px-2.5 py-2 text-[10px] leading-snug ${
            grounding.canDeepSynthesize
              ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-200/90'
              : 'border-amber-900/40 bg-amber-950/20 text-amber-200/90'
          }`}
          data-testid="copilot-grounding-badge"
        >
          <p className="font-semibold uppercase tracking-wider mb-0.5">
            Evidence grounding
            {grounding.canDeepSynthesize ? ' · deep OK' : ' · thin — use jobs'}
          </p>
          <p className="text-slate-400">{grounding.badgeLine}</p>
          {!grounding.canDeepSynthesize && grounding.blockReason && (
            <p className="mt-1 text-slate-500">
              Deep essays blocked: {grounding.blockReason}. Prefer Safety memo / Prior-art / Next
              actions (deterministic artifacts).
            </p>
          )}
        </div>
      )}

      {showTasks && (
        <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-800/30 space-y-2.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Job tasks (artifacts · preferred)
          </p>
          <p className="text-[9px] text-slate-600">
            Produce copyable outputs from free-API bags. No fluent fluff. Works offline of the model
            when possible.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <InsightButton
              label="Prior-Art Query"
              onClick={() => onGenerate('prior_art_query')}
              disabled={jobDisabled}
              icon="patent"
            />
            <InsightButton
              label="Safety Memo"
              onClick={() => onGenerate('safety_memo')}
              disabled={jobDisabled}
              icon="safety"
            />
            <InsightButton
              label="Next Actions"
              onClick={() => onGenerate('next_actions')}
              disabled={jobDisabled}
              icon="next"
            />
            <InsightButton
              label="Suggest Next"
              onClick={() => onGenerate('suggest_next')}
              disabled={jobDisabled}
              icon="next"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">
              Differential Safety
            </label>
            <div className="flex gap-1.5">
              <select
                value={diffTarget}
                onChange={(e) => setDiffTarget(e.target.value)}
                disabled={isStreaming || previousMolecules.length === 0 || !aiAvailable}
                className="flex-1 text-[10px] px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">
                  {previousMolecules.length === 0 ? 'No previous molecules' : 'Pick a molecule…'}
                </option>
                {previousMolecules.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
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

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">
              Hypothesis Seed
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={hypothesisQuestion}
                onChange={(e) => setHypothesisQuestion(e.target.value)}
                placeholder="e.g. EGFR inhibitors in late-stage trials"
                disabled={isStreaming || !aiAvailable}
                className="flex-1 text-[10px] px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() =>
                  onGenerate('hypothesis_seed', { researchQuestion: hypothesisQuestion })
                }
                disabled={isStreaming || !aiAvailable || !hypothesisQuestion.trim()}
                className="px-2.5 py-1.5 rounded-md text-[10px] font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
              >
                Seed
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {isGeneContext ? (
          <>
            <InsightButton
              label="Therapeutic Opportunity"
              onClick={() => onGenerate('gene_therapeutic')}
              disabled={isStreaming || !aiAvailable}
              icon="hypothesis"
            />
            <InsightButton
              label="Drug Repurposing"
              onClick={() => onGenerate('gene_repurposing')}
              disabled={isStreaming || !aiAvailable}
              icon="repurpose"
            />
            <InsightButton
              label="Mechanism Deep Dive"
              onClick={() => onGenerate('gene_mechanism')}
              disabled={isStreaming || !aiAvailable}
              icon="mechanism"
            />
            <InsightButton
              label="Target Assessment"
              onClick={() => onGenerate('gene_target_assessment')}
              disabled={isStreaming || !aiAvailable}
              icon="safety"
            />
            <InsightButton
              label="Gap Analysis"
              onClick={() => onGenerate('gap_analysis')}
              disabled={isStreaming || !aiAvailable}
              icon="gap"
            />
          </>
        ) : isDiseaseContext ? (
          <>
            <InsightButton
              label="Executive Brief"
              onClick={() => onGenerate('executive_brief')}
              disabled={isStreaming || !aiAvailable}
              icon="brief"
            />
            <InsightButton
              label="Mechanism Analysis"
              onClick={() => onGenerate('mechanism_analysis')}
              disabled={isStreaming || !aiAvailable}
              icon="mechanism"
            />
            <InsightButton
              label="Repurposing Scan"
              onClick={() => onGenerate('repurposing_scan')}
              disabled={isStreaming || !aiAvailable}
              icon="repurpose"
            />
            <InsightButton
              label="Therapeutic Hypotheses"
              onClick={() => onGenerate('therapeutic_hypothesis')}
              disabled={isStreaming || !aiAvailable}
              icon="hypothesis"
            />
            <InsightButton
              label="Gap Analysis"
              onClick={() => onGenerate('gap_analysis')}
              disabled={isStreaming || !aiAvailable}
              icon="gap"
            />
          </>
        ) : (
          <>
            <p className="col-span-2 text-[9px] text-slate-600">
              Deep synthesis (model) — blocked until grounding is dense. Gap analysis always
              allowed.
            </p>
            <InsightButton
              label="Gap Analysis"
              onClick={() => onGenerate('gap_analysis')}
              disabled={isStreaming || !aiAvailable}
              icon="gap"
            />
            <InsightButton
              label="Executive Brief"
              onClick={() => onGenerate('executive_brief')}
              disabled={deepDisabled || !aiAvailable}
              icon="brief"
            />
            <InsightButton
              label="Safety Deep Dive"
              onClick={() => onGenerate('safety_deep_dive')}
              disabled={isStreaming || !aiAvailable}
              icon="safety"
            />
            <InsightButton
              label="Mechanism Analysis"
              onClick={() => onGenerate('mechanism_analysis')}
              disabled={deepDisabled || !aiAvailable}
              icon="mechanism"
            />
            <InsightButton
              label="Repurposing Scan"
              onClick={() => onGenerate('repurposing_scan')}
              disabled={deepDisabled || !aiAvailable}
              icon="repurpose"
            />
            <InsightButton
              label="Therapeutic Hypotheses"
              onClick={() => onGenerate('therapeutic_hypothesis')}
              disabled={deepDisabled || !aiAvailable}
              icon="hypothesis"
            />
            <InsightButton
              label="Competitive Position"
              onClick={() => onGenerate('competitive_position')}
              disabled={deepDisabled || !aiAvailable}
              icon="competitive"
            />
            {hasComparisons && (
              <InsightButton
                label="Compare Molecules"
                onClick={() => onGenerate('cross_molecule_compare')}
                disabled={deepDisabled || !aiAvailable}
                icon="compare"
              />
            )}
            <InsightButton
              label="Cross-domain Insights"
              onClick={() => onGenerate('auto_insight')}
              disabled={deepDisabled || !aiAvailable}
              icon="auto"
            />
          </>
        )}
      </div>

      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isStreaming={
            isStreaming && msg === messages[messages.length - 1] && msg.role === 'assistant'
          }
        />
      ))}

      {messages.length === 0 && !isStreaming && (
        <div className="text-center py-6">
          <p className="text-[10px] text-slate-500">
            Start with a job task (Prior-art, Safety memo, Next actions).
          </p>
          <p className="text-[10px] text-slate-600 mt-1">
            Deep essays only after Core panels fill the grounding badge. Auto-insight is off.
          </p>
        </div>
      )}

      {isStreaming &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'assistant' &&
        messages[messages.length - 1].content && (
          <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse rounded-full" />
        )}
    </div>
  )
}
