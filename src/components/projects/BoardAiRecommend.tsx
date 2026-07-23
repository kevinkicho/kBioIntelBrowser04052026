'use client'

/**
 * Optional board AI triage recommend (non-of-record).
 * Does not change boardStatus automatically — user applies promote / hold / kill.
 */

import { useCallback, useMemo, useState } from 'react'
import { useAI } from '@/lib/ai/useAI'
import {
  buildAiRankInputsFromBoard,
  buildAiRankPrompt,
  parseAndValidateAiRank,
  type AiRankResult,
} from '@/lib/ai/aiRank'
import type { BoardStatus, MoleculeCandidate, Project } from '@/lib/domain'
import { emitProductEvent } from '@/lib/productEvents'
import { persistAiGeneration } from '@/lib/ai/aiHistoryStore'
import type { AiGeneratedRecord } from '@/lib/firebase/aiDataSync'
import { AiPromptReveal } from '@/components/ai/AiPromptReveal'
import { AiRegenerateModal } from '@/components/ai/AiRegenerateModal'
import { AiRunNavigator } from '@/components/ai/AiRunNavigator'
import { AiPanelIntro } from '@/components/ai/AiPanelIntro'
import { AiWhyTooltip } from '@/components/ai/AiWhyTooltip'
import { HelperTip } from '@/components/ui/HelperTip'
import {
  buildAiRankWhy,
  buildBoardStatusSuggestWhy,
} from '@/lib/ai/aiWhyTooltip'
import { aiRunButtonLabel, aiSurfaceIntro } from '@/lib/ai/aiUiCopy'

/** Suggest board status from AI rank position (never auto-applied). */
export function suggestBoardStatusFromAiRank(
  aiRank: number,
  total: number,
  current?: BoardStatus | null,
): BoardStatus {
  if (current === 'kill') return 'kill'
  if (total <= 1) return 'promote'
  const tertile = aiRank / total
  if (tertile <= 0.34) return 'promote'
  if (tertile <= 0.67) return 'watching'
  return 'hold'
}

export function BoardAiRecommend({
  project,
  onApplyStatus,
}: {
  project: Project
  /** User-confirmed apply only — never called automatically. */
  onApplyStatus?: (candidateId: string, status: BoardStatus) => void
}) {
  const ai = useAI()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<AiRankResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [goal, setGoal] = useState('')
  const [lastPrompt, setLastPrompt] = useState<{ system: string; user: string } | null>(null)
  const [regenOpen, setRegenOpen] = useState(false)
  const [histRefresh, setHistRefresh] = useState(0)
  const [activeGenId, setActiveGenId] = useState<string | null>(null)

  const aiAvailable = ai.enabled && ai.status === 'available' && Boolean(ai.model)
  const candidates = project.candidates

  const livePrompt = useMemo(() => {
    if (candidates.length === 0) return null
    const inputs = buildAiRankInputsFromBoard(candidates)
    const disease = project.disease?.name || project.name || 'board'
    return buildAiRankPrompt({
      diseaseName: String(disease),
      candidates: inputs,
      userGoal: goal.trim() || 'Prioritize for next lab week review',
      mode: 'board_recommend',
    })
  }, [candidates, goal, project.disease?.name, project.name])

  const run = useCallback(
    async (override?: { system: string; user: string }) => {
      if (!aiAvailable || candidates.length === 0) return
      setRunning(true)
      setError(null)
      try {
        const inputs = buildAiRankInputsFromBoard(candidates)
        const disease = project.disease?.name || project.name || 'board'
        const built = buildAiRankPrompt({
          diseaseName: String(disease),
          candidates: inputs,
          userGoal: goal.trim() || 'Prioritize for next lab week review',
          mode: 'board_recommend',
        })
        const system = override?.system ?? built.system
        const user = override?.user ?? built.user
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
        setRegenOpen(false)
        emitProductEvent('ai_recommend_completed', {
          projectId: project.id,
          count: validated.ordering.length,
          refused: validated.refused,
        })
        const saved = await persistAiGeneration({
          kind: 'board_recommend',
          mode: 'board_recommend',
          content: JSON.stringify(validated),
          context: {
            projectId: project.id,
            name: project.name,
            diseaseId: project.disease?.id,
          },
          model: ai.model ?? undefined,
          ollamaUrl: ai.ollamaUrl,
          promptSystem: system,
          promptUser: user,
          task: validated,
        })
        if (saved.id) setActiveGenId(saved.id)
        setHistRefresh((n) => n + 1)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setRunning(false)
      }
    },
    [ai, aiAvailable, candidates, goal, project],
  )

  function restoreFromHistory(entry: AiGeneratedRecord) {
    try {
      let parsed: AiRankResult | null = null
      if (entry.task && typeof entry.task === 'object') {
        parsed = entry.task as AiRankResult
      } else if (entry.content?.trim()) {
        parsed = JSON.parse(entry.content) as AiRankResult
      }
      if (parsed?.ordering?.length) {
        setResult(parsed)
        setError(null)
        setActiveGenId(entry.id)
        if (entry.promptSystem || entry.promptUser) {
          setLastPrompt({
            system: entry.promptSystem || '',
            user: entry.promptUser || '',
          })
        }
        return
      }
      setError('Could not restore that generation')
    } catch {
      setError('Could not restore that generation')
    }
  }

  if (candidates.length === 0) return null

  const n = result?.ordering.length ?? candidates.length

  const intro = aiSurfaceIntro('board_recommend')
  const status = !aiAvailable
    ? { label: 'Connect AI first', tone: 'warn' as const }
    : { label: 'Ready to generate', tone: 'ready' as const }

  return (
    <div
      className="mb-4 rounded-xl border border-violet-900/40 bg-violet-950/20 p-3"
      data-testid="board-ai-recommend"
    >
      <AiPanelIntro intro={intro} status={status} density="compact" testId="board-ai-intro" />

      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <label className="block text-[10px] font-medium text-slate-400 mb-1">
            Optional goal for triage
          </label>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. prioritize safety gaps this week"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-200"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || !aiAvailable}
            className="rounded-lg bg-violet-700/90 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-violet-600 disabled:opacity-40"
            data-testid="board-ai-recommend-run"
          >
            {aiRunButtonLabel({
              busy: running,
              hasResult: Boolean(result),
              surface: 'board_recommend',
            })}
          </button>
          {result && (
            <button
              type="button"
              onClick={() => setRegenOpen(true)}
              disabled={running || !aiAvailable}
              className="rounded-lg border border-violet-700/50 px-3 py-1.5 text-[11px] text-violet-200 hover:bg-violet-950/50 disabled:opacity-40"
              data-testid="board-ai-regenerate"
            >
              Edit prompt &amp; regenerate…
            </button>
          )}
        </div>
      </div>
      {!aiAvailable && (
        <p className="text-[10px] text-amber-400/90">
          Connect Ollama Cloud via the top-bar AI button, then pick a model.
        </p>
      )}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      {result && (
        <p className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-300/80">
          Suggested review order (apply each status yourself)
        </p>
      )}
      {result && (
        <ol className="mt-1 space-y-1.5 text-[11px] text-slate-300 list-decimal list-inside">
          {result.ordering.slice(0, 12).map((item, idx) => {
            const c = candidates.find((x) => x.candidateId === item.key) as
              | MoleculeCandidate
              | undefined
            const suggested = suggestBoardStatusFromAiRank(
              idx + 1,
              n,
              c?.boardStatus,
            )
            const same = c?.boardStatus === suggested
            const rankWhy = buildAiRankWhy({
              item,
              aiRank: idx + 1,
              ofRecordRank: idx + 1,
              name: c?.identity.name || item.name,
              mode: 'board_recommend',
            })
            const statusWhy = buildBoardStatusSuggestWhy({
              suggested,
              aiRank: idx + 1,
              total: n,
              current: c?.boardStatus,
              item,
            })
            return (
              <li key={item.key} className="leading-snug" data-testid="board-ai-suggest-row">
                <span className="inline-flex flex-wrap items-center gap-1">
                  <AiWhyTooltip
                    why={rankWhy}
                    testId={`board-ai-why-rank-${item.key}`}
                  >
                    <span className="cursor-help font-medium text-slate-100 underline decoration-dotted decoration-slate-600 underline-offset-2">
                      {c?.identity.name || item.name}
                    </span>
                  </AiWhyTooltip>
                  <span className="text-slate-600"> · now {c?.boardStatus ?? 'untriaged'}</span>
                  <AiWhyTooltip
                    why={statusWhy}
                    testId={`board-ai-why-status-${item.key}`}
                  >
                    <span className="cursor-help rounded border border-violet-800/40 bg-violet-950/40 px-1 text-[9px] text-violet-200">
                      suggest {suggested}
                    </span>
                  </AiWhyTooltip>
                  {onApplyStatus && c && !same && (
                    <button
                      type="button"
                      className="rounded border border-emerald-800/50 px-1.5 py-0.5 text-[9px] text-emerald-300 hover:bg-emerald-950/40"
                      data-testid={`board-ai-apply-${c.candidateId}`}
                      onClick={() => onApplyStatus(c.candidateId, suggested)}
                    >
                      Apply
                    </button>
                  )}
                </span>
                {item.reasons[0] && (
                  <span className="ml-4 inline-block">
                    <HelperTip
                      content={item.reasons[0]}
                      label="Why this rank"
                      testId={`board-ai-reason-${item.key}`}
                    />
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {result?.caveats?.[0] && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
          <span>Caveats</span>
          <HelperTip
            content={result.caveats.join('\n\n')}
            label="AI ranking caveats"
            testId="board-ai-caveats-help"
          />
        </div>
      )}
      <AiPromptReveal
        system={lastPrompt?.system ?? livePrompt?.system}
        user={lastPrompt?.user ?? livePrompt?.user}
        mode="board_recommend"
        version="aiRank@v1"
        className="mt-2"
        testId="board-ai-prompt"
      />
      <AiRegenerateModal
        open={regenOpen}
        onClose={() => setRegenOpen(false)}
        kind="board_recommend"
        mode="board_recommend"
        title="Regenerate board AI recommend"
        systemPrompt={lastPrompt?.system ?? livePrompt?.system ?? ''}
        userPrompt={lastPrompt?.user ?? livePrompt?.user ?? ''}
        contextKey={project.id}
        busy={running}
        allowOverrideSystem
        onLoadEntry={restoreFromHistory}
        onRegenerate={async ({ system, user }) => {
          await run({ system, user })
        }}
        testId="board-ai-regen-modal"
      />
      <AiRunNavigator
        kind="board_recommend"
        mode="board_recommend"
        contextKey={project.id}
        refreshKey={histRefresh}
        activeId={activeGenId}
        onSelect={restoreFromHistory}
        className="mt-2"
        testId="board-ai-runs"
      />
    </div>
  )
}
