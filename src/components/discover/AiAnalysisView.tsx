'use client'

/**
 * Optional Discover AI analysis view (non-of-record).
 * Deterministic shortlist remains of-record; AI may reorder with reasons.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAI } from '@/lib/ai/useAI'
import {
  applyAiOrderToCandidates,
  buildAiRankInputsFromLegacy,
  buildAiRankPrompt,
  candidateKey,
  parseAndValidateAiRank,
  type AiRankResult,
} from '@/lib/ai/aiRank'
import type { CandidateMolecule } from '@/lib/discovery/types'
import { emitProductEvent } from '@/lib/productEvents'
import { CandidateCard } from '@/app/discover/components/CandidateCard'
import type { MoleculeCandidate, ScoreRubric } from '@/lib/domain'
import type { SaveProjectContext } from '@/components/projects/SaveToProjectButton'
import { matchDomainCandidate } from '@/lib/discovery/matchDomainCandidate'
import { saveAiGeneratedData } from '@/lib/firebase/aiDataSync'
import { AiPromptReveal } from '@/components/ai/AiPromptReveal'
import { AiGenerationHistory } from '@/components/ai/AiGenerationHistory'
import type { AiGeneratedRecord } from '@/lib/firebase/aiDataSync'

const DISCLAIMER_KEY = 'biointel-ai-analysis-disclaimer-v1'

export interface AiAnalysisViewProps {
  diseaseName: string
  ofRecordCandidates: CandidateMolecule[]
  domainCandidates?: MoleculeCandidate[]
  diseaseGenes?: { symbol: string; score: number }[]
  rubric?: ScoreRubric
  projectContext?: SaveProjectContext
  rankedAt?: string | null
  /** Parent can persist last AI result for export */
  onResult?: (result: AiRankResult | null) => void
  /** When true, of-record list below should be hidden (AI list is showing) */
  onShowingAiList?: (showing: boolean) => void
}

export function AiAnalysisView({
  diseaseName,
  ofRecordCandidates,
  domainCandidates,
  diseaseGenes,
  rubric,
  projectContext,
  rankedAt,
  onResult,
  onShowingAiList,
}: AiAnalysisViewProps) {
  const ai = useAI()
  const [enabled, setEnabled] = useState(false)
  const [userGoal, setUserGoal] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AiRankResult | null>(null)
  const [lastPrompt, setLastPrompt] = useState<{ system: string; user: string } | null>(null)
  const [disclaimerAck, setDisclaimerAck] = useState(() => {
    try {
      return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISCLAIMER_KEY) === '1'
    } catch {
      return false
    }
  })

  const aiAvailable = ai.enabled && ai.status === 'available' && Boolean(ai.model)
  const inputs = useMemo(
    () => buildAiRankInputsFromLegacy(ofRecordCandidates),
    [ofRecordCandidates],
  )

  const livePrompt = useMemo(() => {
    if (ofRecordCandidates.length === 0) return null
    return buildAiRankPrompt({
      diseaseName,
      candidates: inputs,
      userGoal: userGoal.trim() || undefined,
      mode: 'reorder',
    })
  }, [diseaseName, inputs, ofRecordCandidates.length, userGoal])

  const ofRecordByKey = useMemo(() => {
    const m = new Map<string, number>()
    ofRecordCandidates.forEach((c, i) => m.set(candidateKey(c), i + 1))
    return m
  }, [ofRecordCandidates])

  const displayCandidates = useMemo(() => {
    if (!enabled || !result || result.refused) return ofRecordCandidates
    return applyAiOrderToCandidates(ofRecordCandidates, result, (c) => candidateKey(c))
  }, [enabled, result, ofRecordCandidates])

  const showingAiList = Boolean(enabled && result && !result.refused)
  useEffect(() => {
    onShowingAiList?.(showingAiList)
  }, [showingAiList, onShowingAiList])

  const runAnalysis = useCallback(async () => {
    if (!aiAvailable) {
      setError('Connect Ollama Cloud and select a model in AI settings first.')
      return
    }
    if (ofRecordCandidates.length === 0) return
    setRunning(true)
    setError(null)
    try {
      const { system, user } = buildAiRankPrompt({
        diseaseName,
        candidates: inputs,
        userGoal: userGoal.trim() || undefined,
        mode: 'reorder',
      })
      setLastPrompt({ system, user })
      let full = ''
      for await (const token of ai.askAI([
        { role: 'system', content: system },
        { role: 'user', content: user },
      ])) {
        full += token
      }
      const validated = parseAndValidateAiRank(full, inputs, { model: ai.model })
      setResult(validated)
      onResult?.(validated)
      emitProductEvent('ai_rank_completed', {
        disease: diseaseName,
        count: validated.ordering.length,
        refused: validated.refused,
        model: ai.model,
      })
      void saveAiGeneratedData({
        kind: 'discover_rank',
        mode: 'ai_analysis_reorder',
        content: JSON.stringify(validated),
        context: { name: diseaseName },
        model: ai.model ?? undefined,
        ollamaUrl: ai.ollamaUrl,
        promptSystem: system,
        promptUser: user,
        task: validated,
        error: validated.refused ? validated.refuseReason : undefined,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setResult(null)
      onResult?.(null)
    } finally {
      setRunning(false)
    }
  }, [
    ai,
    aiAvailable,
    diseaseName,
    inputs,
    ofRecordCandidates.length,
    onResult,
    userGoal,
  ])

  function restoreFromHistory(entry: AiGeneratedRecord) {
    try {
      const parsed = entry.task
        ? (entry.task as AiRankResult)
        : (JSON.parse(entry.content) as AiRankResult)
      if (parsed?.ordering) {
        setResult(parsed)
        onResult?.(parsed)
        if (entry.promptSystem || entry.promptUser) {
          setLastPrompt({
            system: entry.promptSystem || '',
            user: entry.promptUser || '',
          })
        }
        setEnabled(true)
      }
    } catch {
      setError('Could not restore that generation')
    }
  }

  function handleToggle(next: boolean) {
    if (next && !disclaimerAck) return
    setEnabled(next)
    emitProductEvent('ai_rank_view_toggled', {
      enabled: next,
      disease: diseaseName,
    })
    if (!next) {
      // Keep last result for export but show of-record
    } else if (!result && aiAvailable) {
      void runAnalysis()
    }
  }

  function ackDisclaimer() {
    try {
      sessionStorage.setItem(DISCLAIMER_KEY, '1')
    } catch {
      /* private */
    }
    setDisclaimerAck(true)
  }

  return (
    <div className="mb-4 space-y-3" data-testid="ai-analysis-view">
      <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-200">
              Ranking view
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Of-record is always deterministic free-API scores. AI analysis is optional and
              non-of-record — you verify.
            </p>
          </div>
          <div className="flex rounded-lg border border-slate-700 p-0.5 text-[11px]">
            <button
              type="button"
              data-testid="ai-view-of-record"
              onClick={() => handleToggle(false)}
              className={`rounded-md px-2.5 py-1 ${
                !enabled
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Of-record
            </button>
            <button
              type="button"
              data-testid="ai-view-analysis"
              onClick={() => handleToggle(true)}
              disabled={!disclaimerAck}
              className={`rounded-md px-2.5 py-1 disabled:opacity-40 ${
                enabled
                  ? 'bg-violet-700/80 text-violet-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              AI analysis
            </button>
          </div>
        </div>

        {!disclaimerAck && (
          <div
            className="mt-3 rounded-lg border border-amber-800/40 bg-amber-950/30 p-3 text-[11px] text-amber-100/90 space-y-2"
            data-testid="ai-analysis-disclaimer"
          >
            <p className="font-semibold text-amber-200">Before enabling AI analysis</p>
            <ul className="list-disc list-inside space-y-1 text-amber-100/80">
              <li>Uses your connected Ollama Cloud model and API key.</li>
              <li>May reorder the shortlist with reasons; does not change of-record scores.</li>
              <li>Only uses candidates and evidence already retrieved (free public APIs).</li>
              <li>Not regulatory decision support — verify before lab or clinical use.</li>
            </ul>
            <button
              type="button"
              onClick={ackDisclaimer}
              className="rounded-lg bg-amber-800/60 px-3 py-1.5 text-[11px] font-medium text-amber-50 hover:bg-amber-700/60"
              data-testid="ai-analysis-disclaimer-ack"
            >
              I understand — enable AI analysis option
            </button>
          </div>
        )}

        {enabled && (
          <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
            <div
              className="rounded-lg border border-violet-800/40 bg-violet-950/30 px-3 py-2 text-[11px] text-violet-100"
              data-testid="ai-analysis-banner"
            >
              <strong className="font-semibold">Analysis view · not of-record.</strong> Model:{' '}
              {ai.model || '—'} · Deterministic scores unchanged.
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={userGoal}
                onChange={(e) => setUserGoal(e.target.value)}
                placeholder="Optional goal (e.g. prefer later-phase, deprioritize sparse safety data)"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600"
                data-testid="ai-analysis-goal"
              />
              <button
                type="button"
                onClick={() => void runAnalysis()}
                disabled={running || !aiAvailable}
                className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-40"
                data-testid="ai-analysis-run"
              >
                {running ? 'Analyzing…' : result ? 'Re-run analysis' : 'Run AI analysis'}
              </button>
            </div>
            {!aiAvailable && (
              <p className="text-[10px] text-amber-400/90">
                Connect Ollama Cloud (header AI button) to run analysis.
              </p>
            )}
            {error && <p className="text-[10px] text-red-400">{error}</p>}
            {result?.refused && (
              <p className="text-[10px] text-amber-300">
                Model refused meaningful reorder
                {result.refuseReason ? `: ${result.refuseReason}` : ''}. Showing of-record order.
              </p>
            )}
            {result && result.caveats.length > 0 && (
              <ul className="text-[10px] text-slate-500 list-disc list-inside">
                {result.caveats.slice(0, 4).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
            <AiPromptReveal
              system={lastPrompt?.system ?? livePrompt?.system}
              user={lastPrompt?.user ?? livePrompt?.user}
              mode="ai_analysis_reorder"
              version="aiRank@v1"
              className="mt-2"
              testId="discover-ai-prompt"
            />
            <AiGenerationHistory
              kind="discover_rank"
              mode="ai_analysis_reorder"
              contextKey={diseaseName}
              className="mt-2"
              onRestore={restoreFromHistory}
              testId="discover-ai-history"
            />
          </div>
        )}
      </div>

      {/* Only re-render list when analysis enabled with result; parent still renders of-record when disabled */}
      {enabled && result && !result.refused && (
        <div className="space-y-3" data-testid="ai-analysis-list">
          {displayCandidates.map((c, i) => {
            const key = candidateKey(c)
            const ofRecord = ofRecordByKey.get(key) ?? i + 1
            const aiRank = i + 1
            const delta = ofRecord - aiRank
            const item = result.ordering.find((o) => o.key === key)
            const ofRecordIndex = (ofRecordByKey.get(key) ?? 1) - 1
            const domain = matchDomainCandidate(
              c,
              ofRecordIndex,
              domainCandidates,
              ofRecordCandidates.length,
            )
            return (
              <div key={key} className="relative">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="rounded bg-violet-900/50 border border-violet-700/40 px-1.5 py-0.5 text-violet-200">
                    AI #{aiRank}
                  </span>
                  <span className="text-slate-500">of-record #{ofRecord}</span>
                  {delta !== 0 && (
                    <span
                      className={
                        delta > 0 ? 'text-emerald-400' : 'text-amber-400'
                      }
                    >
                      {delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`}
                    </span>
                  )}
                </div>
                {item && item.reasons.length > 0 && (
                  <ul className="mb-2 ml-1 list-disc list-inside text-[10px] text-slate-400 space-y-0.5">
                    {item.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                    {item.evidenceKeys && item.evidenceKeys.length > 0 && (
                      <li className="list-none text-slate-600">
                        Evidence: {item.evidenceKeys.join(', ')}
                      </li>
                    )}
                  </ul>
                )}
                <CandidateCard
                  candidate={c}
                  rank={aiRank}
                  diseaseName={diseaseName}
                  topCandidates={displayCandidates.slice(0, 5)}
                  diseaseGenes={diseaseGenes}
                  domainCandidate={domain}
                  rubric={rubric}
                  projectContext={projectContext}
                  rankedAt={rankedAt}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
