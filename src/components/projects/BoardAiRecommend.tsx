'use client'

/**
 * Optional board AI triage recommend (non-of-record).
 * Does not change boardStatus — user applies promote/hold/kill.
 */

import { useCallback, useState } from 'react'
import { useAI } from '@/lib/ai/useAI'
import {
  buildAiRankInputsFromBoard,
  buildAiRankPrompt,
  parseAndValidateAiRank,
  type AiRankResult,
} from '@/lib/ai/aiRank'
import type { MoleculeCandidate, Project } from '@/lib/domain'
import { emitProductEvent } from '@/lib/productEvents'

export function BoardAiRecommend({ project }: { project: Project }) {
  const ai = useAI()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<AiRankResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [goal, setGoal] = useState('')

  const aiAvailable = ai.enabled && ai.status === 'available' && Boolean(ai.model)
  const candidates = project.candidates

  const run = useCallback(async () => {
    if (!aiAvailable || candidates.length === 0) return
    setRunning(true)
    setError(null)
    try {
      const inputs = buildAiRankInputsFromBoard(candidates)
      const disease = project.disease?.name || project.name || 'board'
      const { system, user } = buildAiRankPrompt({
        diseaseName: String(disease),
        candidates: inputs,
        userGoal: goal.trim() || 'Prioritize for next lab week review',
        mode: 'board_recommend',
      })
      let full = ''
      for await (const token of ai.askAI([
        { role: 'system', content: system },
        { role: 'user', content: user },
      ])) {
        full += token
      }
      const validated = parseAndValidateAiRank(full, inputs, { model: ai.model })
      setResult(validated)
      emitProductEvent('ai_recommend_completed', {
        projectId: project.id,
        count: validated.ordering.length,
        refused: validated.refused,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }, [ai, aiAvailable, candidates, goal, project.id, project.name, project.disease?.name])

  if (candidates.length === 0) return null

  return (
    <div
      className="mb-4 rounded-xl border border-violet-900/40 bg-violet-950/20 p-3"
      data-testid="board-ai-recommend"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <p className="text-xs font-semibold text-violet-200">AI board recommend</p>
          <p className="text-[10px] text-slate-500">
            Non-of-record triage order using free-API board evidence. Does not change statuses —
            you apply promote / hold / kill.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running || !aiAvailable}
          className="rounded-lg bg-violet-700/90 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-violet-600 disabled:opacity-40"
          data-testid="board-ai-recommend-run"
        >
          {running ? 'Analyzing…' : 'Recommend review order'}
        </button>
      </div>
      <input
        type="text"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="Optional goal (e.g. prioritize safety gaps)"
        className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-200"
      />
      {!aiAvailable && (
        <p className="text-[10px] text-amber-400/90">Connect Ollama Cloud to run.</p>
      )}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      {result && (
        <ol className="mt-2 space-y-1.5 text-[11px] text-slate-300 list-decimal list-inside">
          {result.ordering.slice(0, 12).map((item) => {
            const c = candidates.find((x) => x.candidateId === item.key) as
              | MoleculeCandidate
              | undefined
            return (
              <li key={item.key} className="leading-snug">
                <span className="font-medium text-slate-100">
                  {c?.identity.name || item.name}
                </span>
                <span className="text-slate-600"> · {c?.boardStatus ?? '—'}</span>
                {item.reasons[0] && (
                  <span className="block text-[10px] text-slate-500 ml-4">
                    {item.reasons[0]}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {result?.caveats?.[0] && (
        <p className="mt-2 text-[10px] text-slate-600">{result.caveats[0]}</p>
      )}
    </div>
  )
}
