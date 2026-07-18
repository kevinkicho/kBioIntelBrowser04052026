'use client'

import { useMemo, useState } from 'react'
import type { DiseaseEntity, EvidenceClaim, MoleculeCandidate, ResearchHypothesis } from '@/lib/domain'
import type { RhAiMode, RhStructuredInsight } from '@/lib/ai/rhContracts'
import {
  isStructuredRhMode,
  minClaimsForRhMode,
  rhModePromptPreview,
  rhModeTaskLabel,
} from '@/lib/ai/rhContracts'
import { emitProductEvent } from '@/lib/productEvents'
import { useAI } from '@/lib/ai/useAI'
import { saveAiGeneratedData } from '@/lib/firebase/aiDataSync'

const MODES: { id: RhAiMode; label: string }[] = [
  { id: 'rh_thesis_draft', label: 'Thesis draft' },
  { id: 'rh_rival_hypotheses', label: 'Rivals' },
  { id: 'rh_next_experiments', label: 'Experiments' },
  { id: 'rh_gap_map', label: 'Gap map' },
  { id: 'rh_adversarial_review', label: 'Adversarial' },
  { id: 'rh_lab_meeting', label: 'Lab meeting' },
  { id: 'rh_specific_aims', label: 'Specific aims' },
  { id: 'rh_custom', label: 'Prompt' },
]

export interface RhAiPanelProps {
  hyp: ResearchHypothesis
  claims: EvidenceClaim[]
  candidates?: MoleculeCandidate[]
  disease?: DiseaseEntity | null
  targetIds?: string[]
  className?: string
  onInsight?: (mode: RhAiMode, insight: RhStructuredInsight) => void
}

export function RhAiPanel({
  hyp,
  claims,
  candidates = [],
  disease = null,
  targetIds = [],
  className = '',
  onInsight,
}: RhAiPanelProps) {
  const ai = useAI()
  const [mode, setMode] = useState<RhAiMode>('rh_thesis_draft')
  const [busy, setBusy] = useState(false)
  const [insight, setInsight] = useState<RhStructuredInsight | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')

  const claimCount = claims.length
  const minClaims = minClaimsForRhMode(mode)
  const gated = claimCount < minClaims
  const isCustom = mode === 'rh_custom'

  const promptPreview = useMemo(
    () =>
      rhModePromptPreview(
        mode,
        {
          title: hyp.title,
          thesis: hyp.thesis,
          claims,
          candidates,
          disease,
          targetIds,
          status: hyp.status,
        },
        customQuestion,
      ),
    [mode, hyp, claims, candidates, disease, targetIds, customQuestion],
  )

  const run = async () => {
    if (gated) return
    if (isCustom && !customQuestion.trim()) {
      setError('Enter a question first.')
      return
    }
    if (!ai.hasUserApiKey || !ai.model) {
      setError(
        'Add your Ollama Cloud API key and connect (top-bar AI), then pick a model. RH AI is claim-bound live synthesis — not dummy data.',
      )
      return
    }
    setBusy(true)
    setError(null)
    setInsight(null)
    try {
      const res = await fetch('/api/ai/rh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          hypothesis: {
            id: hyp.id,
            title: hyp.title,
            thesis: hyp.thesis,
            claimIds: hyp.claimIds,
            candidateIds: hyp.candidateIds,
            status: hyp.status,
            role: hyp.role,
          },
          claims,
          candidates,
          disease,
          targetIds,
          model: ai.model,
          ollamaUrl: ai.ollamaUrl,
          ...(isCustom ? { customQuestion: customQuestion.trim() } : {}),
          ...(ai.ollamaApiKey ? { ollamaApiKey: ai.ollamaApiKey } : {}),
        }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        insight?: RhStructuredInsight
        refused?: boolean
        refuseReason?: string
        error?: string
      }
      emitProductEvent('ai_response', {
        mode,
        ok: Boolean(data.ok),
        refused: Boolean(data.refused),
        claimCount,
        surface: 'research_hypothesis',
      })
      if (data.refused || !data.insight) {
        setError(data.refuseReason ?? data.error ?? 'Refused or empty response')
        void saveAiGeneratedData({
          kind: 'rh',
          mode,
          content: data.refuseReason ?? data.error ?? 'refused',
          context: { hypId: hyp.id, name: hyp.title },
          model: ai.model,
          ollamaUrl: ai.ollamaUrl,
          error: data.refuseReason ?? data.error,
        })
        return
      }
      setInsight(data.insight)
      onInsight?.(mode, data.insight)
      void saveAiGeneratedData({
        kind: 'rh',
        mode,
        content: JSON.stringify(data.insight),
        context: { hypId: hyp.id, name: hyp.title, diseaseId: disease?.id },
        model: ai.model,
        ollamaUrl: ai.ollamaUrl,
        task: data.insight,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'RH AI failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`rounded-xl border border-indigo-900/40 bg-slate-950/50 p-3 ${className}`}
      data-testid="rh-ai-panel"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-indigo-200">Research Hypothesis AI</span>
        <span className="text-[10px] text-slate-600">claim-bound · Ollama Cloud</span>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id)
              setInsight(null)
              setError(null)
              if (m.id === 'rh_custom') setShowPrompt(true)
            }}
            title={rhModeTaskLabel(m.id)}
            className={`rounded border px-2 py-1 text-[10px] ${
              mode === m.id
                ? m.id === 'rh_custom'
                  ? 'border-cyan-600 bg-cyan-900/40 text-cyan-200'
                  : 'border-indigo-600 bg-indigo-900/40 text-indigo-200'
                : 'border-slate-700 text-slate-500 hover:border-slate-600'
            }`}
            data-testid={`rh-ai-mode-${m.id}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[11px] text-slate-500 leading-relaxed">{rhModeTaskLabel(mode)}</p>

      {isCustom && (
        <textarea
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          rows={3}
          placeholder="e.g. What would falsify this thesis given the claims?"
          className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
          data-testid="rh-ai-custom-input"
        />
      )}

      <div className="mb-2">
        <button
          type="button"
          onClick={() => setShowPrompt((v) => !v)}
          className="text-[10px] text-indigo-400/90 hover:text-indigo-300 hover:underline"
        >
          {showPrompt ? 'Hide prompt' : 'View prompt'}
        </button>
        {showPrompt && (
          <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded border border-slate-800 p-2 text-[10px] text-slate-400">
            <pre className="whitespace-pre-wrap font-sans">{promptPreview.system}</pre>
            <pre className="whitespace-pre-wrap font-sans">
              {promptPreview.user.length > 3000
                ? `${promptPreview.user.slice(0, 3000)}\n…`
                : promptPreview.user}
            </pre>
          </div>
        )}
      </div>

      {gated ? (
        <p className="text-[11px] text-amber-400/90" data-testid="rh-ai-gated">
          Need ≥{minClaims} rehydrated claims for {mode.replace(/_/g, ' ')} (have {claimCount}).
          Seed from a pack and rebuild evidence.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || (isCustom && !customQuestion.trim())}
          className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs text-white hover:bg-indigo-600 disabled:opacity-50"
          data-testid="rh-ai-run"
        >
          {busy ? 'Running…' : isCustom ? 'Send prompt' : 'Run claim-bound AI'}
        </button>
      )}

      {error && (
        <p className="mt-2 text-[11px] text-red-400" role="alert">
          {error}
        </p>
      )}

      {insight && (
        <div
          className="mt-3 space-y-2 rounded border border-slate-800 bg-slate-900/50 p-2 text-xs text-slate-300"
          data-testid="rh-ai-insight"
        >
          <p className="leading-relaxed whitespace-pre-wrap">{insight.summary}</p>
          {insight.sections?.workingClaim && (
            <p className="text-[11px] text-emerald-300/90">
              <span className="text-slate-500">Working claim · </span>
              {insight.sections.workingClaim}
            </p>
          )}
          {insight.rivals && insight.rivals.length > 0 && (
            <ul className="space-y-1 text-[11px]">
              {insight.rivals.map((r) => (
                <li key={`${r.role}-${r.title}`} className="rounded border border-slate-800 px-2 py-1">
                  <span className="uppercase text-[9px] text-slate-500">{r.role}</span>
                  <div className="font-medium text-slate-200">{r.title}</div>
                  <div className="text-slate-400">{r.thesis}</div>
                </li>
              ))}
            </ul>
          )}
          {insight.experiments && insight.experiments.length > 0 && (
            <ul className="list-inside list-disc text-[11px] text-cyan-300/90">
              {insight.experiments.map((e) => (
                <li key={e.description.slice(0, 40)}>{e.description}</li>
              ))}
            </ul>
          )}
          {insight.gaps && insight.gaps.length > 0 && (
            <ul className="space-y-1 text-[11px] text-amber-200/90">
              {insight.gaps.map((g) => (
                <li key={g.message.slice(0, 40)}>
                  <strong>{g.facet}:</strong> {g.message} — {g.suggestedAction}
                </li>
              ))}
            </ul>
          )}
          {insight.overclaims && insight.overclaims.length > 0 && (
            <ul className="list-inside list-disc text-[11px] text-rose-300/90">
              {insight.overclaims.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {insight.nextSteps && insight.nextSteps.length > 0 && (
            <ul className="list-inside list-disc text-[11px] text-emerald-300/90">
              {insight.nextSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {insight.risks && insight.risks.length > 0 && (
            <ul className="list-inside list-disc text-[11px] text-amber-300/90">
              {insight.risks.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {insight.claimIds.length > 0 && (
            <p className="text-[9px] font-mono text-slate-600">
              Cited: {insight.claimIds.slice(0, 8).join(', ')}
              {insight.claimIds.length > 8 ? '…' : ''}
            </p>
          )}
          {isStructuredRhMode(mode) && (
            <p className="text-[10px] text-slate-600">
              Use Apply buttons below the editor to merge thesis, experiments, or rivals into the
              saved hypothesis (version bump).
            </p>
          )}
        </div>
      )}
    </div>
  )
}
