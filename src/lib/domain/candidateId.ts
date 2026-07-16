/**
 * Stable candidate identity keys for boards / dedupe.
 * Preference: ik:InChIKey | ch:CHEMBLid | cid:N | nm:sha256(normalizedName).slice(0,16)
 * Origins NEVER enter the id.
 * @see docs/design/discovery-workbench-v1.md §3.1 computeCandidateId
 */

import {
  isValidInchiKey,
  normalizeChemblId,
  normalizeCid,
  normalizeInchiKey,
} from './identity'
import { sha256Hex } from './sha256'

export type CandidateIdKind = 'ik' | 'ch' | 'cid' | 'nm'

export interface ParsedCandidateId {
  kind: CandidateIdKind
  value: string
  raw: string
}

export interface CandidateIdInput {
  inchiKey?: string
  chemblId?: string
  pubchemCid?: number | null
  name: string
}

/**
 * Normalize display name for nm: hash branch.
 * NFKC, trim, collapse whitespace, lower-case.
 */
export function normalizeCandidateName(name: string): string {
  return name
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/** First 16 hex chars of SHA-256 over the normalized name (isomorphic pure JS). */
export function hashNormalizedName(name: string): string {
  const normalized = normalizeCandidateName(name)
  return sha256Hex(normalized).slice(0, 16)
}

/**
 * Build stable candidateId.
 * Priority: valid InChIKey → ChEMBL → PubChem CID → name hash.
 * Origins must never be passed into this function / never enter the id.
 */
export function computeCandidateId(identity: CandidateIdInput): string {
  const ik = normalizeInchiKey(identity.inchiKey)
  if (isValidInchiKey(ik)) {
    return `ik:${ik}`
  }

  const chembl = normalizeChemblId(identity.chemblId)
  if (chembl) {
    return `ch:${chembl}`
  }

  const cid = normalizeCid(identity.pubchemCid ?? null)
  if (cid != null) {
    return `cid:${cid}`
  }

  const name = identity.name?.trim() ? identity.name : 'unknown'
  return `nm:${hashNormalizedName(name)}`
}

/**
 * Canonicalize a candidateId string when possible (e.g. ch:25 → ch:CHEMBL25).
 * Returns null if the id cannot be parsed.
 */
export function canonicalizeCandidateId(id: string): string | null {
  const p = parseCandidateId(id)
  if (!p) return null
  switch (p.kind) {
    case 'ik':
      return `ik:${normalizeInchiKey(p.value)}`
    case 'ch': {
      const ch = normalizeChemblId(p.value)
      return ch ? `ch:${ch}` : null
    }
    case 'cid':
      return `cid:${p.value}`
    case 'nm':
      return `nm:${p.value.toLowerCase()}`
    default:
      return null
  }
}

/** Parse a candidateId into kind + value. Returns null if malformed. */
export function parseCandidateId(id: string): ParsedCandidateId | null {
  if (!id || typeof id !== 'string') return null
  const idx = id.indexOf(':')
  if (idx <= 0) return null
  const kind = id.slice(0, idx) as CandidateIdKind
  const value = id.slice(idx + 1)
  if (!value) return null
  if (kind !== 'ik' && kind !== 'ch' && kind !== 'cid' && kind !== 'nm') return null
  if (kind === 'cid' && !/^\d+$/.test(value)) return null
  if (kind === 'ik' && !isValidInchiKey(value)) return null
  if (kind === 'ch') {
    // Accept bare digits or CHEMBL\d+ for parse; normalizeChemblId rejects garbage
    const n = normalizeChemblId(value)
    if (!n) return null
    return { kind, value: n, raw: id }
  }
  if (kind === 'nm' && !/^[a-f0-9]{16}$/i.test(value)) return null
  return { kind, value, raw: id }
}

/**
 * Compare candidate ids.
 * Prefer comparing outputs of `computeCandidateId`. When raw external strings are
 * passed, values are canonicalized first so `ch:25` equals `ch:CHEMBL25`.
 */
export function candidateIdsEqual(a: string, b: string): boolean {
  if (a === b) return true
  const ca = canonicalizeCandidateId(a)
  const cb = canonicalizeCandidateId(b)
  return ca != null && cb != null && ca === cb
}

/**
 * Prefer higher-trust id when merging duplicates.
 * ik > ch > cid > nm
 */
export function preferCandidateId(a: string, b: string): string {
  const rank = (id: string): number => {
    const p = parseCandidateId(id)
    if (!p) return -1
    switch (p.kind) {
      case 'ik':
        return 4
      case 'ch':
        return 3
      case 'cid':
        return 2
      case 'nm':
        return 1
      default:
        return 0
    }
  }
  return rank(a) >= rank(b) ? a : b
}
