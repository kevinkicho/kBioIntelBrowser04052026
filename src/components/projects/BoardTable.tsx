'use client'

import Link from 'next/link'
import type { BoardStatus, MoleculeCandidate, Project } from '@/lib/domain'
import { AlternateCids, IdentityTrustBadge } from '@/components/identity'
import { ScoreAxisBars } from '@/app/discover/components/ScoreAxisBars'
import { SignalBadges } from '@/components/projects/SignalBadges'
import type { CandidateSignalRow } from '@/lib/signals'
import { originSourceDeepLink } from '@/lib/originDeepLinks'

const BOARD_STATUSES: BoardStatus[] = ['untriaged', 'promote', 'hold', 'kill', 'watching']

const STATUS_STYLES: Record<BoardStatus, string> = {
  untriaged: 'bg-slate-800 text-slate-300 border-slate-600',
  promote: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50',
  hold: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
  kill: 'bg-red-900/40 text-red-300 border-red-700/50',
  watching: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/50',
}

export interface BoardTableProps {
  project: Project
  onStatusChange: (candidateId: string, status: BoardStatus) => void
  onRemove: (candidateId: string) => void
  /** Signal rows from loadProjectSignals */
  signalRows?: CandidateSignalRow[] | null
  signalsLoading?: boolean
  /** Per-row harvest spinner */
  harvestingIds?: string[]
  onExpandSimilar?: (candidate: MoleculeCandidate) => void
  expandBusyId?: string | null
}

function identityKeysFromCandidate(c: MoleculeCandidate) {
  return {
    inchiKey: c.identity.inchiKey,
    chemblId: c.identity.chemblId,
    cid: c.identity.pubchemCid,
    name: c.identity.name,
    smiles: c.identity.smiles,
    chebiId: c.identity.chebiId,
    drugbankId: c.identity.drugbankId,
    alternateCids: c.identity.alternateCids,
  }
}

/**
 * Project board table with IdentityTrust, multi-axis scores, signals, similar expand.
 * Parity checklist V2-09b.
 */
export function BoardTable({
  project,
  onStatusChange,
  onRemove,
  signalRows = null,
  signalsLoading = false,
  harvestingIds = [],
  onExpandSimilar,
  expandBusyId = null,
}: BoardTableProps) {
  const signalByCandidate = new Map(
    (signalRows ?? []).map((r) => [r.candidateId, r] as const),
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800" data-testid="board-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-900/60">
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              Candidate
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              Identity
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
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
            <th className="w-24 px-3 py-3" />
          </tr>
        </thead>
        <tbody>
          {project.candidates.map((c, i) => {
            const cid = c.identity.pubchemCid
            const status = c.boardStatus ?? 'untriaged'
            const score = c.scores?.composite
            const sigRow = signalByCandidate.get(c.candidateId)
            const harvesting = harvestingIds.includes(c.candidateId)
            return (
              <tr
                key={c.candidateId}
                className={`border-b border-slate-800 ${i % 2 === 0 ? 'bg-slate-900/30' : ''}`}
                data-candidate-id={c.candidateId}
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
                  <div className="mb-1.5">
                    <IdentityTrustBadge
                      level={c.identity.identityTrust}
                      keys={identityKeysFromCandidate(c)}
                    />
                  </div>
                  <AlternateCids
                    primaryCid={cid}
                    alternateCids={c.identity.alternateCids}
                    linkQuery={`project=${project.id}`}
                    compact
                    className="mt-1"
                  />
                </td>
                <td className="px-3 py-3 min-w-[10rem]">
                  {score != null && (
                    <div className="mb-1 text-center tabular-nums text-slate-300">
                      {score.toFixed(2)}
                    </div>
                  )}
                  {c.scores ? (
                    <ScoreAxisBars scores={c.scores} compact showExplainer={false} />
                  ) : (
                    <div className="text-center text-slate-600">—</div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <select
                    value={status}
                    onChange={(e) =>
                      onStatusChange(c.candidateId, e.target.value as BoardStatus)
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
                  {/* Prefer sticky chips even while a background re-check runs */}
                  {sigRow && sigRow.signals.length > 0 ? (
                    <SignalBadges
                      signals={sigRow.signals}
                      compact
                      moleculeName={c.identity.name}
                      cid={sigRow.cid ?? cid}
                      snapshotAge={sigRow.snapshotAge}
                      projectId={project.id}
                    />
                  ) : signalsLoading && !sigRow ? (
                    <span className="text-[10px] text-slate-600 animate-pulse">…</span>
                  ) : sigRow?.status === 'baseline' ? (
                    <span
                      className="text-[10px] text-slate-600"
                      title="Baseline snapshot saved — chips appear when free-API counts change"
                    >
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
                  ) : signalsLoading ? (
                    <span className="text-[10px] text-slate-600 animate-pulse">…</span>
                  ) : (
                    <span className="text-[10px] text-slate-600">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(c.evidenceBreadthSources.length ? c.evidenceBreadthSources : c.origins)
                      .slice(0, 6)
                      .map((s) => {
                        const link = originSourceDeepLink(s, {
                          name: c.identity.name,
                          cid: cid ?? c.identity.pubchemCid,
                          chemblId: c.identity.chemblId,
                          diseaseName: project.disease?.name,
                          geneSymbol: project.targetIds?.[0],
                        })
                        const chipClass =
                          'rounded border border-slate-700 bg-slate-800/50 px-1.5 py-0.5 text-[9px] text-slate-400'
                        if (link.href) {
                          return (
                            <a
                              key={s}
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={link.title}
                              className={`${chipClass} hover:border-indigo-600/50 hover:text-indigo-300 transition-colors`}
                              data-testid="origin-chip-link"
                            >
                              {link.label} ↗
                            </a>
                          )
                        }
                        return (
                          <span
                            key={s}
                            title={link.title}
                            className={chipClass}
                            data-testid="origin-chip"
                          >
                            {link.label}
                          </span>
                        )
                      })}
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {harvesting && (
                      <span
                        className="text-[9px] text-amber-400 animate-pulse"
                        title="Harvesting safety…"
                      >
                        harvest…
                      </span>
                    )}
                    {(status === 'promote' || status === 'watching') &&
                      c.identity.pubchemCid != null &&
                      onExpandSimilar && (
                        <button
                          type="button"
                          onClick={() => onExpandSimilar(c)}
                          disabled={expandBusyId === c.candidateId}
                          className="rounded border border-violet-800/40 px-1.5 py-0.5 text-[9px] text-violet-300 hover:bg-violet-900/30 disabled:opacity-50"
                          title="Add PubChem 2D-similar neighbors"
                        >
                          {expandBusyId === c.candidateId ? '…' : '≈ similar'}
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={() => onRemove(c.candidateId)}
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
  )
}

export { BOARD_STATUSES, STATUS_STYLES }
