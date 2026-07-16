/**
 * Batch identity resolve for discovery candidates (PR3c).
 * Stage 3 of the rank pipeline: top-N → InChIKey via PubChem PUG property API
 * (same property pattern as getMoleculeIdentifiers), then IdentityTrust + candidateId.
 *
 * @see docs/design/discovery-workbench-v1.md §5.1.2 stage 3, §3.2, M7 call budgets
 */

import {
  assessIdentityTrust,
  isValidInchiKey,
  normalizeCid,
  normalizeInchiKey,
  type IdentityTrust,
} from '../domain/identity'
import { computeCandidateId } from '../domain/candidateId'
import type { MoleculeCandidate, MoleculeIdentity } from '../domain/entities'
import {
  computeComposite,
  createDefaultScoreRubric,
  type ScoreRubric,
} from '../domain/score'

const PUBCHEM_PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const PC_FETCH_OPTS: RequestInit = { next: { revalidate: 86400 } }

/** Design §5.1.2 — identity stage covers top 25 candidates */
export const DEFAULT_IDENTITY_TOP_N = 25

/**
 * Cap concurrent PubChem property batch requests.
 * Design harvest-like stages use concurrency 4; overall rank budget is 8.
 */
export const DEFAULT_IDENTITY_CONCURRENCY = 4

/** Max CIDs per PubChem multi-CID property request */
export const PUBCHEM_CID_BATCH_SIZE = 25

export interface IdentityResolveInput {
  name: string
  cid: number | null
  inchiKey?: string
  chemblId?: string
  smiles?: string
}

export interface PubChemPropertyHit {
  inchiKey?: string
  smiles?: string
  title?: string
}

export interface ResolvedMoleculeIdentity {
  name: string
  pubchemCid: number | null
  inchiKey?: string
  smiles?: string
  chemblId?: string
  chebiId?: string
  drugbankId?: string
  synonyms: string[]
  identityTrust: IdentityTrust
  alternateCids?: number[]
  reasons: string[]
  /** True when PubChem was queried for this candidate in this batch */
  fetched: boolean
}

export interface BatchIdentityResolveResult {
  /** Parallel to input order */
  resolved: ResolvedMoleculeIdentity[]
  /** Candidates for which a PubChem property fetch was attempted */
  fetchedCount: number
  /** Candidates ending with high identity trust (valid InChIKey) */
  highTrustCount: number
  durationMs: number
}

export interface ResolveIdentitiesOptions {
  /** Max candidates to hit PubChem for (default 25) */
  topN?: number
  /** Max concurrent PubChem batch requests (default 4) */
  concurrency?: number
  /** CIDs per batch request (default 25) */
  batchSize?: number
  /** Injected fetch (tests) */
  fetchImpl?: typeof fetch
}

/**
 * Run async work over items with a fixed concurrency pool.
 * Exported for unit tests.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []
  const limit = Math.max(1, Math.min(concurrency, items.length))
  const results: R[] = new Array(items.length)
  let cursor = 0

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()))
  return results
}

function buildResolved(
  input: IdentityResolveInput,
  extras?: {
    inchiKey?: string
    smiles?: string
    fetched?: boolean
  },
): ResolvedMoleculeIdentity {
  const cid = normalizeCid(input.cid)
  const inchiKey = normalizeInchiKey(extras?.inchiKey ?? input.inchiKey)
  const smiles = (extras?.smiles ?? input.smiles)?.trim() || undefined

  const assessment = assessIdentityTrust({
    name: input.name,
    cid,
    inchiKey,
    chemblId: input.chemblId,
    smiles,
  })

  return {
    name: input.name,
    pubchemCid: cid,
    inchiKey: assessment.keys.inchiKey,
    smiles,
    chemblId: assessment.keys.chemblId,
    synonyms: [],
    identityTrust: assessment.level,
    reasons: assessment.reasons,
    fetched: extras?.fetched ?? false,
  }
}

/**
 * Fetch InChIKey / SMILES for a single CID (PubChem PUG property — same fields as getMoleculeIdentifiers).
 */
export async function fetchPubChemIdentityByCid(
  cid: number,
  fetchImpl: typeof fetch = fetch,
): Promise<PubChemPropertyHit | null> {
  try {
    const url = `${PUBCHEM_PUG}/compound/cid/${cid}/property/InChIKey,IsomericSMILES,Title/JSON`
    const res = await fetchImpl(url, PC_FETCH_OPTS)
    if (!res.ok) return null
    const data = await res.json()
    const p = data.PropertyTable?.Properties?.[0]
    if (!p) return null
    return {
      inchiKey: p.InChIKey ? String(p.InChIKey) : undefined,
      smiles: p.IsomericSMILES ? String(p.IsomericSMILES) : undefined,
      title: p.Title ? String(p.Title) : undefined,
    }
  } catch {
    return null
  }
}

/**
 * Batch property fetch for many CIDs in one PubChem request.
 */
export async function fetchPubChemIdentityByCids(
  cids: number[],
  fetchImpl: typeof fetch = fetch,
): Promise<Map<number, PubChemPropertyHit>> {
  const out = new Map<number, PubChemPropertyHit>()
  const unique = Array.from(new Set(cids.filter((c) => Number.isInteger(c) && c > 0)))
  if (unique.length === 0) return out

  try {
    const url = `${PUBCHEM_PUG}/compound/cid/${unique.join(',')}/property/InChIKey,IsomericSMILES,Title/JSON`
    const res = await fetchImpl(url, PC_FETCH_OPTS)
    if (!res.ok) return out
    const data = await res.json()
    const props: Array<Record<string, unknown>> = data.PropertyTable?.Properties ?? []
    for (const p of props) {
      const cid = Number(p.CID)
      if (!Number.isFinite(cid) || cid <= 0) continue
      out.set(cid, {
        inchiKey: p.InChIKey ? String(p.InChIKey) : undefined,
        smiles: p.IsomericSMILES ? String(p.IsomericSMILES) : undefined,
        title: p.Title ? String(p.Title) : undefined,
      })
    }
  } catch {
    // leave empty — caller may fall back to per-CID
  }
  return out
}

/**
 * Resolve InChIKey + IdentityTrust for a candidate list.
 * Only the first `topN` candidates with a PubChem CID (and no valid InChIKey yet)
 * trigger network I/O. Remaining entries get trust assessed from existing keys only.
 */
export async function resolveIdentitiesBatch(
  inputs: IdentityResolveInput[],
  options?: ResolveIdentitiesOptions,
): Promise<BatchIdentityResolveResult> {
  const topN = options?.topN ?? DEFAULT_IDENTITY_TOP_N
  const concurrency = options?.concurrency ?? DEFAULT_IDENTITY_CONCURRENCY
  const batchSize = options?.batchSize ?? PUBCHEM_CID_BATCH_SIZE
  const fetchImpl = options?.fetchImpl ?? fetch
  const start = Date.now()

  const resolved: ResolvedMoleculeIdentity[] = inputs.map((input) => buildResolved(input))

  type WorkItem = { index: number; cid: number }
  const work: WorkItem[] = []
  for (let i = 0; i < Math.min(topN, inputs.length); i++) {
    const input = inputs[i]
    const cid = normalizeCid(input.cid)
    if (cid == null) continue
    if (isValidInchiKey(input.inchiKey)) continue
    work.push({ index: i, cid })
  }

  if (work.length === 0) {
    return {
      resolved,
      fetchedCount: 0,
      highTrustCount: resolved.filter((r) => r.identityTrust === 'high').length,
      durationMs: Date.now() - start,
    }
  }

  const chunks: WorkItem[][] = []
  for (let i = 0; i < work.length; i += batchSize) {
    chunks.push(work.slice(i, i + batchSize))
  }

  let fetchedCount = 0

  await mapPool(chunks, concurrency, async (chunk) => {
    const cids = chunk.map((w) => w.cid)
    let props = await fetchPubChemIdentityByCids(cids, fetchImpl)

    // If the multi-CID call failed entirely, fall back to per-CID with same concurrency budget
    if (props.size === 0 && cids.length > 0) {
      const singles = await mapPool(chunk, concurrency, async (w) => {
        const hit = await fetchPubChemIdentityByCid(w.cid, fetchImpl)
        return { w, hit }
      })
      props = new Map()
      for (const { w, hit } of singles) {
        fetchedCount++
        if (hit) props.set(w.cid, hit)
        resolved[w.index] = buildResolved(inputs[w.index], {
          inchiKey: hit?.inchiKey,
          smiles: hit?.smiles,
          fetched: true,
        })
      }
      return
    }

    for (const w of chunk) {
      fetchedCount++
      const hit = props.get(w.cid)
      resolved[w.index] = buildResolved(inputs[w.index], {
        inchiKey: hit?.inchiKey,
        smiles: hit?.smiles,
        fetched: true,
      })
    }
  })

  return {
    resolved,
    fetchedCount,
    highTrustCount: resolved.filter((r) => r.identityTrust === 'high').length,
    durationMs: Date.now() - start,
  }
}

export function toMoleculeIdentity(r: ResolvedMoleculeIdentity): MoleculeIdentity {
  return {
    name: r.name,
    synonyms: r.synonyms,
    pubchemCid: r.pubchemCid,
    inchiKey: r.inchiKey,
    smiles: r.smiles,
    chemblId: r.chemblId,
    chebiId: r.chebiId,
    drugbankId: r.drugbankId,
    identityTrust: r.identityTrust,
    alternateCids: r.alternateCids,
  }
}

/**
 * Patch DiscoveryResult / RankResult.v2 candidates with resolved identity.
 * Upgrades candidateId (ik: preferred), identityTrust, and identityTrust axis + composite.
 */
export function applyResolvedIdentities(
  candidates: MoleculeCandidate[],
  resolved: ResolvedMoleculeIdentity[],
  rubric?: ScoreRubric,
): MoleculeCandidate[] {
  const scoreRubric = rubric ?? createDefaultScoreRubric('balanced')

  return candidates.map((c, i) => {
    const res = resolved[i]
    if (!res) return c

    const identity = toMoleculeIdentity(res)
    const candidateId = computeCandidateId({
      name: identity.name,
      inchiKey: identity.inchiKey,
      chemblId: identity.chemblId,
      pubchemCid: identity.pubchemCid,
    })

    const trustAxis = assessIdentityTrust({
      name: identity.name,
      inchiKey: identity.inchiKey,
      chemblId: identity.chemblId,
      cid: identity.pubchemCid,
      smiles: identity.smiles,
    }).axisValue

    let scores = c.scores
    if (scores) {
      const axes = { ...scores.axes, identityTrust: trustAxis }
      scores = {
        ...scores,
        axes,
        axisStatus: { ...scores.axisStatus, identityTrust: 'computed' },
        composite: computeComposite(axes, scoreRubric),
      }
    }

    return {
      ...c,
      candidateId,
      identity,
      scores,
    }
  })
}

/** Baseline resolved list without network (fallback for withSourceStatus). */
export function identityFallbackFromInputs(
  inputs: IdentityResolveInput[],
): BatchIdentityResolveResult {
  const resolved = inputs.map((input) => buildResolved(input))
  return {
    resolved,
    fetchedCount: 0,
    highTrustCount: resolved.filter((r) => r.identityTrust === 'high').length,
    durationMs: 0,
  }
}
