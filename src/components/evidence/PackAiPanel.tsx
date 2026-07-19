'use client'

import { useMemo, useState } from 'react'
import type { EvidencePack } from '@/lib/evidence/pack'
import type { PackAiMode, StructuredInsight } from '@/lib/ai/contracts'
import {
  isStructuredPackMode,
  minClaimsForPackMode,
  packModePromptPreview,
  packModeTaskLabel,
} from '@/lib/ai/contracts'
import { emitProductEvent } from '@/lib/productEvents'
import { useAI } from '@/lib/ai/useAI'
import { saveAiGeneratedData } from '@/lib/firebase/aiDataSync'
import { AiPromptReveal } from '@/components/ai/AiPromptReveal'
import { AiGenerationHistory } from '@/components/ai/AiGenerationHistory'
import type { AiGeneratedRecord } from '@/lib/firebase/aiDataSync'

const MODES: { id: PackAiMode; label: string }[] = [
  { id: 'pack_executive_brief', label: 'Executive brief' },
  { id: 'pack_gap_analysis', label: 'Gap analysis' },
  { id: 'pack_next_experiment', label: 'Next experiments' },
  { id: 'pack_red_team', label: 'Red team' },
  { id: 'pack_custom_prompt', label: 'Prompt' },
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
  const [customQuestion, setCustomQuestion] = useState('')

  const claimCount = pack?.claims?.length ?? 0
  const citableCount = useMemo(() => {
    if (!pack?.claims) return 0
    return pack.claims.filter((c) => {
      const any = c as { citable?: boolean; hasCitation?: boolean; provenance?: { url?: string } }
      return any.citable === true || any.hasCitation === true || Boolean(any.provenance?.url)
    }).length
  }, [pack?.claims])
  const minClaims = minClaimsForPackMode(mode)
  const gated = claimCount < minClaims
  const isCustom = mode === 'pack_custom_prompt'

  const evidenceLines = useMemo(
    () => resolveEvidenceLines(pack, insight?.claimIds ?? []),
    [pack, insight?.claimIds],
  )

  const promptPreview = useMemo(() => {
    if (!pack) return null
    return packModePromptPreview(mode, pack, customQuestion)
  }, [pack, mode, customQuestion])

  const run = async () => {
    if (!pack || gated) return
    if (isCustom && !customQuestion.trim()) {
      setError('Enter a question or prompt first.')
      return
    }
    // Real Cloud call — needs API key + model; chip status may lag but key/model is enough
    if (!ai.hasUserApiKey || !ai.model) {
      setError(
        'Add your Ollama Cloud API key and connect (top-bar AI button), then pick a model. Pack AI is not dummy data — it calls the live model.',
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
          promptSystem: promptPreview?.system,
          promptUser: promptPreview?.user,
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
        promptSystem: promptPreview?.system,
        promptUser: promptPreview?.user,
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

      {/* Claim coverage — honesty before AI */}
      <div
        className="mb-3 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-2"
        data-testid="pack-claim-coverage"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <span className="text-slate-400">
            Claims{' '}
            <span className="font-mono tabular-nums text-slate-200">{claimCount}</span>
            <span className="text-slate-600"> · citable </span>
            <span className="font-mono tabular-nums text-slate-200">{citableCount}</span>
            <span className="text-slate-600"> · mode needs ≥{minClaims}</span>
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
              gated
                ? 'border-amber-800/50 text-amber-300'
                : 'border-emerald-800/50 text-emerald-300'
            }`}
          >
            {gated ? 'thin evidence' : 'ready'}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              gated ? 'bg-amber-600/70' : 'bg-emerald-600/80'
            }`}
            style={{
              width: `${Math.min(100, minClaims > 0 ? (claimCount / Math.max(minClaims, 1)) * 100 : 0)}%`,
            }}
          />
        </div>
        <p className="mt-1 text-[9px] text-slate-600">
          AI answers only from allowlisted claim ids — empty Core panels mean thinner packs.
        </p>
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

            }}
            title={packModeTaskLabel(m.id)}
            className={`rounded border px-2 py-1 text-[10px] ${
              mode === m.id
                ? m.id === 'pack_custom_prompt'
                  ? 'border-cyan-600 bg-cyan-900/40 text-cyan-200'
                  : 'border-indigo-600 bg-indigo-900/40 text-indigo-200'
                : 'border-slate-700 text-slate-500 hover:border-slate-600'
            }`}
            data-testid={`pack-ai-mode-${m.id}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[11px] text-slate-500 leading-relaxed">{packModeTaskLabel(mode)}</p>

      {isCustom && (
        <div className="mb-2 space-y-1.5" data-testid="pack-ai-custom-prompt">
          <label className="block text-[10px] font-medium text-slate-400">Your prompt</label>
          <textarea
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            rows={3}
            placeholder="Ask anything about this pack’s evidence (e.g. compare safety signals, list trial gaps…)"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none resize-y min-h-[4rem]"
            data-testid="pack-ai-custom-input"
          />
        </div>
      )}

      {promptPreview && (
        <AiPromptReveal
          system={promptPreview.system}
          user={promptPreview.user}
          mode={mode}
          version="packAi@v1"
          className="mb-2"
          testId="pack-ai-prompt"
        />
      )}
      <AiGenerationHistory
        kind="pack"
        mode={mode}
        contextKey={pack?.id}
        className="mb-2"
        testId="pack-ai-history"
        onRestore={(entry: AiGeneratedRecord) => {
          try {
            const insight = (entry.task ?? JSON.parse(entry.content)) as StructuredInsight
            if (insight?.summary || insight?.claimIds) {
              setInsight(insight)
              setError(null)
            }
          } catch {
            setError('Could not restore that generation')
          }
        }}
      />

      {gated ? (
        <p className="text-[11px] text-amber-400/90">
          Need ≥{minClaims} claims in pack for {mode.replace(/_/g, ' ')} (have {claimCount}).
          Download after Core panels load, or load more molecule evidence.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || !pack || (isCustom && !customQuestion.trim())}
          className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs text-white hover:bg-indigo-600 disabled:opacity-50"
          data-testid="pack-ai-run"
        >
          {busy
            ? isCustom
              ? 'Thinking…'
              : 'Running…'
            : isCustom
              ? 'Send prompt'
              : 'Run analysis'}
        </button>
      )}

      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}

      {insight && (
        <div
          className="mt-3 space-y-2 rounded border border-slate-800 bg-slate-900/50 p-2 text-xs text-slate-300"
          data-testid="pack-ai-insight"
        >
          {!isStructuredPackMode(mode) ? (
            <div className="leading-relaxed whitespace-pre-wrap">{insight.summary}</div>
          ) : (
            <p className="leading-relaxed">{insight.summary}</p>
          )}
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
          {insight.claimIds.length > 0 && evidenceLines.length === 0 && isStructuredPackMode(mode) && (
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
