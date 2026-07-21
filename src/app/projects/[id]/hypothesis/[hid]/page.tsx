'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type {
  EvidenceClaim,
  NextExperiment,
  Project,
  ResearchHypothesis,
  ResearchHypothesisStatus,
} from '@/lib/domain'
import {
  appendNextExperiment,
  appendSignalNotesToThesis,
  buildEvidenceGapMap,
  buildMechanismStoryboard,
  collectThesisSignalTouches,
  createRivalHypothesis,
  getProject,
  getResearchHypothesis,
  rehydrateClaimsForHypothesis,
  researchHypothesisToCollaboratorOnePager,
  researchHypothesisToLabMeetingMd,
  researchHypothesisToSpecificAimsMd,
  RH_STATUS_LABELS,
  RH_STATUS_STYLES,
  saveResearchHypothesis,
  sectionsToThesis,
  updateResearchHypothesis,
  type ThesisSignalTouch,
} from '@/lib/project'
import type { RhAiMode, RhStructuredInsight } from '@/lib/ai/rhContracts'
import { emitProductEvent } from '@/lib/productEvents'
import { downloadFile } from '@/lib/exportData'
import { originSourceDeepLink, claimProvenanceDeepLink } from '@/lib/originDeepLinks'
import { RhAiPanel } from '@/components/evidence/RhAiPanel'
import { MultiPackContrastPicker } from '@/components/evidence/MultiPackContrastPicker'
import { loadProjectSignals, type CandidateSignalRow } from '@/lib/signals'
import { ScoreAxisBars } from '@/app/discover/components/ScoreAxisBars'

const STATUSES: ResearchHypothesisStatus[] = [
  'draft',
  'active',
  'shelved',
  'killed',
  'graduated',
]

export default function ResearchHypothesisEditorPage() {
  const params = useParams()
  const projectId =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const hypId =
    typeof params?.hid === 'string' ? params.hid : Array.isArray(params?.hid) ? params.hid[0] : ''

  const [hyp, setHyp] = useState<ResearchHypothesis | null | undefined>(undefined)
  const [project, setProject] = useState<Project | null>(null)
  const [title, setTitle] = useState('')
  const [thesis, setThesis] = useState('')
  const [expText, setExpText] = useState('')
  const [banner, setBanner] = useState<string | null>(null)
  const [claims, setClaims] = useState<EvidenceClaim[]>([])
  const [rehydrateSource, setRehydrateSource] = useState<string | null>(null)
  const [rehydrateError, setRehydrateError] = useState<string | null>(null)
  const [rehydrateBusy, setRehydrateBusy] = useState(false)
  const [lastInsight, setLastInsight] = useState<{
    mode: RhAiMode
    insight: RhStructuredInsight
  } | null>(null)
  const [killedReason, setKilledReason] = useState('')
  const [signalRows, setSignalRows] = useState<CandidateSignalRow[] | null>(null)
  const [signalsLoading, setSignalsLoading] = useState(false)
  const [signalBannerDismissed, setSignalBannerDismissed] = useState(false)
  const [touches, setTouches] = useState<ThesisSignalTouch[]>([])

  const flash = (msg: string) => {
    setBanner(msg)
    window.setTimeout(() => setBanner(null), 3500)
  }

  const persist = useCallback((next: ResearchHypothesis, msg?: string) => {
    const saved = saveResearchHypothesis(next)
    if (!saved.ok) {
      flash(saved.message)
      return null
    }
    setHyp(saved.value)
    setTitle(saved.value.title)
    setThesis(saved.value.thesis)
    setKilledReason(saved.value.killedReason ?? '')
    if (msg) flash(msg)
    return saved.value
  }, [])

  const runRehydrate = useCallback(async (h: ResearchHypothesis) => {
    const proj = getProject(h.projectId)
    if (!proj) {
      setRehydrateError('Project not found — cannot rebuild claims')
      setClaims([])
      return
    }
    setProject(proj)
    setRehydrateBusy(true)
    setRehydrateError(null)
    try {
      const res = await rehydrateClaimsForHypothesis(h, proj)
      setClaims(res.claims)
      setRehydrateSource(res.source)
      if (res.error) setRehydrateError(res.error)
      if (res.claims.length === 0 && !res.error) {
        setRehydrateError('No claim statements available. Download a pack from the board first.')
      }
    } finally {
      setRehydrateBusy(false)
    }
  }, [])

  useEffect(() => {
    if (!hypId) {
      setHyp(null)
      return
    }
    const res = getResearchHypothesis(hypId)
    if (!res.ok) {
      setHyp(null)
      return
    }
    setHyp(res.value)
    setTitle(res.value.title)
    setThesis(res.value.thesis)
    setKilledReason(res.value.killedReason ?? '')
    setSignalBannerDismissed(false)
    const proj = getProject(res.value.projectId)
    setProject(proj)
    emitProductEvent('research_hypothesis_opened', { hypId, projectId: res.value.projectId })
    if (res.value.claimIds.length > 0) {
      void runRehydrate(res.value)
    }
    // Load board signals for linked candidates (do not refresh baseline — keep badges for thesis review)
    if (proj) {
      setSignalsLoading(true)
      void loadProjectSignals(proj, { refreshBaseline: false, concurrency: 2 })
        .then((rows) => {
          setSignalRows(rows)
        })
        .catch(() => setSignalRows([]))
        .finally(() => setSignalsLoading(false))
    }
  }, [hypId, projectId, runRehydrate])

  const linkedCandidates = useMemo(() => {
    if (!project || !hyp) return []
    return project.candidates.filter((c) => hyp.candidateIds.includes(c.candidateId))
  }, [project, hyp])

  useEffect(() => {
    if (!hyp || !signalRows) {
      setTouches([])
      return
    }
    const next = collectThesisSignalTouches(
      { ...hyp, thesis, title },
      claims,
      signalRows,
      { max: 10 },
    )
    setTouches(next)
  }, [hyp, thesis, title, claims, signalRows])

  const gapMap = useMemo(
    () =>
      buildEvidenceGapMap({
        claims,
        candidates: linkedCandidates,
        diseaseName: project?.disease?.name,
        targetIds: project?.targetIds ?? hyp?.targetIds,
      }),
    [claims, linkedCandidates, project, hyp],
  )

  const storyboard = useMemo(
    () =>
      buildMechanismStoryboard({
        diseaseName: project?.disease?.name,
        targetIds: project?.targetIds ?? hyp?.targetIds,
        candidates: linkedCandidates,
        claims,
      }),
    [project, hyp, linkedCandidates, claims],
  )

  const handleSave = useCallback(() => {
    if (!hyp) return
    const next = updateResearchHypothesis(hyp, {
      title,
      thesis,
      killedReason: hyp.status === 'killed' ? killedReason : hyp.killedReason,
    })
    persist(next, 'Saved')
  }, [hyp, title, thesis, killedReason, persist])

  const handleStatus = useCallback(
    (status: ResearchHypothesisStatus) => {
      if (!hyp) return
      const next = updateResearchHypothesis(hyp, {
        status,
        killedReason: status === 'killed' ? killedReason || 'Killed by user' : undefined,
      })
      persist(next, `Status → ${RH_STATUS_LABELS[status]}`)
    },
    [hyp, killedReason, persist],
  )

  const handleAddExperiment = useCallback(() => {
    if (!hyp || !expText.trim()) return
    const next = appendNextExperiment(hyp, {
      description: expText.trim(),
      priority: 'medium',
      relatedClaimIds: hyp.claimIds.slice(0, 5),
      experimentType: 'other',
      costTier: 'medium',
    })
    if (persist(next, 'Experiment added')) setExpText('')
  }, [hyp, expText, persist])

  const applyInsight = useCallback(
    (kind: 'thesis' | 'experiments' | 'rivals' | 'lab') => {
      if (!hyp || !lastInsight) return
      const { mode, insight } = lastInsight

      if (kind === 'thesis' && (insight.sections || insight.summary)) {
        const sections = insight.sections
          ? {
              ...insight.sections,
              claimIds: insight.claimIds,
            }
          : hyp.sections
        const newThesis = insight.sections
          ? sectionsToThesis({ ...insight.sections, claimIds: insight.claimIds })
          : insight.summary
        const next = updateResearchHypothesis(hyp, {
          thesis: newThesis,
          sections,
          title:
            mode === 'rh_thesis_draft' && insight.sections?.workingClaim
              ? insight.sections.workingClaim.slice(0, 200)
              : hyp.title,
        })
        persist(next, 'Applied thesis draft (version bumped)')
        return
      }

      if (kind === 'experiments') {
        const drafts =
          insight.experiments?.map((e) => ({
            description: e.description,
            rationale: e.rationale,
            priority: e.priority ?? ('medium' as const),
            relatedClaimIds: e.relatedClaimIds ?? insight.claimIds.slice(0, 5),
            successCriteria: e.successCriteria,
            failCriteria: e.failCriteria,
            costTier: e.costTier,
            experimentType: (e.experimentType as NextExperiment['experimentType']) ?? 'other',
          })) ??
          (insight.nextSteps ?? []).map((description, i) => ({
            description,
            priority: (i === 0 ? 'high' : 'medium') as 'high' | 'medium',
            relatedClaimIds: insight.claimIds.slice(0, 5),
            experimentType: 'other' as const,
            costTier: 'medium' as const,
          }))
        if (!drafts.length) {
          flash('No experiments in last AI result')
          return
        }
        let cur = hyp
        for (const d of drafts) {
          cur = appendNextExperiment(cur, d)
        }
        persist(cur, `Applied ${drafts.length} experiment(s)`)
        return
      }

      if (kind === 'rivals' && insight.rivals?.length) {
        let created = 0
        for (const r of insight.rivals) {
          if (r.role === 'primary') {
            const next = updateResearchHypothesis(hyp, {
              title: r.title.slice(0, 200),
              thesis: r.thesis,
              role: 'primary',
            })
            persist(next)
            created++
            continue
          }
          const rival = createRivalHypothesis(hyp, {
            title: r.title,
            thesis: r.thesis,
            role: r.role,
            claimIds: insight.claimIds.length ? insight.claimIds : hyp.claimIds,
          })
          const saved = saveResearchHypothesis(rival)
          if (saved.ok) created++
        }
        flash(`Saved rival set (${created} updates). Refresh project list for siblings.`)
        return
      }

      if (kind === 'lab') {
        const md = researchHypothesisToLabMeetingMd(
          { ...hyp, thesis: insight.summary || hyp.thesis },
          claims,
        )
        downloadFile(md, `lab-meeting-${hyp.id.slice(0, 12)}.md`, 'text/markdown')
        flash('Downloaded lab-meeting markdown')
      }
    },
    [hyp, lastInsight, claims, persist],
  )

  const exportMd = useCallback(
    (kind: 'lab' | 'aims' | 'onepager') => {
      if (!hyp || !project) return
      if (kind === 'lab') {
        downloadFile(
          researchHypothesisToLabMeetingMd(hyp, claims),
          `rh-lab-${hyp.id.slice(0, 10)}.md`,
          'text/markdown',
        )
      } else if (kind === 'aims') {
        downloadFile(
          researchHypothesisToSpecificAimsMd(hyp, claims),
          `rh-aims-${hyp.id.slice(0, 10)}.md`,
          'text/markdown',
        )
      } else {
        downloadFile(
          researchHypothesisToCollaboratorOnePager(hyp, project, claims),
          `rh-onepager-${hyp.id.slice(0, 10)}.md`,
          'text/markdown',
        )
      }
      flash('Export downloaded')
    },
    [hyp, project, claims],
  )

  if (hyp === undefined) {
    return (
      <main className="min-h-screen bg-[#0f1117] px-4 py-12 text-center text-slate-500">
        Loading…
      </main>
    )
  }

  if (!hyp) {
    return (
      <main className="min-h-screen bg-[#0f1117] px-4 py-12 text-center">
        <h1 className="mb-2 text-xl font-semibold text-slate-200">Hypothesis not found</h1>
        <Link href={`/projects/${projectId}`} className="text-sm text-emerald-400">
          ← Back to project
        </Link>
      </main>
    )
  }

  const experiments: NextExperiment[] = hyp.nextExperiments ?? []
  const status = hyp.status ?? 'draft'

  return (
    <main className="min-h-screen bg-[#0f1117] text-slate-200">
      {/* Full canvas dense list layout — not a card grid */}
      <div className="page-canvas">
        <Link
          href={`/projects/${hyp.projectId}`}
          className="text-[11px] text-slate-500 hover:text-slate-300"
        >
          ← Project board
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-100 sm:text-2xl">Research hypothesis</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Claim-bound narrative thesis (not set-ops). v{hyp.version} · {hyp.claimIds.length}{' '}
              claims · {linkedCandidates.length} candidates
              {hyp.role ? ` · ${hyp.role}` : ''}
              {hyp.packId ? ` · pack ${hyp.packId.slice(0, 10)}…` : ''}
            </p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${RH_STATUS_STYLES[status]}`}
            data-testid="rh-status-badge"
          >
            {RH_STATUS_LABELS[status]}
          </span>
        </div>

        {banner && (
          <div className="mt-2 rounded border border-emerald-800/40 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-200">
            {banner}
          </div>
        )}

        {/* Live signals — dense list */}
        {!signalBannerDismissed && touches.length > 0 && (
          <div
            className="mt-2 overflow-hidden rounded-lg border border-amber-800/50 bg-amber-950/20"
            data-testid="rh-signal-touch-banner"
            role="status"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/40 px-2 py-1.5">
              <p className="text-[11px] font-semibold text-amber-200">
                Live signals touch thesis · {touches.length}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded border border-amber-700/50 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-900/40"
                  data-testid="rh-signal-append-notes"
                  onClick={() => {
                    if (!hyp) return
                    const nextThesis = appendSignalNotesToThesis(thesis, touches)
                    setThesis(nextThesis)
                    const next = updateResearchHypothesis(hyp, { thesis: nextThesis })
                    persist(next, 'Appended signal review notes to thesis')
                    setSignalBannerDismissed(true)
                  }}
                >
                  Append notes
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400"
                  data-testid="rh-signal-dismiss"
                  onClick={() => setSignalBannerDismissed(true)}
                >
                  Dismiss
                </button>
              </div>
            </div>
            <ul className="max-h-36 divide-y divide-amber-900/30 overflow-y-auto">
              {touches.map((t) => (
                <li
                  key={`${t.candidateId}-${t.signal.panelId}-${t.signal.type}`}
                  className="grid grid-cols-1 gap-0.5 px-2 py-1.5 text-[11px] sm:grid-cols-[minmax(0,8rem)_minmax(0,6rem)_minmax(0,1fr)_auto] sm:items-center sm:gap-2"
                >
                  <span className="font-medium text-amber-100/90 truncate">{t.name}</span>
                  <span className="text-[9px] uppercase text-slate-500">{t.relevance}</span>
                  <span className="text-slate-400 truncate">
                    {t.signal.type} · {t.signal.label}
                    {t.signal.count != null ? ` (n≈${t.signal.count})` : ''}
                    {t.reason ? ` — ${t.reason}` : ''}
                  </span>
                  {t.signal.href?.startsWith('/') ? (
                    <a
                      href={t.signal.href}
                      className="text-[10px] text-indigo-400 hover:underline justify-self-end"
                      data-testid="rh-signal-panel-link"
                    >
                      Panel
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
        {signalsLoading && (
          <p className="mt-1 text-[10px] text-slate-600 animate-pulse" data-testid="rh-signals-loading">
            Checking board signals…
          </p>
        )}

        {/* Status + title/thesis — compact editor band */}
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[10px] font-semibold uppercase text-slate-500">Status</span>
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleStatus(s)}
                className={`rounded border px-2 py-0.5 text-[10px] ${
                  status === s
                    ? RH_STATUS_STYLES[s]
                    : 'border-slate-800 text-slate-500 hover:border-slate-600'
                }`}
                data-testid={`rh-status-${s}`}
              >
                {RH_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {status === 'killed' && (
            <input
              type="text"
              value={killedReason}
              onChange={(e) => setKilledReason(e.target.value)}
              placeholder="Kill reason…"
              className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-200"
            />
          )}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Title"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 focus:border-emerald-700 focus:outline-none"
          />
          <textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            rows={8}
            placeholder="Thesis (claim-bound narrative)"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-relaxed text-slate-100 focus:border-emerald-700 focus:outline-none"
            data-testid="rh-thesis"
          />
        </div>

        {hyp.sections && (
          <section
            className="mt-2 overflow-hidden rounded-lg border border-slate-800"
            data-testid="rh-sections"
          >
            <div className="border-b border-slate-800 bg-slate-900/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Structured sections
            </div>
            <ul className="divide-y divide-slate-800/80 text-[11px]">
              {hyp.sections.workingClaim && (
                <li className="px-2 py-1.5">
                  <span className="text-[9px] uppercase text-slate-600">Working claim · </span>
                  <span className="text-emerald-300/90">{hyp.sections.workingClaim}</span>
                </li>
              )}
              {hyp.sections.killCriteria?.map((k) => (
                <li key={k} className="px-2 py-1 text-amber-200/80">
                  <span className="text-[9px] uppercase text-slate-600">Kill · </span>
                  {k}
                </li>
              ))}
              {hyp.sections.falsifiers?.map((k) => (
                <li key={k} className="px-2 py-1 text-rose-200/80">
                  <span className="text-[9px] uppercase text-slate-600">Falsifier · </span>
                  {k}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                data-testid="rh-save"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => exportMd('lab')}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
              >
                Export lab meeting
              </button>
              <button
                type="button"
                onClick={() => exportMd('aims')}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
              >
                Export Specific Aims
              </button>
              <button
                type="button"
                onClick={() => exportMd('onepager')}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
              >
                Export one-pager
              </button>
            </div>

            {/* Multi-pack contrast */}
            {project && (
              <MultiPackContrastPicker
                project={project}
                hyp={hyp}
                claims={claims}
                onAppendNarrative={(md) => {
                  const nextThesis = `${thesis.trimEnd()}\n\n${md}\n`
                  setThesis(nextThesis)
                  const next = updateResearchHypothesis(hyp, { thesis: nextThesis })
                  persist(next, 'Appended pack contrast to thesis')
                }}
                onRivalCreated={(id) => {
                  flash(`Rival hypothesis saved (${id.slice(0, 12)}…) — open from project list`)
                }}
              />
            )}

            {/* RH AI */}
            <RhAiPanel
              hyp={hyp}
              claims={claims}
              candidates={linkedCandidates}
              disease={project?.disease ?? null}
              targetIds={project?.targetIds ?? hyp.targetIds}
              onInsight={(mode, insight) => setLastInsight({ mode, insight })}
            />

            {lastInsight && (
              <div className="flex flex-wrap gap-2" data-testid="rh-ai-apply-bar">
                <button
                  type="button"
                  onClick={() => applyInsight('thesis')}
                  className="rounded border border-indigo-800/50 bg-indigo-950/40 px-2 py-1 text-[10px] text-indigo-200"
                >
                  Apply thesis / sections
                </button>
                <button
                  type="button"
                  onClick={() => applyInsight('experiments')}
                  className="rounded border border-cyan-800/50 bg-cyan-950/40 px-2 py-1 text-[10px] text-cyan-200"
                >
                  Apply experiments
                </button>
                <button
                  type="button"
                  onClick={() => applyInsight('rivals')}
                  className="rounded border border-amber-800/50 bg-amber-950/40 px-2 py-1 text-[10px] text-amber-200"
                >
                  Save rival set
                </button>
                <button
                  type="button"
                  onClick={() => applyInsight('lab')}
                  className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300"
                >
                  Download AI lab brief
                </button>
              </div>
            )}

        {/* —— Dense list sections (full width) —— */}
        <div className="mt-4 space-y-3">
          {/* Board coupling list */}
          <section
            className="overflow-hidden rounded-lg border border-slate-800"
            data-testid="rh-board-sidebar"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/70 px-2 py-1.5">
              <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Board coupling · {project?.name ?? 'Project'}
                {project?.disease?.name ? ` · ${project.disease.name}` : ''}
              </h2>
              {project?.targetIds?.length ? (
                <div className="flex flex-wrap gap-1">
                  {project.targetIds.map((t) => (
                    <Link
                      key={t}
                      href={`/gene/${encodeURIComponent(t)}`}
                      className="rounded border border-slate-700 px-1.5 py-0.5 text-[9px] text-cyan-300"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            {linkedCandidates.length === 0 ? (
              <p className="px-2 py-2 text-[11px] text-slate-600">No candidates linked.</p>
            ) : (
              <ul className="divide-y divide-slate-800/80" data-testid="rh-board-list">
                {linkedCandidates.map((c) => {
                  const cid = c.identity.pubchemCid
                  const row = signalRows?.find((r) => r.candidateId === c.candidateId)
                  return (
                    <li
                      key={c.candidateId}
                      className="grid grid-cols-1 gap-1 px-2 py-1.5 sm:grid-cols-[minmax(0,12rem)_minmax(0,7rem)_minmax(0,1fr)_auto] sm:items-center sm:gap-2 text-[11px]"
                    >
                      <span className="font-medium text-slate-200 truncate">{c.identity.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {c.boardStatus ?? 'untriaged'}
                        {cid != null ? ` · ${cid}` : ''}
                      </span>
                      <span className="min-w-0">
                        {c.scores ? (
                          <ScoreAxisBars
                            scores={c.scores}
                            rubric={project?.rubric}
                            compact
                            showExplainer={false}
                          />
                        ) : (
                          <span className="text-[10px] text-slate-600">
                            {row && row.signals.length > 0
                              ? `${row.signals.length} signal(s)`
                              : '—'}
                          </span>
                        )}
                      </span>
                      {cid != null ? (
                        <Link
                          href={`/molecule/${cid}?project=${hyp.projectId}`}
                          className="text-[10px] text-indigo-400 hover:underline justify-self-end"
                        >
                          Profile
                        </Link>
                      ) : (
                        <span />
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Claims list */}
          <section className="overflow-hidden rounded-lg border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/70 px-2 py-1.5">
              <h2 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Linked evidence claims
                {claims.length > 0 ? ` · ${claims.length}` : hyp.claimIds.length ? ` · ${hyp.claimIds.length} ids` : ''}
              </h2>
              <div className="flex items-center gap-2">
                {rehydrateSource && claims.length > 0 && (
                  <span className="text-[9px] text-slate-600">
                    {rehydrateSource === 'idb' ? 'IDB pack cache' : 'Core panels'}
                  </span>
                )}
                {hyp.claimIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void runRehydrate(hyp)}
                    disabled={rehydrateBusy}
                    className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-50"
                  >
                    {rehydrateBusy ? 'Rebuilding…' : 'Rebuild'}
                  </button>
                )}
              </div>
            </div>
            {rehydrateError && (
              <p className="border-b border-slate-800 px-2 py-1 text-[11px] text-amber-400/90">
                {rehydrateError}
              </p>
            )}
            {hyp.claimIds.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-600">
                No claim ids — seed from a pack export on the project board.
              </p>
            ) : rehydrateBusy && claims.length === 0 ? (
              <p className="animate-pulse px-2 py-2 text-xs text-slate-500">Loading claims…</p>
            ) : claims.length > 0 ? (
              <ul className="max-h-80 divide-y divide-slate-800/80 overflow-y-auto" data-testid="rehydrated-claims">
                {claims.map((c) => {
                  const prov = claimProvenanceDeepLink(c.provenance, {
                    name: linkedCandidates[0]?.identity.name,
                    cid: linkedCandidates[0]?.identity.pubchemCid,
                    chemblId: linkedCandidates[0]?.identity.chemblId,
                    diseaseName: project?.disease?.name,
                  })
                  const href =
                    prov.href && /^https?:\/\//i.test(prov.href) ? prov.href : null
                  return (
                    <li
                      key={c.id}
                      className="grid grid-cols-1 gap-0.5 px-2 py-1.5 text-[11px] sm:grid-cols-[minmax(0,5.5rem)_minmax(0,1fr)_minmax(0,7rem)_auto] sm:items-start sm:gap-2"
                    >
                      <span className="rounded border border-emerald-900/40 bg-emerald-950/20 px-1 py-0.5 text-[9px] uppercase text-emerald-300/90 w-fit">
                        {c.claimType}
                      </span>
                      <p className="leading-snug text-slate-200">{c.statement}</p>
                      <span className="font-mono text-[9px] text-slate-600 truncate" title={c.id}>
                        {c.id}
                      </span>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-indigo-400 hover:underline justify-self-end"
                        >
                          {c.provenance?.source ?? 'source'}
                        </a>
                      ) : (
                        <span className="text-[9px] text-slate-600 justify-self-end">
                          {c.provenance?.source ?? '—'}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <ul className="max-h-32 divide-y divide-slate-800/80 overflow-y-auto font-mono text-[10px] text-slate-600">
                {hyp.claimIds.map((id) => (
                  <li key={id} className="px-2 py-1">
                    {id}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Experiments list */}
          <section className="overflow-hidden rounded-lg border border-slate-800">
            <div className="border-b border-slate-800 bg-slate-900/70 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Next experiments · Monday plan
              {experiments.length ? ` · ${experiments.length}` : ''}
            </div>
            {experiments.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-600">
                None yet — add below or run RH AI → Experiments.
              </p>
            ) : (
              <ul className="divide-y divide-slate-800/80" data-testid="rh-experiments">
                {experiments.map((e) => (
                  <li
                    key={e.id}
                    className="grid grid-cols-1 gap-0.5 px-2 py-1.5 text-[11px] sm:grid-cols-[minmax(0,5rem)_minmax(0,1fr)_minmax(0,10rem)] sm:gap-2"
                  >
                    <span className="text-[9px] uppercase text-slate-500">
                      {e.priority ?? 'medium'}
                      {e.costTier ? ` · ${e.costTier}` : ''}
                    </span>
                    <div>
                      <p className="text-slate-200">{e.description}</p>
                      {e.rationale && (
                        <p className="mt-0.5 text-[10px] text-slate-500">{e.rationale}</p>
                      )}
                      {(e.successCriteria || e.failCriteria) && (
                        <p className="mt-0.5 text-[9px] text-slate-600">
                          {e.successCriteria && <>OK: {e.successCriteria} </>}
                          {e.failCriteria && <>· Kill: {e.failCriteria}</>}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-[9px] text-slate-600 truncate">
                      {e.experimentType ?? ''}
                      {e.relatedClaimIds?.length
                        ? ` · ${e.relatedClaimIds.slice(0, 2).join(',')}`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 border-t border-slate-800 px-2 py-2">
              <input
                type="text"
                value={expText}
                onChange={(e) => setExpText(e.target.value)}
                placeholder="e.g. Orthogonal binding assay…"
                className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddExperiment}
                disabled={!expText.trim()}
                className="rounded border border-indigo-800/50 bg-indigo-950/40 px-3 py-1.5 text-xs text-indigo-200 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </section>

          {/* Storyboard list */}
          <section className="overflow-hidden rounded-lg border border-slate-800" data-testid="rh-storyboard">
            <div className="border-b border-slate-800 bg-slate-900/70 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Mechanism storyboard · disease → target → candidate → readout
            </div>
            {storyboard.nodes.length === 0 ? (
              <p className="px-2 py-2 text-xs text-slate-600">No storyboard nodes yet.</p>
            ) : (
              <ol className="divide-y divide-slate-800/80">
                {storyboard.nodes.map((n, i) => (
                  <li
                    key={n.id}
                    className="grid grid-cols-[2rem_minmax(0,5rem)_minmax(0,1fr)_4rem] items-center gap-2 px-2 py-1.5 text-[11px]"
                  >
                    <span className="font-mono text-[10px] text-slate-600">{i + 1}</span>
                    <span className="text-[9px] uppercase text-slate-500">{n.kind}</span>
                    <span className="truncate text-slate-200" title={n.label}>
                      {n.label}
                    </span>
                    <span className="text-right text-[9px] text-slate-600">
                      {n.claimIds.length} cl.
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Gap map list */}
          <section className="overflow-hidden rounded-lg border border-slate-800" data-testid="rh-gap-map">
            <div className="border-b border-slate-800 bg-slate-900/70 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Evidence gap map · deterministic
              {gapMap.length ? ` · ${gapMap.length}` : ''}
            </div>
            {gapMap.length === 0 ? (
              <p className="px-2 py-2 text-xs text-emerald-400/80">No major facet gaps detected.</p>
            ) : (
              <ul className="divide-y divide-slate-800/80">
                {gapMap.map((g) => {
                  const link = g.sourceHint
                    ? originSourceDeepLink(g.sourceHint, {
                        name: linkedCandidates[0]?.identity.name,
                        cid: linkedCandidates[0]?.identity.pubchemCid,
                        diseaseName: project?.disease?.name,
                        geneSymbol: project?.targetIds?.[0],
                      })
                    : null
                  const href =
                    link?.href && /^https?:\/\//i.test(link.href) ? link.href : null
                  return (
                    <li
                      key={g.id}
                      className="grid grid-cols-1 gap-0.5 px-2 py-1.5 text-[11px] sm:grid-cols-[minmax(0,6rem)_minmax(0,1fr)_auto] sm:gap-2"
                    >
                      <span
                        className={`text-[9px] uppercase ${
                          g.severity === 'high'
                            ? 'text-rose-400'
                            : g.severity === 'medium'
                              ? 'text-amber-400'
                              : 'text-slate-500'
                        }`}
                      >
                        {g.severity} · {g.facet}
                      </span>
                      <div>
                        <p className="text-slate-300">{g.message}</p>
                        <p className="text-[10px] text-slate-500">{g.suggestedAction}</p>
                      </div>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-indigo-400 hover:underline justify-self-end"
                        >
                          {g.sourceHint}
                        </a>
                      ) : (
                        <span className="text-[9px] text-slate-600 justify-self-end">
                          {g.sourceHint ?? '—'}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <p className="pb-4 text-[10px] leading-relaxed text-slate-600">
            Investigation priority only. AI is claim-bound to rehydrated evidence — never free-form
            Discover ranking. Free public sources only.
          </p>
        </div>
      </div>
    </main>
  )
}
