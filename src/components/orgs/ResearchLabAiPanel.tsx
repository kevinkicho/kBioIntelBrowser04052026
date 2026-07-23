'use client'

/**
 * Claim-bound AI activities on a research-lab dossier.
 * Reuses /api/ai/pack with structured modes — BYOM Ollama only.
 * Every generation is recorded (local IDB + cloud when signed in),
 * navigable with prev/next, prompt-visible, commentable.
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
import { persistAiGeneration } from '@/lib/ai/aiHistoryStore'
import type { AiGeneratedRecord } from '@/lib/firebase/aiDataSync'
import { AiPromptReveal } from '@/components/ai/AiPromptReveal'
import { AiRegenerateModal } from '@/components/ai/AiRegenerateModal'
import { AiRunNavigator } from '@/components/ai/AiRunNavigator'
import { AiPanelIntro } from '@/components/ai/AiPanelIntro'
import { AiWhyTooltip } from '@/components/ai/AiWhyTooltip'
import { HelperTip } from '@/components/ui/HelperTip'
import { buildPackAiModeWhy, buildInsightNextStepWhy } from '@/lib/ai/aiWhyTooltip'
import { parseAiGenerationInsight } from '@/lib/ai/parseAiGeneration'
import {
  aiRunButtonLabel,
  aiSurfaceIntro,
  packModeExpectLine,
} from '@/lib/ai/aiUiCopy'

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
  const [customQuestion, setCustomQuestion] = useState('')
  const [regenOpen, setRegenOpen] = useState(false)
  const [histRefresh, setHistRefresh] = useState(0)
  const [activeGenId, setActiveGenId] = useState<string | null>(null)

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

  const run = async (override?: { system: string; user: string }) => {
    if (!pack || gated) return
    if (isCustom && !customQuestion.trim() && !override?.user?.trim()) {
      setError('Enter a question first.')
      return
    }
    if (!ai.hasUserApiKey || !ai.model) {
      setError(
        'Add your Ollama Cloud API key and connect (top-bar AI), then pick a model. Lab AI is claim-bound live synthesis — not dummy data.',
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
        surface: 'research_lab',
      })
      if (data.refused || !data.insight || !res.ok) {
        const msg = data.refuseReason || data.error || `AI failed (${res.status})`
        setError(msg)
        const saved = await persistAiGeneration({
          kind: 'research_lab',
          mode,
          content: msg,
          context: { packId: pack.id, name: pack.title },
          model: ai.model,
          ollamaUrl: ai.ollamaUrl,
          error: msg,
          promptSystem: sys,
          promptUser: usr,
        })
        if (saved.id) setActiveGenId(saved.id)
        setHistRefresh((n) => n + 1)
        return
      }
      setInsight(data.insight)
      setRegenOpen(false)
      const saved = await persistAiGeneration({
        kind: 'research_lab',
        mode,
        content: JSON.stringify(data.insight),
        context: { packId: pack.id, name: pack.title },
        model: ai.model,
        ollamaUrl: ai.ollamaUrl,
        task: data.insight,
        promptSystem: sys,
        promptUser: usr,
      })
      if (saved.id) setActiveGenId(saved.id)
      setHistRefresh((n) => n + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function restoreEntry(entry: AiGeneratedRecord) {
    const next = parseAiGenerationInsight(entry)
    if (next) {
      setInsight(next)
      setError(entry.error || null)
      setActiveGenId(entry.id)
      return
    }
    setError('Could not load that generation')
  }

  if (!pack) return null

  const intro = aiSurfaceIntro('research_lab')
  const status =
    !ai.hasUserApiKey || !ai.model
      ? { label: 'Connect AI first', tone: 'warn' as const }
      : gated
        ? { label: `Need ≥${minClaims} claims`, tone: 'warn' as const }
        : { label: 'Ready to generate', tone: 'ready' as const }

  return (
    <section
      className={`rounded-xl border border-violet-900/40 bg-violet-950/20 p-4 ${className}`}
      data-testid="research-lab-ai-panel"
    >
      <AiPanelIntro intro={intro} status={status} testId="research-lab-ai-intro" />

      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          1. Pick what to generate
        </p>
        <HelperTip
          content={`${packModeTaskLabel(mode)}\n\n${packModeExpectLine(mode)}`}
          label="About this lab AI mode"
          testId="lab-ai-mode-help"
          maxWidth="20rem"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {LAB_MODES.map((m) => (
          <AiWhyTooltip key={m.id} why={buildPackAiModeWhy(m.id)} testId={`lab-ai-why-${m.id}`}>
            <button
              type="button"
              onClick={() => {
                setMode(m.id)
                setInsight(null)
                setError(null)
              }}
              className={`rounded-lg border px-2 py-1 text-[11px] ${
                mode === m.id
                  ? 'border-violet-600 bg-violet-900/50 text-violet-100'
                  : 'border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.labLabel}
            </button>
          </AiWhyTooltip>
        ))}
      </div>

      {isCustom && (
        <textarea
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
          placeholder="Ask about this institution’s free-public affiliation footprint…"
          data-testid="research-lab-ai-custom"
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          2. Generate
        </p>
        {promptPreview && (
          <AiPromptReveal
            system={promptPreview.system}
            user={promptPreview.user}
            mode={mode}
            version="labAi@v1"
            testId="research-lab-ai-prompt"
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || gated || !pack.claims.length || (isCustom && !customQuestion.trim())}
          onClick={() => void run()}
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          data-testid="research-lab-ai-run"
        >
          {aiRunButtonLabel({
            busy,
            hasResult: Boolean(insight),
            isCustom,
            surface: 'research_lab',
          })}
        </button>
        {(insight || promptPreview) && (
          <button
            type="button"
            disabled={busy || gated}
            onClick={() => setRegenOpen(true)}
            className="rounded-lg border border-violet-700/50 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-950/40 disabled:opacity-50"
            data-testid="research-lab-ai-regenerate"
          >
            Edit prompt &amp; regenerate…
          </button>
        )}
        <span className="text-[10px] text-slate-500">
          {claimCount} claims in dossier
          {gated ? ` · need at least ${minClaims} for this mode` : ''}
        </span>
      </div>

      {promptPreview && (
        <AiRegenerateModal
          open={regenOpen}
          onClose={() => setRegenOpen(false)}
          kind="research_lab"
          mode={mode}
          title="Regenerate research lab AI"
          systemPrompt={promptPreview.system}
          userPrompt={promptPreview.user}
          contextKey={pack.id}
          busy={busy}
          allowOverrideSystem
          onLoadEntry={restoreEntry}
          onRegenerate={async ({ system, user }) => {
            await run({ system, user })
          }}
          testId="research-lab-ai-regen-modal"
        />
      )}

      {error && (
        <p className="mt-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      {insight && (
        <div className="mt-3 rounded-lg border border-violet-900/40 bg-slate-950/50 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/80">
            Latest result
          </p>
          <p className="text-sm text-slate-100 whitespace-pre-wrap">{insight.summary}</p>
          {insight.nextSteps && insight.nextSteps.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-400">Next</p>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {insight.nextSteps.map((s) => (
                  <li key={s}>
                    <AiWhyTooltip
                      why={buildInsightNextStepWhy(s, insight.claimIds)}
                      testId="lab-ai-why-next"
                      className="w-full"
                    >
                      <span className="block cursor-help leading-snug underline decoration-dotted decoration-slate-600 underline-offset-2">
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
              <p className="text-[10px] font-semibold uppercase text-slate-400">Risks / limits</p>
              <ul className="space-y-1 text-[11px] text-amber-200/90">
                {insight.risks.map((s) => (
                  <li key={s}>
                    <AiWhyTooltip
                      why={buildInsightNextStepWhy(s, insight.claimIds)}
                      testId="lab-ai-why-risk"
                      className="w-full"
                    >
                      <span className="block cursor-help leading-snug underline decoration-dotted decoration-amber-800/60 underline-offset-2">
                        {s}
                      </span>
                    </AiWhyTooltip>
                  </li>
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
                    <span className="font-mono text-slate-600">{c.id.slice(0, 18)}…</span>{' '}
                    {c.statement}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          3. Past results for this mode
        </p>
        <AiRunNavigator
          kind="research_lab"
          mode={mode}
          contextKey={pack.id}
          refreshKey={histRefresh}
          activeId={activeGenId}
          onSelect={restoreEntry}
          testId="research-lab-ai-runs"
        />
      </div>
    </section>
  )
}
