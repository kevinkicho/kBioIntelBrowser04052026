'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { BoardStatus, Project } from '@/lib/domain'
import { downloadFile } from '@/lib/exportData'
import {
  addCandidateAndSave,
  candidateNeedsHarvest,
  exportProjectToJson,
  getProject,
  harvestCandidatesForBoard,
  harvestTimingIsBoardPromote,
  listResearchHypothesesForProject,
  projectExportFilename,
  removeCandidateFromProject,
  renameProjectAndSave,
  saveProject,
  setBoardStatusAndSave,
} from '@/lib/project'
import { runPackExtractPipeline } from '@/lib/pipeline'
import { emitProductEvent } from '@/lib/productEvents'
import type { CorePanelEvidenceInput, EvidenceClaim } from '@/lib/evidence'
import {
  loadProjectSignals,
  mergeStickySignalRows,
  projectSignalsMembershipKey,
  type CandidateSignalRow,
} from '@/lib/signals'
import { BoardTable } from '@/components/projects/BoardTable'
import { StyledTooltip } from '@/components/ui/StyledTooltip'
import { BoardClaimStrip } from '@/components/projects/BoardClaimStrip'
import { BoardAiRecommend } from '@/components/projects/BoardAiRecommend'
import { BoardEmptyState } from '@/components/projects/BoardEmptyState'
import { BoardPackSection } from '@/components/projects/BoardPackSection'
import { ResearchHypothesisSection } from '@/components/projects/ResearchHypothesisSection'
import { ResearchPlaybookTips } from '@/components/research/ResearchPlaybookTips'
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
  const [project, setProject] = useState<Project | null | undefined>(undefined)
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [signalRows, setSignalRows] = useState<CandidateSignalRow[] | null>(null)
  const [signalsLoading, setSignalsLoading] = useState(false)
  const [expandBusy, setExpandBusy] = useState<string | null>(null)
  const [hypotheses, setHypotheses] = useState<ResearchHypothesis[]>([])
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
    runPackExtractPipeline({
      project,
      maxCandidates: 5,
      includeLandscape: true,
    })
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
      const { runBoardSimilarityExpandPipeline } = await import(
        '@/lib/pipeline/similarityExpandPipeline'
      )
      const { neighbors } = await runBoardSimilarityExpandPipeline({
        seedCid: cid,
        max: 5,
      })
      let added = 0
      let latest = project
      for (const n of neighbors) {
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
                <StyledTooltip content="Rename project">
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(project.name)
                      setRenaming(true)
                    }}
                    className="rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:border-slate-500 hover:text-slate-200"
                    data-testid="project-rename-btn"
                    aria-label="Rename project"
                  >
                    Rename
                  </button>
                </StyledTooltip>
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
              <StyledTooltip content="Re-check free-API count diffs for board candidates">
                <button
                  type="button"
                  onClick={() => handleRefreshSignals()}
                  disabled={signalsLoading || project.candidates.length === 0}
                  className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:border-cyan-700/50 hover:text-cyan-300 disabled:opacity-40"
                  data-testid="board-refresh-signals"
                  aria-label="Re-check free-API count diffs for board candidates"
                >
                  {signalsLoading ? 'Signals…' : 'Refresh signals'}
                </button>
              </StyledTooltip>
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
            <StyledTooltip content="Load safety & novelty for promote/watching candidates missing axes">
              <button
                type="button"
                onClick={handleLoadSafety}
                disabled={harvestBusy}
                className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-900/40 disabled:opacity-50"
                aria-label="Load safety & novelty for promote/watching candidates missing axes"
              >
                {harvestBusy ? 'Loading safety…' : 'Load safety scores'}
              </button>
            </StyledTooltip>
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
          <BoardEmptyState />
        ) : (
          <>
            <div className="mb-3">
              <ResearchPlaybookTips surface="board-ready" compact />
            </div>
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
          </>
        )}

        <BoardPackSection
          project={project}
          boardPanels={boardPanels}
          boardClaims={boardClaims}
          boardLandscapeClaims={boardLandscapeClaims}
          panelsLoading={panelsLoading}
          packWarnings={packWarnings}
          onBanner={showBanner}
          onRefresh={refresh}
        />

        <ResearchHypothesisSection
          project={project}
          hypotheses={hypotheses}
          boardClaims={boardClaims}
          panelsLoading={panelsLoading}
          onBanner={showBanner}
          onRefresh={refresh}
        />
      </div>
    </main>
  )
}
