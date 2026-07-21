'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { BoardStatus, Project } from '@/lib/domain'
import { downloadFile } from '@/lib/exportData'
import {
  addCandidateAndSave,
  buildBoardPackClaims,
  candidateNeedsHarvest,
  exportProjectToJson,
  getProject,
  harvestCandidatesForBoard,
  harvestTimingIsBoardPromote,
  deleteEmptyClaimResearchHypotheses,
  deleteResearchHypothesis,
  generateAndSavePromotedResearchHypothesis,
  listResearchHypothesesForProject,
  projectExportFilename,
  removeCandidateFromProject,
  renameProjectAndSave,
  RH_STATUS_LABELS,
  RH_STATUS_STYLES,
  saveProject,
  saveResearchHypothesis,
  seedResearchHypothesisFromPack,
  seedRhFromPaste,
  setBoardStatusAndSave,
} from '@/lib/project'
import { useAI } from '@/lib/ai/useAI'
import { emitProductEvent } from '@/lib/productEvents'
import type { CorePanelEvidenceInput, EvidenceClaim } from '@/lib/evidence'
import {
  loadProjectSignals,
  mergeStickySignalRows,
  projectSignalsMembershipKey,
  type CandidateSignalRow,
} from '@/lib/signals'
import { BoardTable } from '@/components/projects/BoardTable'
import { BoardClaimStrip } from '@/components/projects/BoardClaimStrip'
import { BoardAiRecommend } from '@/components/projects/BoardAiRecommend'
import { PackBuilder } from '@/components/evidence/PackBuilder'
import { MultiPackContrastPicker } from '@/components/evidence/MultiPackContrastPicker'
import type { MoleculeCandidate, ResearchHypothesis } from '@/lib/domain'

const BOARD_STATUSES: BoardStatus[] = ['untriaged', 'promote', 'hold', 'kill', 'watching']

const STATUS_STYLES: Record<BoardStatus, string> = {
  untriaged: 'bg-slate-800 text-slate-300 border-slate-600',
  promote: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  hold: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  kill: 'bg-red-900/40 text-red-300 border-red-700/50',
  watching: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/50',
}

export default function ProjectBoardPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const ai = useAI()
  const [project, setProject] = useState<Project | null | undefined>(undefined)
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [signalRows, setSignalRows] = useState<CandidateSignalRow[] | null>(null)
  const [signalsLoading, setSignalsLoading] = useState(false)
  const [expandBusy, setExpandBusy] = useState<string | null>(null)
  const [hypotheses, setHypotheses] = useState<ResearchHypothesis[]>([])
  const [pasteThesis, setPasteThesis] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [promotedRhBusy, setPromotedRhBusy] = useState(false)
  const [harvestingIds, setHarvestingIds] = useState<string[]>([])
  const [harvestBusy, setHarvestBusy] = useState(false)
  const [boardPanels, setBoardPanels] = useState<CorePanelEvidenceInput>({})
  const [boardClaims, setBoardClaims] = useState<EvidenceClaim[]>([])
  const [boardLandscapeClaims, setBoardLandscapeClaims] = useState<EvidenceClaim[]>([])
  const [packWarnings, setPackWarnings] = useState<string[]>([])
  const [panelsLoading, setPanelsLoading] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const signalsLoadedFor = useRef<string | null>(null)
  const harvestGen = useRef(0)
  const harvestAbort = useRef<AbortController | null>(null)
  const packFetchKey = useRef<string | null>(null)

  const refresh = useCallback(() => {
    if (!id) {
      setProject(null)
      setHypotheses([])
      return
    }
    setProject(getProject(id))
    setHypotheses(listResearchHypothesesForProject(id))
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (id) emitProductEvent('project_opened', { projectId: id })
  }, [id])

  // Claim-rich packs: parallel Core panel fetch + per-CID extract (V2 density)
  useEffect(() => {
    if (!project || project.candidates.length === 0) {
      setBoardPanels({})
      setBoardClaims([])
      setBoardLandscapeClaims([])
      setPackWarnings([])
      return
    }
    const key = `${project.id}:${project.candidates
      .map((c) => `${c.candidateId}:${c.boardStatus}`)
      .join('|')}`
    if (packFetchKey.current === key) return
    packFetchKey.current = key
    let cancelled = false
    setPanelsLoading(true)
    buildBoardPackClaims(project, { maxCandidates: 5, includeLandscape: true })
      .then((res) => {
        if (cancelled) return
        setBoardPanels(res.panels)
        setBoardClaims(res.claims)
        setBoardLandscapeClaims(res.landscapeClaims)
        setPackWarnings(res.warnings)
      })
      .catch(() => {
        if (!cancelled) {
          setBoardPanels({})
          setBoardClaims([])
          setBoardLandscapeClaims([])
          setPackWarnings(['Failed to fetch Core panels for board pack'])
        }
      })
      .finally(() => {
        if (!cancelled) setPanelsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [project])

  // Project-aware count diffs with panel deep-link badges (PR14).
  // Re-fetch only when candidate membership / CID changes — not on triage or updatedAt.
  // Sticky merge keeps chips visible for candidates still on the board after status changes.
  useEffect(() => {
    if (!project) {
      setSignalRows(null)
      signalsLoadedFor.current = null
      return
    }
    const key = projectSignalsMembershipKey(project)
    if (signalsLoadedFor.current === key) return

    let cancelled = false
    setSignalsLoading(true)
    // Do not refresh baseline mid-session — that wiped chips on triage re-loads.
    loadProjectSignals(project, { concurrency: 3, refreshBaseline: false })
      .then((rows) => {
        if (cancelled) return
        signalsLoadedFor.current = key
        const present = new Set(project.candidates.map((c) => c.candidateId))
        setSignalRows((prev) => mergeStickySignalRows(prev, rows, present))
      })
      .catch(() => {
        // Keep prior chips on transient failure
        if (!cancelled) {
          /* leave signalRows as-is */
        }
      })
      .finally(() => {
        if (!cancelled) setSignalsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [project])

  const handleRefreshSignals = useCallback(() => {
    if (!project) return
    signalsLoadedFor.current = null
    setSignalsLoading(true)
    void loadProjectSignals(project, { concurrency: 3, refreshBaseline: false })
      .then((rows) => {
        const present = new Set(project.candidates.map((c) => c.candidateId))
        // Force re-key so effect does not no-op; apply fresh rows (still sticky-merge)
        signalsLoadedFor.current = projectSignalsMembershipKey(project)
        setSignalRows((prev) => mergeStickySignalRows(prev, rows, present))
      })
      .catch(() => {
        /* keep sticky */
      })
      .finally(() => setSignalsLoading(false))
  }, [project])

  const showBanner = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text })
    window.setTimeout(() => setBanner(null), 4000)
  }

  const runHarvest = useCallback(
    async (proj: Project, candidateIds: string[]) => {
      if (candidateIds.length === 0) return
      harvestAbort.current?.abort()
      const ac = new AbortController()
      harvestAbort.current = ac
      const gen = ++harvestGen.current
      setHarvestingIds(candidateIds)
      setHarvestBusy(true)
      try {
        const res = await harvestCandidatesForBoard(proj, candidateIds, {
          signal: ac.signal,
          generation: gen,
        })
        if (gen !== harvestGen.current) return // stale
        if (!res.ok) {
          showBanner('err', res.warnings[0] ?? 'Harvest failed')
          return
        }
        const saved = saveProject(res.project)
        if (!saved.ok) {
          showBanner('err', saved.message)
          return
        }
        setProject(saved.value)
        emitProductEvent('harvest_safety_done', {
          count: candidateIds.length,
          projectId: proj.id,
        })
        emitProductEvent('discover_stage', {
          stage: 'safetyHarvest',
          source: 'board_harvest',
          count: candidateIds.length,
        })
        showBanner(
          'ok',
          res.warnings.length
            ? `Safety scores updated (${res.warnings.length} note${res.warnings.length === 1 ? '' : 's'})`
            : 'Safety & novelty scores loaded',
        )
      } finally {
        if (gen === harvestGen.current) {
          setHarvestingIds([])
          setHarvestBusy(false)
        }
      }
    },
    [],
  )

  const handleStatus = (candidateId: string, status: BoardStatus) => {
    if (!id) return
    const result = setBoardStatusAndSave(id, candidateId, status)
    if (!result.ok) {
      showBanner('err', result.message)
      return
    }
    setProject(result.value)
    emitProductEvent('board_status_changed', { candidateId, status, projectId: id })

    // Promote-only auto-harvest (KD-V2-4); watching does not harvest
    if (
      status === 'promote' &&
      harvestTimingIsBoardPromote(result.value)
    ) {
      const c = result.value.candidates.find((x) => x.candidateId === candidateId)
      if (c && candidateNeedsHarvest(c)) {
        void runHarvest(result.value, [candidateId])
      }
    } else if (status !== 'promote') {
      // Leave promote mid-flight → invalidate late merge
      harvestGen.current += 1
      harvestAbort.current?.abort()
    }
  }

  const handleLoadSafety = () => {
    if (!project) return
    const ids = project.candidates
      .filter((c) => (c.boardStatus === 'promote' || c.boardStatus === 'watching') && candidateNeedsHarvest(c))
      .map((c) => c.candidateId)
      .slice(0, 15)
    if (ids.length === 0) {
      showBanner('ok', 'No promoted/watching candidates need safety scores')
      return
    }
    void runHarvest(project, ids)
  }

  const handleRemove = (candidateId: string) => {
    if (!project) return
    const next = removeCandidateFromProject(project, candidateId)
    if (!next.ok) {
      showBanner('err', next.message)
      return
    }
    const saved = saveProject(next.value)
    if (!saved.ok) {
      showBanner('err', saved.message)
      return
    }
    setProject(saved.value)
  }

  const handleExport = () => {
    if (!project) return
    downloadFile(
      exportProjectToJson(project),
      projectExportFilename(project),
      'application/json',
    )
    showBanner('ok', 'Project exported')
  }

  const handleExpandSimilar = async (c: MoleculeCandidate) => {
    const cid = c.identity.pubchemCid
    if (!id || cid == null) {
      showBanner('err', 'Need a PubChem CID to expand similarity')
      return
    }
    setExpandBusy(c.candidateId)
    try {
      const res = await fetch('/api/discover/similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedCid: cid, max: 5 }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Expand failed (${res.status})`)
      }
      const data = (await res.json()) as { neighbors: MoleculeCandidate[] }
      let added = 0
      let latest = project
      for (const n of data.neighbors ?? []) {
        const r = addCandidateAndSave(id, n)
        if (r.ok) {
          added++
          latest = r.value
        }
      }
      if (latest) setProject(latest)
      emitProductEvent('similarity_expand', { seedCid: cid, count: added })
      showBanner(
        'ok',
        added > 0
          ? `Added ${added} similar neighbor${added === 1 ? '' : 's'} from PubChem`
          : 'No new similar candidates (or board full)',
      )
    } catch (err) {
      showBanner('err', err instanceof Error ? err.message : 'Similarity expand failed')
    } finally {
      setExpandBusy(null)
    }
  }

  if (project === undefined) {
    return (
      <main className="min-h-screen bg-[#0f1117] px-4 py-12 text-center text-slate-500">
        Loading…
      </main>
    )
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-[#0f1117] px-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-200 mb-2">Project not found</h1>
        <p className="text-sm text-slate-500 mb-4">
          It may have been deleted or never stored in this browser.
        </p>
        <Link href="/projects" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Back to projects
        </Link>
      </main>
    )
  }

  const statusCounts = BOARD_STATUSES.reduce(
    (acc, s) => {
      acc[s] = project.candidates.filter((c) => (c.boardStatus ?? 'untriaged') === s).length
      return acc
    },
    {} as Record<BoardStatus, number>,
  )

  const totalSignals = (signalRows ?? []).reduce((n, r) => n + r.signals.length, 0)

  return (
    <main className="min-h-screen bg-[#0f1117] text-slate-200">
      <div className="page-canvas">
        <div className="mb-2">
          <Link href="/projects" className="text-xs text-slate-500 hover:text-slate-300">
            ← All projects
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {renaming ? (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const res = renameProjectAndSave(project.id, nameDraft)
                  if (!res.ok) {
                    setBanner({ type: 'err', text: res.message || 'Could not rename project' })
                    return
                  }
                  setProject(res.value)
                  setRenaming(false)
                  setBanner({ type: 'ok', text: 'Project renamed' })
                }}
              >
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={200}
                  autoFocus
                  className="min-w-[12rem] flex-1 rounded-lg border border-indigo-700/50 bg-slate-900 px-3 py-1.5 text-xl font-bold text-slate-100 focus:border-indigo-500 focus:outline-none sm:text-2xl"
                  data-testid="project-rename-input"
                  aria-label="Project name"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                  data-testid="project-rename-save"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenaming(false)
                    setNameDraft(project.name)
                  }}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">{project.name}</h1>
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(project.name)
                    setRenaming(true)
                  }}
                  className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:border-slate-500 hover:text-slate-200"
                  data-testid="project-rename-btn"
                  title="Rename project"
                >
                  Rename
                </button>
              </div>
            )}
            {project.description && (
              <p className="mt-1 text-sm text-slate-400">{project.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {project.disease?.name && (
                <Link
                  href={`/discover?q=${encodeURIComponent(project.disease.name)}${
                    project.disease.id
                      ? `&diseaseId=${encodeURIComponent(project.disease.id)}`
                      : ''
                  }${
                    project.targetIds?.length
                      ? `&targets=${encodeURIComponent(project.targetIds.join(','))}`
                      : ''
                  }`}
                  className="rounded-full border border-indigo-800/40 bg-indigo-900/20 px-2 py-0.5 text-indigo-300 hover:border-indigo-600"
                >
                  {project.disease.name}
                </Link>
              )}
              {(project.targetIds ?? []).slice(0, 8).map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-emerald-800/40 bg-emerald-900/20 px-2 py-0.5 font-mono text-emerald-300"
                >
                  {t}
                </span>
              ))}
              {project.rubric?.preset && (
                <span className="rounded-full border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-slate-400">
                  rubric: {project.rubric.preset}
                </span>
              )}
              <span>
                {project.candidates.length}/50 candidates
              </span>
              <span>
                Updated {new Date(project.updatedAt).toLocaleString()}
              </span>
              {signalsLoading && (
                <span className="text-cyan-500/80 animate-pulse">Checking signals…</span>
              )}
              {totalSignals > 0 && (
                <span className="rounded-full border border-amber-700/40 bg-amber-900/20 px-2 py-0.5 text-amber-300">
                  {totalSignals} signal{totalSignals === 1 ? '' : 's'}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRefreshSignals()}
                disabled={signalsLoading || project.candidates.length === 0}
                className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:border-cyan-700/50 hover:text-cyan-300 disabled:opacity-40"
                title="Re-check free-API count diffs for board candidates"
                data-testid="board-refresh-signals"
              >
                {signalsLoading ? 'Signals…' : 'Refresh signals'}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BOARD_STATUSES.map((s) => (
                <span
                  key={s}
                  className={`rounded border px-1.5 py-0.5 text-[10px] ${STATUS_STYLES[s]}`}
                >
                  {s}: {statusCounts[s]}
                </span>
              ))}
            </div>
            {totalSignals > 0 && (
              <p className="mt-2 text-[11px] text-slate-500">
                Signal badges stay while the candidate remains on this board (triage does not clear
                them). They deep-link to the changed panel on the molecule profile.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleLoadSafety}
              disabled={harvestBusy}
              className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-900/40 disabled:opacity-50"
              title="Load safety & novelty for promote/watching candidates missing axes"
            >
              {harvestBusy ? 'Loading safety…' : 'Load safety scores'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600"
            >
              Export JSON
            </button>
            <Link
              href="/discover"
              className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-900/40"
            >
              Add from Discover
            </Link>
          </div>
        </div>

        {banner && (
          <div
            className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
              banner.type === 'ok'
                ? 'border-emerald-800/50 bg-emerald-900/20 text-emerald-200'
                : 'border-red-800/50 bg-red-900/20 text-red-200'
            }`}
            role="status"
          >
            {banner.text}
          </div>
        )}

        {project.candidates.length > 0 && (
          <>
            <BoardClaimStrip project={project} />
            <BoardAiRecommend
              project={project}
              onApplyStatus={(candidateId, status) => {
                const res = setBoardStatusAndSave(project.id, candidateId, status)
                if (!res.ok) {
                  showBanner('err', res.message)
                  return
                }
                emitProductEvent('board_status_changed', {
                  projectId: project.id,
                  status,
                  source: 'ai_suggest_apply',
                })
                refresh()
                showBanner('ok', `Set ${status} (you confirmed AI suggestion)`)
              }}
            />
          </>
        )}

        {project.candidates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-300 mb-2">Board is empty</h2>
            <p className="text-sm text-slate-500 mb-4">
              Save candidates from Discover with “Save to project”.
            </p>
            <Link
              href="/discover"
              className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-600"
            >
              Go to Discover
            </Link>
          </div>
        ) : (
          <BoardTable
            project={project}
            onStatusChange={handleStatus}
            onRemove={handleRemove}
            signalRows={signalRows}
            signalsLoading={signalsLoading}
            harvestingIds={harvestingIds}
            onExpandSimilar={(c) => void handleExpandSimilar(c)}
            expandBusyId={expandBusy}
          />
        )}

        {/* Evidence packs — download-primary; board carries packIndex breadcrumbs only */}
        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-slate-100">Evidence packs</h2>
          {project.packIndex && project.packIndex.length > 0 && (
            <ul className="space-y-2">
              {project.packIndex.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium text-slate-200">{entry.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {entry.candidateCount ?? 0} candidates ·{' '}
                      {new Date(entry.createdAt).toLocaleString()} ·{' '}
                      <span className="font-mono">{entry.id}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid={`seed-rh-${entry.id}`}
                    className="rounded border border-indigo-800/40 px-2 py-1 text-[10px] text-indigo-300 hover:bg-indigo-900/30"
                    onClick={() => {
                      const hyp = seedResearchHypothesisFromPack({
                        projectId: project.id,
                        packId: entry.id,
                        packTitle: entry.title,
                        claimIds: entry.claimIds ?? [],
                        candidateIds: project.candidates.map((c) => c.candidateId),
                        diseaseId: project.disease?.id,
                        targetIds: project.targetIds,
                      })
                      const saved = saveResearchHypothesis(hyp)
                      if (!saved.ok) {
                        showBanner('err', saved.message)
                        return
                      }
                      refresh()
                      showBanner(
                        'ok',
                        `Seeded research hypothesis “${hyp.title}”` +
                          (entry.claimIds?.length
                            ? ` (${entry.claimIds.length} claims)`
                            : ' (no claim ids on index — re-export pack)'),
                      )
                    }}
                  >
                    Seed research hypothesis
                  </button>
                </li>
              ))}
            </ul>
          )}
          <PackBuilder
            panels={boardPanels}
            claims={boardClaims}
            landscapeClaims={boardLandscapeClaims}
            panelsLoading={panelsLoading}
            densityWarnings={packWarnings}
            candidates={project.candidates}
            disease={project.disease ?? null}
            projectId={project.id}
            defaultTitle={`${project.name} evidence pack`}
            preferencesSnapshot={
              project.preferencesSnapshot?.rubricPreset
                ? {
                    rubricPreset: project.preferencesSnapshot.rubricPreset as
                      | 'balanced'
                      | 'repurposing'
                      | 'novel-bioactive'
                      | 'safety-first',
                    aeAggressiveness:
                      project.preferencesSnapshot.aeAggressiveness ?? 'soft-flag',
                    harvestTiming:
                      project.preferencesSnapshot.harvestTiming ?? 'board-promote',
                  }
                : undefined
            }
            onExported={() => refresh()}
          />
          <p className="text-[11px] text-slate-600">
            Board packs auto-fetch Core + landscape categories (mechanisms, trials, AE, Open Targets,
            pharma/biologics, grants/orgs) for promoted CIDs with parallel budgets. Pre-extracted
            multi-subject claims (≤200) preserve per-candidate attribution. Toggle Landscape pack
            mode for org · sponsor · biosimilar · jurisdiction claims. Enable “Share links when
            available” in Discover preferences for Share pack.
          </p>
          {(project.packIndex?.length ?? 0) >= 2 && (
            <MultiPackContrastPicker
              project={project}
              onRivalCreated={(id) => {
                refresh()
                showBanner('ok', `Contrast rival hypothesis created — open from list below (${id.slice(0, 10)}…)`)
              }}
            />
          )}
        </section>

        {/* Research hypotheses — narrative theses, distinct from set-ops /hypothesis */}
        <section className="mt-8 space-y-3" data-testid="research-hypotheses-section">
          <h2 className="text-lg font-semibold text-slate-100">Research hypotheses</h2>
          <p className="text-[11px] text-slate-500">
            Project-scoped narrative theses (not set-ops filter intersections). Claim-bound AI on
            the editor: thesis studio, rivals, Monday experiments, gap map, adversarial review,
            exports.
          </p>

          {/* Start RH — pack seed (best) or AI from promoted board claims */}
          <div
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-3"
            data-testid="rh-path-chooser"
          >
            <p className="text-[11px] font-medium text-slate-300">Start a hypothesis</p>
            <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
              Prefer <strong className="font-medium text-slate-400">Seed research hypothesis</strong> on
              a downloaded pack above. Or generate a claim-bound thesis from{' '}
              <strong className="font-medium text-slate-400">promoted</strong> board candidates using
              RH AI (Ollama Cloud) grounded in Core-panel claims — not boilerplate templates.
            </p>
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
                      showBanner('err', 'Promote at least one board candidate first.')
                      return
                    }
                    if (!ai.hasUserApiKey || !ai.model) {
                      showBanner(
                        'err',
                        'Connect Ollama Cloud (top-bar AI) and pick a model. Promoted RH seed is claim-bound live AI — not a static template.',
                      )
                      return
                    }
                    if (boardClaims.length < 3 && !panelsLoading) {
                      showBanner(
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
                        showBanner('err', res.error ?? 'Promoted RH AI failed')
                        return
                      }
                      refresh()
                      showBanner(
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
                <strong className="font-medium text-slate-400">Seed research hypothesis</strong> on a
                pack entry above for the strongest claim binding.
              </p>
            ) : (
              <p className="mt-2 text-[10px] text-amber-500/80">
                No pack index yet — download an evidence pack (or wait for board claims) so AI can
                cite real evidence.
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
                      showBanner('err', saved.message)
                      return
                    }
                    setPasteThesis('')
                    setShowPaste(false)
                    refresh()
                    showBanner('ok', 'Saved your draft thesis')
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
                    showBanner('err', res.message)
                    return
                  }
                  refresh()
                  showBanner('ok', `Removed ${res.value.removed} empty draft(s)`)
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
                              showBanner('err', res.message)
                              return
                            }
                            refresh()
                            showBanner('ok', 'Research hypothesis deleted')
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs text-slate-400">{h.thesis}</p>
                    <div className="mt-1 text-[10px] text-slate-600">
                      {h.claimIds.length} claims · {h.candidateIds.length} candidates · v{h.version} ·
                      updated {new Date(h.updatedAt).toLocaleString()}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
