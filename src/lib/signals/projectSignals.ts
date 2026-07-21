/**
 * Project-scoped signal aggregation for board badges (PR14).
 */

import type { MoleculeCandidate, Project } from '@/lib/domain'
import { saveSnapshot } from '@/lib/changeDetection'
import {
  detectSignalsFromCounts,
  summariseMoleculeSignals,
  type SignalItem,
} from './detect'
import type { DeepLinkOptions } from './deepLink'
import { fetchTrackedCounts } from './fetchCounts'
import { getSnapshot, formatSnapshotAge } from '@/lib/changeDetection'

export type CandidateSignalStatus =
  | 'ready'
  | 'baseline'
  | 'loading'
  | 'error'
  | 'no_cid'

export interface CandidateSignalRow {
  candidateId: string
  name: string
  cid: number | null
  signals: SignalItem[]
  snapshotAge: string | null
  status: CandidateSignalStatus
  error?: string
}

export function projectDeepLinkOpts(project: Project): DeepLinkOptions {
  return {
    projectId: project.id,
    disease: project.disease?.name ?? null,
  }
}

/** Pure: build a board row from already-fetched counts. */
export function buildCandidateSignalRow(
  candidate: MoleculeCandidate,
  currentCounts: Record<string, number> | null,
  opts?: DeepLinkOptions & { error?: string },
): CandidateSignalRow {
  const cid = candidate.identity.pubchemCid ?? null
  const base = {
    candidateId: candidate.candidateId,
    name: candidate.identity.name,
    cid,
  }

  if (cid == null || cid <= 0) {
    return { ...base, cid: null, signals: [], snapshotAge: null, status: 'no_cid' }
  }

  if (opts?.error) {
    return {
      ...base,
      signals: [],
      snapshotAge: null,
      status: 'error',
      error: opts.error,
    }
  }

  if (!currentCounts) {
    return { ...base, signals: [], snapshotAge: null, status: 'loading' }
  }

  const snap = getSnapshot(cid)
  if (!snap) {
    // First observation — establish baseline; no badge spam
    return {
      ...base,
      signals: [],
      snapshotAge: null,
      status: 'baseline',
    }
  }

  const signals = detectSignalsFromCounts(cid, snap.counts, currentCounts, opts)
  return {
    ...base,
    signals,
    snapshotAge: formatSnapshotAge(snap.timestamp),
    status: 'ready',
  }
}

/**
 * Stable membership key for when to re-fetch signals.
 * Candidate set + CID only — NOT boardStatus / updatedAt (triage must not wipe chips).
 */
export function projectSignalsMembershipKey(project: Project): string {
  const parts = project.candidates
    .map((c) => `${c.candidateId}:${c.identity.pubchemCid ?? ''}`)
    .sort()
  return `${project.id}|${parts.join(',')}`
}

/**
 * Merge fresh signal rows with prior session rows so triage/status changes
 * do not blank chips that already appeared for a still-present candidate.
 * Prefer new non-empty signals; otherwise keep sticky prior signals for same id/cid.
 */
export function mergeStickySignalRows(
  previous: CandidateSignalRow[] | null | undefined,
  next: CandidateSignalRow[],
  presentCandidateIds: Set<string>,
): CandidateSignalRow[] {
  const prevById = new Map((previous ?? []).map((r) => [r.candidateId, r] as const))
  return next
    .filter((r) => presentCandidateIds.has(r.candidateId))
    .map((row) => {
      const prev = prevById.get(row.candidateId)
      if (!prev) return row
      // Drop sticky if candidate lost CID or hard error
      if (row.status === 'no_cid') return row
      if (row.status === 'error' && row.signals.length === 0 && prev.signals.length === 0) {
        return row
      }
      // Fresh non-empty wins
      if (row.signals.length > 0) return row
      // Sticky: keep prior chips while candidate remains on board
      if (prev.signals.length > 0 && prev.cid === row.cid) {
        return {
          ...row,
          signals: prev.signals,
          snapshotAge: prev.snapshotAge ?? row.snapshotAge,
          status: 'ready' as const,
        }
      }
      return row
    })
}

/**
 * Load signals for every board candidate with a PubChem CID.
 * On first visit (no snapshot), saves baseline and returns status `baseline`.
 * On subsequent visits, returns count-diff signals with panel deep links.
 *
 * Default `refreshBaseline` is **false** so chips stay meaningful for the open board
 * session (triage must not clear them). Pass `refreshBaseline: true` to clear diffs
 * after reporting (e.g. explicit "refresh signals" or leave-board cleanup).
 */
export async function loadProjectSignals(
  project: Project,
  options?: {
    /**
     * After reporting diffs, write current counts as the new baseline.
     * Default **false** (sticky session). Set true only for intentional clear/refresh.
     */
    refreshBaseline?: boolean
    /** Max concurrent molecule fetches (default 3). */
    concurrency?: number
  },
): Promise<CandidateSignalRow[]> {
  const opts = projectDeepLinkOpts(project)
  const refreshBaseline = options?.refreshBaseline === true
  const concurrency = Math.max(1, options?.concurrency ?? 3)

  const candidates = project.candidates
  const results: CandidateSignalRow[] = new Array(candidates.length)

  let index = 0
  async function worker() {
    while (index < candidates.length) {
      const i = index++
      const c = candidates[i]
      const cid = c.identity.pubchemCid ?? null

      if (cid == null || cid <= 0) {
        results[i] = buildCandidateSignalRow(c, null)
        continue
      }

      try {
        const fetched = await fetchTrackedCounts(cid)
        if (!fetched.ok) {
          results[i] = buildCandidateSignalRow(c, null, {
            ...opts,
            error: fetched.error ?? 'Fetch failed',
          })
          continue
        }

        const summary = summariseMoleculeSignals(cid, fetched.data, opts)
        if (!summary.hadSnapshot) {
          // Establish baseline silently
          saveSnapshot(cid, fetched.data)
          results[i] = {
            candidateId: c.candidateId,
            name: c.identity.name,
            cid,
            signals: [],
            snapshotAge: null,
            status: 'baseline',
          }
        } else {
          results[i] = {
            candidateId: c.candidateId,
            name: c.identity.name,
            cid,
            signals: summary.signals,
            snapshotAge: summary.snapshotAge,
            status: 'ready',
          }
          // Refresh baseline so the same diffs don't reappear forever
          if (refreshBaseline) {
            saveSnapshot(cid, fetched.data)
          }
        }
      } catch (err) {
        results[i] = buildCandidateSignalRow(c, null, {
          ...opts,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, () => worker()))
  return results
}
