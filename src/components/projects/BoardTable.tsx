'use client'

import Link from 'next/link'
import type { BoardStatus, MoleculeCandidate, Project } from '@/lib/domain'
import { AlternateCids, IdentityTrustBadge } from '@/components/identity'

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
 * Project board candidate table with IdentityTrust badges and alternate CIDs.
 */
export function BoardTable({ project, onStatusChange, onRemove }: BoardTableProps) {
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
            <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
              Score
            </th>
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              Status
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
                      compact
                    />
                  </div>
                  {cid != null && <div>CID {cid}</div>}
                  {c.identity.chemblId && <div>{c.identity.chemblId}</div>}
                  {c.identity.inchiKey && (
                    <div
                      className="mt-0.5 max-w-[14rem] truncate font-mono text-[10px] text-slate-600"
                      title={c.identity.inchiKey}
                    >
                      {c.identity.inchiKey}
                    </div>
                  )}
                  <AlternateCids
                    primaryCid={cid}
                    alternateCids={c.identity.alternateCids}
                    linkQuery={`project=${project.id}`}
                    compact
                    className="mt-1"
                  />
                </td>
                <td className="px-3 py-3 text-center tabular-nums text-slate-300">
                  {score != null ? score.toFixed(2) : '—'}
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
                  <button
                    type="button"
                    onClick={() => onRemove(c.candidateId)}
                    className="p-1 text-slate-600 hover:text-red-400"
                    title="Remove from board"
                  >
                    ✕
                  </button>
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
