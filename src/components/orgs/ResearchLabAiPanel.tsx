'use client'

/**
 * Claim-bound AI activities on a research-lab dossier.
 * Reuses /api/ai/pack with structured modes — BYOM Ollama only.
 */

import { useMemo, useState } from 'react'
import type { EvidencePack } from '@/lib/evidence/pack'
import type { PackAiMode, StructuredInsight } from '@/lib/ai/contracts'
import {
  minClaimsForPackMode,
  packModePromptPreview,
  packModeTaskLabel,
} from '@/lib/ai/contracts'
import { useAI } from '@/lib/ai/useAI'
import { emitProductEvent } from '@/lib/productEvents'
import { AiPromptReveal } from '@/components/ai/AiPromptReveal'

const LAB_MODES: { id: PackAiMode; label: string; labLabel: string }[] = [
  { id: 'pack_executive_brief', label: 'Affiliation brief', labLabel: 'Affiliation brief' },
  { id: 'pack_gap_analysis', label: 'Evidence gaps', labLabel: 'Data gaps' },
  { id: 'pack_next_experiment', label: 'Next activities', labLabel: 'Next activities' },
  { id: 'pack_red_team', label: 'Caveats', labLabel: 'Caveats / limits' },
  { id: 'pack_custom_prompt', label: 'Ask', labLabel: 'Custom question' },
]

export function ResearchLabAiPanel({
  pack,
  className = '',
}: {
  pack: EvidencePack | null
  className?: string
}) {
  const ai = useAI()
  const [mode, setMode] = useState<PackAiMode>('pack_executive_brief')
  const [busy, setBusy] = useState(false)
  const [insight, setInsight] = useState<StructuredInsight | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customQuestion, setCustomQuestion] = useState(
    'Which free-public affiliation signals are strongest for collaboration mapping, and what is missing?',
  )

  const claimCount = pack?.claims?.length ?? 0
  const minClaims = minClaimsForPackMode(mode)
  const gated = claimCount < minClaims
  const isCustom = mode === 'pack_custom_prompt'

  const promptPreview = useMemo(() => {
    if (!pack) return null
    return packModePromptPreview(mode, pack, customQuestion)
  }, [pack, mode, customQuestion])

  const evidenceLines = useMemo(() => {
    if (!pack?.claims?.length || !insight?.claimIds?.length) return []
    const byId = new Map(pack.claims.map((c) => [c.id, c]))
    return insight.claimIds
      .map((id) => byId.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c?.statement))
  }, [pack, insight?.claimIds])

  const run = async () => {
    if (!pack || gated) return
    if (isCustom && !customQuestion.trim()) {
      setError('Enter a question first.')
      return
    }
    if (!ai.hasUserApiKey || !ai.model) {
      setError(
        'Add your Ollama Cloud API key and connect (top-bar AI), then pick a model. Lab AI is claim-bound — not dummy data.',
      )
      return
    }
    setBusy(true)
    setError(null)
    setInsight(null)
    try {
      const res = await fetch('/api/ai/pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          pack: {
            id: pack.id,
            title: pack.title,
            claims: pack.claims,
            candidates: pack.candidates,
            disease: pack.disease,
          },
          model: ai.model,
          ollamaUrl: ai.ollamaUrl,
          ...(isCustom ? { customQuestion: customQuestion.trim() } : {}),
        }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        insight?: StructuredInsight
        refuseReason?: string
        error?: string
      }
      if (!res.ok || data.ok === false) {
        throw new Error(data.refuseReason || data.error || `AI failed (${res.status})`)
      }
      if (data.insight) {
        setInsight(data.insight)
        emitProductEvent('ui_surface_action', {
          surface: 'research_lab_ai',
          action: mode,
          claimCount: pack.claims.length,
        })
      } else {
        throw new Error('No insight returned')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!pack) return null

  return (
    <section
      className={`rounded-xl border border-violet-900/40 bg-violet-950/20 p-4 ${className}`}
      data-testid="research-lab-ai-panel"
    >
      <h3 className="text-sm font-semibold text-violet-100">AI activities (claim-bound)</h3>
      <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
        Uses only dossier claims built from free public registers (ROR, OpenAlex, Scorecard, CMS,
        NIH RePORTER, OpenAIRE). Not admissions ranking or clinical referral. BYOM Ollama.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {LAB_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-lg border px-2 py-1 text-[11px] ${
              mode === m.id
                ? 'border-violet-600 bg-violet-900/50 text-violet-100'
                : 'border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {m.labLabel}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-slate-500">{packModeTaskLabel(mode)}</p>

      {isCustom && (
        <textarea
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
          placeholder="Ask about this institution’s free-public affiliation footprint…"
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || gated || !pack.claims.length}
          onClick={() => void run()}
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          data-testid="research-lab-ai-run"
        >
          {busy ? 'Running…' : 'Run AI activity'}
        </button>
        <span className="text-[10px] text-slate-500">
          {claimCount} claims
          {gated ? ` · need ≥${minClaims} for this mode` : ''}
        </span>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      {insight && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-2">
          <p className="text-sm text-slate-100 whitespace-pre-wrap">{insight.summary}</p>
          {insight.nextSteps && insight.nextSteps.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Next</p>
              <ul className="list-disc list-inside text-[11px] text-slate-300">
                {insight.nextSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {insight.risks && insight.risks.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Risks / limits</p>
              <ul className="list-disc list-inside text-[11px] text-amber-200/90">
                {insight.risks.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {evidenceLines.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Grounded claims</p>
              <ul className="mt-1 space-y-1 max-h-36 overflow-y-auto">
                {evidenceLines.map((c) => (
                  <li key={c.id} className="text-[10px] text-slate-400">
                    <span className="font-mono text-slate-600">{c.id.slice(0, 18)}…</span> {c.statement}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {promptPreview && (
        <div className="mt-2">
          <AiPromptReveal system={promptPreview.system} user={promptPreview.user} />
        </div>
      )}
    </section>
  )
}
