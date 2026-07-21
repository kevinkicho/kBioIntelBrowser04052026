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
import { persistAiGeneration } from '@/lib/ai/aiHistoryStore'
import type { AiGeneratedRecord } from '@/lib/firebase/aiDataSync'
import { AiPromptReveal } from '@/components/ai/AiPromptReveal'
import { AiRegenerateModal } from '@/components/ai/AiRegenerateModal'
import { AiRunNavigator } from '@/components/ai/AiRunNavigator'
import { AiPanelIntro } from '@/components/ai/AiPanelIntro'
import { AiWhyTooltip } from '@/components/ai/AiWhyTooltip'
import { buildPackAiModeWhy, buildInsightNextStepWhy } from '@/lib/ai/aiWhyTooltip'
import { parseAiGenerationInsight } from '@/lib/ai/parseAiGeneration'
import {
  aiRunButtonLabel,
  aiSurfaceIntro,
  packModeExpectLine,
} from '@/lib/ai/aiUiCopy'

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
  const [regenOpen, setRegenOpen] = useState(false)
  const [histRefresh, setHistRefresh] = useState(0)
  const [activeGenId, setActiveGenId] = useState<string | null>(null)

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

  const run = async (override?: { system: string; user: string }) => {
    if (!pack || gated) return
    if (isCustom && !customQuestion.trim() && !override?.user?.trim()) {
      setError('Enter a question or prompt first.')
      return
    }
    if (!ai.hasUserApiKey || !ai.model) {
      setError(
        'Add your Ollama Cloud API key and connect (top-bar AI button), then pick a model. Pack AI is not dummy data — it calls the live model.',
      )
      return
    }
    setBusy(true)
    setError(null)
    if (!override) setInsight(null)
    const sys = override?.system ?? promptPreview?.system
    const usr = override?.user ?? promptPreview?.user
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
          ...(override
            ? { overrideSystem: override.system, overrideUser: override.user }
            : {}),
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
        const saved = await persistAiGeneration({
          kind: 'pack',
          mode,
          content: data.refuseReason ?? data.error ?? 'refused',
          context: { packId: pack.id, name: pack.title },
          model: ai.model,
          ollamaUrl: ai.ollamaUrl,
          error: data.refuseReason ?? data.error,
          promptSystem: sys,
          promptUser: usr,
        })
        if (saved.id) setActiveGenId(saved.id)
        setHistRefresh((n) => n + 1)
        return
      }
      setInsight(data.insight)
      onInsight?.(mode, data.insight)
      setRegenOpen(false)
      const saved = await persistAiGeneration({
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
        promptSystem: sys,
        promptUser: usr,
      })
      if (saved.id) setActiveGenId(saved.id)
      setHistRefresh((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pack AI failed')
    } finally {
      setBusy(false)
    }
  }

  function restorePackEntry(entry: AiGeneratedRecord) {
    const next = parseAiGenerationInsight(entry)
    if (next) {
      setInsight(next)
      setError(entry.error || null)
      setActiveGenId(entry.id)
      return
    }
    setError('Could not load that generation')
  }

  const intro = aiSurfaceIntro('pack')
  const status =
    !ai.hasUserApiKey || !ai.model
      ? { label: 'Connect AI first', tone: 'warn' as const }
      : gated
        ? { label: `Need ≥${minClaims} claims`, tone: 'warn' as const }
        : { label: 'Ready to generate', tone: 'ready' as const }

  return (
    <div
      className={`mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 ${className}`}
      data-testid="pack-ai-panel"
    >
      <AiPanelIntro intro={intro} status={status} testId="pack-ai-intro" />

      {/* Claim coverage — honesty before AI */}
      <div
        className="mb-3 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-2"
        data-testid="pack-claim-coverage"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <span className="text-slate-400">
            Evidence in this pack:{' '}
            <span className="font-mono tabular-nums text-slate-200">{claimCount}</span>
            <span className="text-slate-600"> claims</span>
            <span className="text-slate-600"> · </span>
            <span className="font-mono tabular-nums text-slate-200">{citableCount}</span>
            <span className="text-slate-600"> with source links</span>
            {minClaims > 0 && (
              <span className="text-slate-600">
                {' '}
                · this mode needs at least {minClaims}
              </span>
            )}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              gated ? 'bg-amber-600/70' : 'bg-emerald-600/80'
            }`}
            style={{
              width: `${Math.min(100, minClaims > 0 ? (claimCount / Math.max(minClaims, 1)) * 100 : claimCount > 0 ? 100 : 0)}%`,
            }}
          />
        </div>
        <p className="mt-1 text-[9px] text-slate-600">
          The model may only use allowlisted claim ids from this pack. Empty Core panels → thinner
          answers.
        </p>
      </div>

      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        1. Pick what to generate
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {MODES.map((m) => (
          <AiWhyTooltip
            key={m.id}
            why={buildPackAiModeWhy(m.id)}
            testId={`pack-ai-why-${m.id}`}
          >
            <button
              type="button"
              onClick={() => {
                setMode(m.id)
                setInsight(null)
                setError(null)
              }}
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
          </AiWhyTooltip>
        ))}
      </div>

      <div className="mb-2 rounded border border-slate-800/70 bg-slate-950/30 px-2.5 py-1.5">
        <p className="text-[11px] leading-relaxed text-slate-400">{packModeTaskLabel(mode)}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-indigo-300/80">
          {packModeExpectLine(mode)}
        </p>
      </div>

      {isCustom && (
        <div className="mb-2 space-y-1.5" data-testid="pack-ai-custom-prompt">
          <label className="block text-[10px] font-medium text-slate-400">Your question</label>
          <textarea
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            rows={3}
            placeholder="e.g. Compare safety signals across candidates, or list trial gaps…"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none resize-y min-h-[4rem]"
            data-testid="pack-ai-custom-input"
          />
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          2. Generate
        </p>
        {promptPreview && (
          <AiPromptReveal
            system={promptPreview.system}
            user={promptPreview.user}
            mode={mode}
            version="packAi@v1"
            testId="pack-ai-prompt"
          />
        )}
      </div>

      {gated ? (
        <p className="text-[11px] text-amber-400/90">
          Add at least {minClaims} claims to the pack for this mode (you have {claimCount}).
          Download the pack after Core panels finish loading, or open more molecule evidence first.
        </p>
      ) : (
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy || !pack || (isCustom && !customQuestion.trim())}
            className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs text-white hover:bg-indigo-600 disabled:opacity-50"
            data-testid="pack-ai-run"
          >
            {aiRunButtonLabel({
              busy,
              hasResult: Boolean(insight),
              isCustom,
              surface: 'pack',
            })}
          </button>
          {(insight || promptPreview) && (
            <button
              type="button"
              onClick={() => setRegenOpen(true)}
              disabled={busy || !pack}
              className="rounded-lg border border-indigo-700/50 px-3 py-1.5 text-xs text-indigo-200 hover:bg-indigo-950/40 disabled:opacity-50"
              data-testid="pack-ai-regenerate"
            >
              Edit prompt &amp; regenerate…
            </button>
          )}
        </div>
      )}

      {promptPreview && pack && (
        <AiRegenerateModal
          open={regenOpen}
          onClose={() => setRegenOpen(false)}
          kind="pack"
          mode={mode}
          title="Regenerate Pack AI"
          systemPrompt={promptPreview.system}
          userPrompt={promptPreview.user}
          contextKey={pack.id}
          busy={busy}
          allowOverrideSystem
          onLoadEntry={(entry: AiGeneratedRecord) => {
            restorePackEntry(entry)
          }}
          onRegenerate={async ({ system, user }) => {
            await run({ system, user })
          }}
          testId="pack-ai-regen-modal"
        />
      )}

      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}

      {insight && (
        <div
          className="mt-3 space-y-2 rounded border border-indigo-900/40 bg-slate-900/50 p-2 text-xs text-slate-300"
          data-testid="pack-ai-insight"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300/80">
            Latest result
          </p>
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
              <ul className="space-y-1 text-[11px] text-emerald-300/90">
                {insight.nextSteps.map((s) => (
                  <li key={s} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-emerald-600">•</span>
                    <AiWhyTooltip
                      why={buildInsightNextStepWhy(s, insight.claimIds)}
                      testId="pack-ai-why-next"
                      className="min-w-0 flex-1"
                    >
                      <span className="block cursor-help leading-snug underline decoration-dotted decoration-emerald-800/50 underline-offset-2">
                        {s}
                      </span>
                    </AiWhyTooltip>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insight.risks && insight.risks.length > 0 && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 mb-1">
                Risks / caveats
              </p>
              <ul className="space-y-1 text-[11px] text-amber-300/90">
                {insight.risks.map((s) => (
                  <li key={s} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-amber-600">•</span>
                    <AiWhyTooltip
                      why={buildInsightNextStepWhy(s, insight.claimIds)}
                      testId="pack-ai-why-risk"
                      className="min-w-0 flex-1"
                    >
                      <span className="block cursor-help leading-snug underline decoration-dotted decoration-amber-800/50 underline-offset-2">
                        {s}
                      </span>
                    </AiWhyTooltip>
                  </li>
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

      {pack && (
        <div className="mt-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            3. Past results for this mode
          </p>
          <AiRunNavigator
            kind="pack"
            mode={mode}
            contextKey={pack.id}
            refreshKey={histRefresh}
            activeId={activeGenId}
            onSelect={restorePackEntry}
            testId="pack-ai-runs"
          />
        </div>
      )}
    </div>
  )
}
