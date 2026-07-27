/**
 * Identity-first shortlist ordering + InChIKey de-dupe (deterministic).
 * Prefer resolvable free-API identity before pure name proxies.
 */

import type { CandidateMolecule } from './types'

export interface IdentitySortMeta {
  /** PubChem CID if resolved */
  cid?: number | null
  /** Valid InChIKey if known */
  inchiKey?: string | null
  /** 0–1 trust axis */
  identityTrust?: number | null
}

/**
 * Sort: has CID → higher identity trust → composite → source count → name.
 * Composite remains primary *among peers with similar identity quality*.
 */
export function sortCandidatesIdentityFirst(
  candidates: CandidateMolecule[],
  metaByName?: Map<string, IdentitySortMeta>,
): CandidateMolecule[] {
  return [...candidates].sort((a, b) => {
    const ma = metaByName?.get(a.name.toLowerCase())
    const mb = metaByName?.get(b.name.toLowerCase())
    const aCid = (ma?.cid ?? a.cid) != null && (ma?.cid ?? a.cid)! > 0 ? 1 : 0
    const bCid = (mb?.cid ?? b.cid) != null && (mb?.cid ?? b.cid)! > 0 ? 1 : 0
    if (bCid !== aCid) return bCid - aCid

    const aIk = ma?.inchiKey?.trim() ? 1 : 0
    const bIk = mb?.inchiKey?.trim() ? 1 : 0
    if (bIk !== aIk) return bIk - aIk

    const aT = ma?.identityTrust ?? 0
    const bT = mb?.identityTrust ?? 0
    if (Math.abs(bT - aT) > 0.02) return bT - aT

    if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore
    if (b.sources.length !== a.sources.length) return b.sources.length - a.sources.length
    return a.name.localeCompare(b.name)
  })
}

/**
 * Collapse candidates that share the same InChIKey (or same CID when no key).
 * Keep highest composite; merge source labels.
 */
export function dedupeCandidatesByIdentity(
  candidates: CandidateMolecule[],
  metaByName?: Map<string, IdentitySortMeta>,
): { candidates: CandidateMolecule[]; removed: number } {
  const byKey = new Map<string, CandidateMolecule>()
  let removed = 0

  for (const c of candidates) {
    const m = metaByName?.get(c.name.toLowerCase())
    const ik = (m?.inchiKey || '').trim().toUpperCase()
    const cid = m?.cid ?? c.cid
    const key = ik
      ? `ik:${ik}`
      : cid != null && cid > 0
        ? `cid:${cid}`
        : `name:${c.name.trim().toLowerCase()}`

    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { ...c })
      continue
    }
    removed++
    // Prefer higher composite; merge sources
    const winner =
      c.compositeScore > existing.compositeScore
        ? { ...c }
        : { ...existing }
    const loser = winner.name === c.name ? existing : c
    const sources = Array.from(new Set([...winner.sources, ...loser.sources]))
    byKey.set(key, {
      ...winner,
      sources,
      confidence:
        sources.length >= 4 ? 'high' : sources.length >= 2 ? 'moderate' : winner.confidence,
      // Prefer CID if either has it
      cid: winner.cid ?? loser.cid,
    })
  }

  return {
    candidates: Array.from(byKey.values()),
    removed,
  }
}
