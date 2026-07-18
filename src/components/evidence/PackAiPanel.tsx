'use client'

import { useMemo, useState } from 'react'
import type { EvidencePack } from '@/lib/evidence/pack'
import type { PackAiMode, StructuredInsight } from '@/lib/ai/contracts'
import { minClaimsForPackMode } from '@/lib/ai/contracts'
import { emitProductEvent } from '@/lib/productEvents'
import { useAI } from '@/lib/ai/useAI'
import { saveAiGeneratedData } from '@/lib/firebase/aiDataSync'

const MODES: { id: PackAiMode; label: string }[] = [
  { id: 'pack_executive_brief', label: 'Executive brief' },
  { id: 'pack_gap_analysis', label: 'Gap analysis' },
  { id: 'pack_next_experiment', label: 'Next experiments' },
  { id: 'pack_red_team', label: 'Red team' },
]

export interface PackAiPanelProps {
  pack: EvidencePack | null
  className?: string
  onInsight?: (mode: PackAiMode, insight: StructuredInsight) => void
}

/** Resolve opaque claim ids (ec:…) to human-readable evidence lines from the pack. */
function resolveEvidenceLines(
  pack: EvidencePack | null,
  claimIds: string[],
): Array<{ id: string; statement: string; source?: string; type?: string }> {
  if (!pack?.claims?.length || !claimIds.length) return []
  const byId = new Map(pack.claims.map((c) => [c.id, c]))
  const out: Array<{ id: string; statement: string; source?: string; type?: string }> = []
  for (const id of claimIds) {
    const c = byId.get(id)
    if (c?.statement) {
      out.push({
        id,
        statement: c.statement,
        source: c.provenance?.source,
        type: c.claimType,
      })
    }
  }
  return out
}

export function PackAiPanel({ pack, className = '', onInsight }: PackAiPanelProps) {
  const ai = useAI()
  const [mode, setMode] = useState<PackAiMode>('pack_executive_brief')
  const [busy, setBusy] = useState(false)
  const [insight, setInsight] = useState<StructuredInsight | null>(null)
  const [error, setError] = useState<string | null>(null)

  const claimCount = pack?.claims?.length ?? 0
  const minClaims = minClaimsForPackMode(mode)
  const gated = claimCount < minClaims

  const evidenceLines = useMemo(
    () => resolveEvidenceLines(pack, insight?.claimIds ?? []),
    [pack, insight?.claimIds],
  )

  const run = async () => {
    if (!pack || gated) return
    if (!ai.enabled || !ai.model) {
      setError('Connect Ollama Cloud (AI button) with your API key to run pack analysis.')
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
          ...(ai.ollamaApiKey ? { ollamaApiKey: ai.ollamaApiKey } : {}),
        }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        insight?: StructuredInsight
        refused?: boolean
        refuseReason?: string
        error?: string
      }
      emitProductEvent('ai_response', {
        mode,
        ok: Boolean(data.ok),
        refused: Boolean(data.refused),
        claimCount,
      })
      if (data.refused || !data.insight) {
        setError(data.refuseReason ?? data.error ?? 'Refused or empty response')
        void saveAiGeneratedData({
          kind: 'pack',
          mode,
          content: data.refuseReason ?? data.error ?? 'refused',
          context: { packId: pack.id, name: pack.title },
          model: ai.model,
          ollamaUrl: ai.ollamaUrl,
          error: data.refuseReason ?? data.error,
        })
        return
      }
      setInsight(data.insight)
      onInsight?.(mode, data.insight)
      void saveAiGeneratedData({
        kind: 'pack',
        mode,
        content: JSON.stringify(data.insight),
        context: {
          packId: pack.id,
          name: pack.title,
          diseaseId: pack.disease?.id,
        },
        model: ai.model,
        ollamaUrl: ai.ollamaUrl,
        task: data.insight,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pack AI failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 ${className}`}
      data-testid="pack-ai-panel"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-300">Pack AI</span>
        <span className="text-[10px] text-slate-600">
          grounded in pack evidence · Ollama Cloud
        </span>
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded border px-2 py-1 text-[10px] ${
              mode === m.id
                ? 'border-indigo-600 bg-indigo-900/40 text-indigo-200'
                : 'border-slate-700 text-slate-500 hover:border-slate-600'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {gated ? (
        <p className="text-[11px] text-amber-400/90">
          Need ≥{minClaims} claims in pack for {mode.replace(/_/g, ' ')} (have {claimCount}).
          Download after Core panels load, or load more molecule evidence.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || !pack}
          className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs text-white hover:bg-indigo-600 disabled:opacity-50"
        >
          {busy ? 'Running…' : 'Run analysis'}
        </button>
      )}
      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
      {insight && (
        <div
          className="mt-3 space-y-2 rounded border border-slate-800 bg-slate-900/50 p-2 text-xs text-slate-300"
          data-testid="pack-ai-insight"
        >
          <p className="leading-relaxed">{insight.summary}</p>
          {insight.nextSteps && insight.nextSteps.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">
                Next steps
              </p>
              <ul className="list-inside list-disc text-[11px] text-emerald-300/90">
                {insight.nextSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {insight.risks && insight.risks.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">
                Risks / caveats
              </p>
              <ul className="list-inside list-disc text-[11px] text-amber-300/90">
                {insight.risks.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {evidenceLines.length > 0 && (
            <div data-testid="pack-ai-evidence-used">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">
                Evidence used ({evidenceLines.length})
              </p>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {evidenceLines.slice(0, 12).map((e) => (
                  <li
                    key={e.id}
                    className="rounded border border-slate-800/80 bg-slate-950/40 px-2 py-1.5 text-[11px] text-slate-300 leading-snug"
                  >
                    <span className="text-slate-200">{e.statement}</span>
                    {(e.source || e.type) && (
                      <span className="mt-0.5 block text-[9px] text-slate-600">
                        {[e.type, e.source].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {evidenceLines.length > 12 && (
                <p className="mt-1 text-[9px] text-slate-600">
                  +{evidenceLines.length - 12} more claims cited
                </p>
              )}
            </div>
          )}
          {insight.claimIds.length > 0 && evidenceLines.length === 0 && (
            <p className="text-[10px] text-slate-600">
              Model cited {insight.claimIds.length} claim id(s), but they could not be matched to
              pack statements (stale pack or invalid ids).
            </p>
          )}
        </div>
      )}
    </div>
  )
}
