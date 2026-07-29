'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Project, ResearchHypothesis } from '@/lib/domain'
import type { EvidenceClaim } from '@/lib/evidence'
import {
  deleteEmptyClaimResearchHypotheses,
  deleteResearchHypothesis,
  generateAndSavePromotedResearchHypothesis,
  RH_STATUS_LABELS,
  RH_STATUS_STYLES,
  saveResearchHypothesis,
  seedRhFromPaste,
} from '@/lib/project'
import { useAI } from '@/lib/ai/useAI'
import { emitProductEvent } from '@/lib/productEvents'
import { HelperTip, StatementTip } from '@/components/ui/HelperTip'

export function ResearchHypothesisSection({
  project,
  hypotheses,
  boardClaims,
  panelsLoading,
  onBanner,
  onRefresh,
}: {
  project: Project
  hypotheses: ResearchHypothesis[]
  boardClaims: EvidenceClaim[]
  panelsLoading: boolean
  onBanner: (type: 'ok' | 'err', text: string) => void
  onRefresh: () => void
}) {
  const ai = useAI()
  const [pasteThesis, setPasteThesis] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [promotedRhBusy, setPromotedRhBusy] = useState(false)

  return (
    <section className="mt-8 space-y-3" data-testid="research-hypotheses-section">
      <div className="flex flex-wrap items-center gap-1.5">
        <h2 className="text-lg font-semibold text-slate-100">Research hypotheses</h2>
        <HelperTip
          content="Project-scoped narrative theses (not set-ops filter intersections). Claim-bound AI on the editor: thesis studio, rivals, Monday experiments, gap map, adversarial review, exports."
          label="About research hypotheses"
          testId="project-rh-section-help"
        />
      </div>

      <div
        className="rounded-xl border border-slate-800 bg-slate-900/40 p-3"
        data-testid="rh-path-chooser"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[11px] font-medium text-slate-300">Start a hypothesis</p>
          <HelperTip
            content="Prefer Seed research hypothesis on a downloaded pack above. Or generate a claim-bound thesis from promoted board candidates using RH AI (Ollama Cloud) grounded in Core-panel claims — not boilerplate templates."
            label="How to start a hypothesis"
            testId="rh-path-chooser-help"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="rh-seed-promoted"
            disabled={promotedRhBusy || panelsLoading}
            className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-2.5 py-1.5 text-[10px] text-emerald-200 hover:bg-emerald-900/40 disabled:opacity-50"
            onClick={() => {
              void (async () => {
                const promoted = project.candidates.filter((c) => c.boardStatus === 'promote')
                if (promoted.length === 0) {
                  onBanner('err', 'Promote at least one board candidate first.')
                  return
                }
                if (!ai.hasUserApiKey || !ai.model) {
                  onBanner(
                    'err',
                    'Connect Ollama Cloud (top-bar AI) and pick a model. Promoted RH seed is claim-bound live AI — not a static template.',
                  )
                  return
                }
                if (boardClaims.length < 3 && !panelsLoading) {
                  onBanner(
                    'err',
                    `Need board evidence claims first (have ${boardClaims.length}). Wait for Core panels, or download an evidence pack, then retry.`,
                  )
                  return
                }
                setPromotedRhBusy(true)
                try {
                  const pack = project.packIndex?.[0]
                  const res = await generateAndSavePromotedResearchHypothesis({
                    project,
                    boardClaims,
                    packId: pack?.id,
                    packClaimIds: pack?.claimIds,
                    model: ai.model,
                    ollamaUrl: ai.ollamaUrl,
                    ollamaApiKey: ai.ollamaApiKey,
                  })
                  emitProductEvent('ai_response', {
                    mode: 'rh_thesis_draft',
                    ok: res.ok,
                    refused: Boolean(res.refused),
                    claimCount: res.claimCount,
                    surface: 'promoted_rh_seed',
                  })
                  if (!res.ok) {
                    onBanner('err', res.error ?? 'Promoted RH AI failed')
                    return
                  }
                  onRefresh()
                  onBanner(
                    'ok',
                    `AI thesis saved for ${promoted.length} promoted candidate(s) · ${res.claimCount} claims · open Edit to refine`,
                  )
                } finally {
                  setPromotedRhBusy(false)
                }
              })()
            }}
          >
            {promotedRhBusy
              ? 'Generating claim-bound thesis…'
              : panelsLoading
                ? 'Loading board claims…'
                : 'From promoted candidates (AI)'}
          </button>
          <button
            type="button"
            data-testid="rh-paste-toggle"
            className="rounded-lg border border-cyan-800/40 px-2.5 py-1.5 text-[10px] text-cyan-200 hover:bg-cyan-950/30"
            onClick={() => setShowPaste((v) => !v)}
          >
            Paste my draft
          </button>
        </div>
        {project.packIndex?.length ? (
          <p className="mt-2 text-[10px] text-slate-600">
            Pack index ready — use{' '}
            <strong className="font-medium text-slate-400">Seed research hypothesis</strong> on a pack
            entry above for the strongest claim binding.
          </p>
        ) : (
          <p className="mt-2 text-[10px] text-amber-500/80">
            No pack index yet — download an evidence pack (or wait for board claims) so AI can cite
            real evidence.
          </p>
        )}
        {showPaste && (
          <div className="mt-3 space-y-2" data-testid="rh-paste-form">
            <textarea
              value={pasteThesis}
              onChange={(e) => setPasteThesis(e.target.value)}
              rows={4}
              placeholder="Paste your own thesis (your words). Prefer pack seed or promoted AI when you want claim-bound structure."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-200"
            />
            <button
              type="button"
              disabled={!pasteThesis.trim()}
              className="rounded-lg bg-cyan-800 px-3 py-1.5 text-[10px] text-white hover:bg-cyan-700 disabled:opacity-50"
              onClick={() => {
                const hyp = seedRhFromPaste({
                  projectId: project.id,
                  project,
                  thesis: pasteThesis,
                  claimIds:
                    boardClaims.length > 0
                      ? boardClaims.map((c) => c.id).slice(0, 50)
                      : project.packIndex?.[0]?.claimIds ?? [],
                })
                const saved = saveResearchHypothesis(hyp)
                if (!saved.ok) {
                  onBanner('err', saved.message)
                  return
                }
                setPasteThesis('')
                setShowPaste(false)
                onRefresh()
                onBanner('ok', 'Saved your draft thesis')
              }}
            >
              Save draft hypothesis
            </button>
          </div>
        )}
      </div>

      {hypotheses.some((h) => !h.claimIds?.length) && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2"
          data-testid="rh-empty-claim-cleanup"
        >
          <p className="text-[11px] text-amber-200/90">
            {hypotheses.filter((h) => !h.claimIds?.length).length} draft(s) have{' '}
            <strong>0 claims</strong> (not evidence-bound — safe to remove).
          </p>
          <button
            type="button"
            data-testid="rh-remove-empty-claims"
            className="rounded border border-rose-800/50 bg-rose-950/40 px-2.5 py-1 text-[10px] text-rose-200 hover:bg-rose-900/40"
            onClick={() => {
              const n = hypotheses.filter((h) => !h.claimIds?.length).length
              if (
                !window.confirm(
                  `Delete ${n} research hypothesis draft(s) with 0 claims? This cannot be undone.`,
                )
              ) {
                return
              }
              const res = deleteEmptyClaimResearchHypotheses(project.id)
              if (!res.ok) {
                onBanner('err', res.message)
                return
              }
              onRefresh()
              onBanner('ok', `Removed ${res.value.removed} empty draft(s)`)
            }}
          >
            Remove 0-claim drafts
          </button>
        </div>
      )}

      {hypotheses.length === 0 ? (
        <p className="text-sm text-slate-600" data-testid="rh-empty">
          No research hypotheses yet — download a pack and seed, or pick a path above.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="research-hypotheses-list">
          {hypotheses.map((h) => {
            const st = h.status ?? 'draft'
            const emptyClaims = !h.claimIds?.length
            return (
              <li
                key={h.id}
                className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
                data-testid={`rh-item-${h.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-medium text-slate-200">{h.title}</div>
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[9px] ${RH_STATUS_STYLES[st]}`}
                    >
                      {RH_STATUS_LABELS[st]}
                    </span>
                    {emptyClaims && (
                      <span className="rounded border border-amber-800/40 px-1.5 py-0.5 text-[9px] text-amber-300/90">
                        no claims
                      </span>
                    )}
                    {h.role && h.role !== 'primary' && (
                      <span className="text-[9px] uppercase text-slate-500">{h.role}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/projects/${project.id}/hypothesis/${h.id}`}
                      data-testid={`rh-edit-${h.id}`}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300"
                    >
                      Edit →
                    </Link>
                    <button
                      type="button"
                      data-testid={`rh-delete-${h.id}`}
                      className="text-[10px] text-rose-400/90 hover:text-rose-300"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Delete research hypothesis “${h.title}”? This cannot be undone.`,
                          )
                        ) {
                          return
                        }
                        const res = deleteResearchHypothesis(h.id)
                        if (!res.ok) {
                          onBanner('err', res.message)
                          return
                        }
                        onRefresh()
                        onBanner('ok', 'Research hypothesis deleted')
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <StatementTip statement={h.thesis} label="Thesis" testId={`rh-list-thesis-${h.id}`} />
                  <span className="text-[10px] tabular-nums text-slate-600">
                    {h.claimIds.length} claims · {h.candidateIds.length} candidates · v{h.version}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
