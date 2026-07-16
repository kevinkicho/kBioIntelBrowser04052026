'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { BoardStatus, Project } from '@/lib/domain'
import { downloadFile } from '@/lib/exportData'
import {
  addCandidateAndSave,
  exportProjectToJson,
  getProject,
  listResearchHypothesesForProject,
  projectExportFilename,
  removeCandidateFromProject,
  saveProject,
  saveResearchHypothesis,
  seedResearchHypothesisFromPack,
  setBoardStatusAndSave,
} from '@/lib/project'
import { loadProjectSignals, type CandidateSignalRow } from '@/lib/signals'
import { SignalBadges } from '@/components/projects/SignalBadges'
import { PackBuilder } from '@/components/evidence/PackBuilder'
import { emitProductEvent } from '@/lib/productEvents'
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
  const signalsLoadedFor = useRef<string | null>(null)

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

  // Project-aware count diffs with panel deep-link badges (PR14)
  useEffect(() => {
    if (!project) {
      setSignalRows(null)
      return
    }
    const key = `${project.id}:${project.updatedAt}:${project.candidates.map((c) => c.candidateId).join(',')}`
    if (signalsLoadedFor.current === key) return

    let cancelled = false
    setSignalsLoading(true)
    loadProjectSignals(project, { concurrency: 3 })
      .then((rows) => {
        if (cancelled) return
        signalsLoadedFor.current = key
        setSignalRows(rows)
      })
      .catch(() => {
        if (!cancelled) setSignalRows([])
      })
      .finally(() => {
        if (!cancelled) setSignalsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [project])

  const showBanner = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text })
    window.setTimeout(() => setBanner(null), 4000)
  }

  const handleStatus = (candidateId: string, status: BoardStatus) => {
    if (!id) return
    const result = setBoardStatusAndSave(id, candidateId, status)
    if (!result.ok) {
      showBanner('err', result.message)
      return
    }
    setProject(result.value)
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

  const signalByCandidate = new Map(
    (signalRows ?? []).map((r) => [r.candidateId, r] as const),
  )
  const totalSignals = (signalRows ?? []).reduce((n, r) => n + r.signals.length, 0)

  return (
    <main className="min-h-screen bg-[#0f1117] text-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-2">
          <Link href="/projects" className="text-xs text-slate-500 hover:text-slate-300">
            ← All projects
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-sm text-slate-400">{project.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {project.disease?.name && (
                <span className="rounded-full border border-indigo-800/40 bg-indigo-900/20 px-2 py-0.5 text-indigo-300">
                  {project.disease.name}
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
              {!signalsLoading && totalSignals > 0 && (
                <span className="rounded-full border border-amber-700/40 bg-amber-900/20 px-2 py-0.5 text-amber-300">
                  {totalSignals} signal{totalSignals === 1 ? '' : 's'}
                </span>
              )}
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
            {!signalsLoading && totalSignals > 0 && (
              <p className="mt-2 text-[11px] text-slate-500">
                Signal badges deep-link to the changed data panel on the molecule profile — not badge-only.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
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
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/60">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Candidate
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Identity
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Score
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Signals
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Origins
                  </th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {project.candidates.map((c, i) => {
                  const cid = c.identity.pubchemCid
                  const status = c.boardStatus ?? 'untriaged'
                  const score = c.scores?.composite
                  const sigRow = signalByCandidate.get(c.candidateId)
                  return (
                    <tr
                      key={c.candidateId}
                      className={`border-b border-slate-800 ${i % 2 === 0 ? 'bg-slate-900/30' : ''}`}
                    >
                      <td className="px-3 py-3">
                        {cid != null ? (
                          <Link
                            href={`/molecule/${cid}?project=${project.id}`}
                            className="font-medium text-slate-100 hover:text-emerald-300"
                          >
                            {c.identity.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-100">{c.identity.name}</span>
                        )}
                        <div className="text-[10px] text-slate-600 font-mono">{c.candidateId}</div>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-400">
                        {cid != null && <div>CID {cid}</div>}
                        {c.identity.chemblId && <div>{c.identity.chemblId}</div>}
                        <div className="text-[10px] text-slate-600">
                          trust: {c.identity.identityTrust}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums text-slate-300">
                        {score != null ? score.toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={status}
                          onChange={(e) =>
                            handleStatus(c.candidateId, e.target.value as BoardStatus)
                          }
                          className={`rounded border px-2 py-1 text-xs capitalize ${STATUS_STYLES[status]}`}
                          aria-label={`Board status for ${c.identity.name}`}
                        >
                          {BOARD_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 min-w-[8rem]">
                        {signalsLoading && !sigRow ? (
                          <span className="text-[10px] text-slate-600 animate-pulse">…</span>
                        ) : sigRow && sigRow.signals.length > 0 ? (
                          <SignalBadges signals={sigRow.signals} compact />
                        ) : sigRow?.status === 'baseline' ? (
                          <span className="text-[10px] text-slate-600" title="Baseline snapshot saved">
                            —
                          </span>
                        ) : sigRow?.status === 'no_cid' ? (
                          <span className="text-[10px] text-slate-600" title="No PubChem CID">
                            n/a
                          </span>
                        ) : sigRow?.status === 'error' ? (
                          <span className="text-[10px] text-red-500/70" title={sigRow.error}>
                            err
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(c.evidenceBreadthSources.length
                            ? c.evidenceBreadthSources
                            : c.origins
                          )
                            .slice(0, 4)
                            .map((s) => (
                              <span
                                key={s}
                                className="rounded border border-slate-700 bg-slate-800/50 px-1.5 py-0.5 text-[9px] text-slate-400"
                              >
                                {s}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {(status === 'promote' || status === 'watching') &&
                            c.identity.pubchemCid != null && (
                              <button
                                type="button"
                                onClick={() => void handleExpandSimilar(c)}
                                disabled={expandBusy === c.candidateId}
                                className="rounded border border-violet-800/40 px-1.5 py-0.5 text-[9px] text-violet-300 hover:bg-violet-900/30 disabled:opacity-50"
                                title="Add PubChem 2D-similar neighbors to this board"
                              >
                                {expandBusy === c.candidateId ? '…' : '≈ similar'}
                              </button>
                            )}
                          <button
                            type="button"
                            onClick={() => handleRemove(c.candidateId)}
                            className="p-1 text-slate-600 hover:text-red-400"
                            title="Remove from board"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
                    className="rounded border border-indigo-800/40 px-2 py-1 text-[10px] text-indigo-300 hover:bg-indigo-900/30"
                    onClick={() => {
                      const hyp = seedResearchHypothesisFromPack({
                        projectId: project.id,
                        packId: entry.id,
                        packTitle: entry.title,
                        claimIds: [],
                        candidateIds: project.candidates.map((c) => c.candidateId),
                        diseaseId: project.disease?.id,
                      })
                      const saved = saveResearchHypothesis(hyp)
                      if (!saved.ok) {
                        showBanner('err', saved.message)
                        return
                      }
                      refresh()
                      showBanner('ok', `Seeded research hypothesis “${hyp.title}”`)
                    }}
                  >
                    Seed research hypothesis
                  </button>
                </li>
              ))}
            </ul>
          )}
          <PackBuilder
            candidates={project.candidates}
            disease={project.disease ?? null}
            projectId={project.id}
            defaultTitle={`${project.name} evidence pack`}
            onExported={() => refresh()}
          />
          <p className="text-[11px] text-slate-600">
            For claim-rich packs, open a molecule from the board (with project deep-link) and use{' '}
            <strong className="font-medium text-slate-500">Export → Download evidence pack</strong> —
            Core panel extractors fill claims (≤200). Enable “Share links when available” in Discover
            preferences to use Share pack.
          </p>
        </section>

        {/* Research hypotheses — narrative theses, distinct from set-ops /hypothesis */}
        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-100">Research hypotheses</h2>
          <p className="text-[11px] text-slate-500">
            Project-scoped narrative theses (not set-ops filter intersections). Seed from an evidence
            pack index entry above.
          </p>
          {hypotheses.length === 0 ? (
            <p className="text-sm text-slate-600">No research hypotheses yet.</p>
          ) : (
            <ul className="space-y-2">
              {hypotheses.map((h) => (
                <li
                  key={h.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
                >
                  <div className="text-sm font-medium text-slate-200">{h.title}</div>
                  <p className="mt-1 line-clamp-3 text-xs text-slate-400">{h.thesis}</p>
                  <div className="mt-1 text-[10px] text-slate-600">
                    {h.claimIds.length} claims · {h.candidateIds.length} candidates · updated{' '}
                    {new Date(h.updatedAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
