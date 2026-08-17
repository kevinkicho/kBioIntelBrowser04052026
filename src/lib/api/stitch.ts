import type { ChemicalProteinInteraction } from '../types'
import { LIMITS } from '../api-limits'
import { getChemblActivitiesByName } from './chembl'
import { getDrugGeneInteractionsByName } from './dgidb'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * STITCH harvest leaf (STRING-backed; DGIdb / ChEMBL fallbacks).
 * HTTP / HTML / timeout / network are not EMPTY.
 * Blank query, 404, and zero-hit JSON remain empty.
 * STRING identifiers are same-source fallbacks. DGIdb and ChEMBL are
 * cross-source fallbacks. If all sources fail, throw.
 */
function isAbsentStatus(status: number): boolean {
  return status === 404
}

function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown }

function mapStringRows(
  data: Record<string, string>[],
  id: string,
  q: string,
  limit: number,
): ChemicalProteinInteraction[] {
  return data
    .slice(0, limit)
    .map((r) => ({
      chemicalId: r.chemicalId ?? r.stringId_A ?? r.queryItem ?? id,
      chemicalName: r.chemicalName ?? r.preferredName_A ?? r.queryName ?? q,
      proteinId: r.stringId_B ?? r.proteinId ?? '',
      proteinName: r.preferredName_B ?? r.proteinName ?? '',
      combinedScore: Number(r.score) || 0,
      experimentalScore: Number(r.escore) || 0,
      databaseScore: Number(r.dscore) || 0,
      textminingScore: Number(r.tscore) || 0,
      url: `https://string-db.org/network/${r.stringId_A ?? r.chemicalId ?? id}`,
    }))
    .filter((r) => r.proteinName)
}

function looksLikePpiHijack(mapped: ChemicalProteinInteraction[], id: string, q: string): boolean {
  const looksLikeCid = /^CID/i.test(id)
  if (looksLikeCid || mapped.length === 0) return false
  const a = (mapped[0].chemicalName || '').toUpperCase()
  const qU = q.toUpperCase()
  return Boolean(
    a &&
      a !== qU &&
      !a.includes(qU) &&
      !qU.includes(a) &&
      /^[A-Z][A-Z0-9-]{1,14}$/.test(a) &&
      a.length <= 12,
  )
}

async function stringPartnersForId(
  id: string,
  q: string,
  limit: number,
): Promise<ChemicalProteinInteraction[]> {
  const url =
    `https://string-db.org/api/json/interaction_partners` +
    `?identifiers=${encodeURIComponent(id)}&species=9606&limit=${limit}&caller_identity=kNIHexplorer`
  const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
  if (isAbsentStatus(res.status)) return []
  throwIfHttpFailed(res, 'STRING')
  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return []
  const mapped = mapStringRows(data as Record<string, string>[], id, q, limit)
  if (looksLikePpiHijack(mapped, id, q)) return []
  return mapped
}

function mapDgidbRows(
  ix: Awaited<ReturnType<typeof getDrugGeneInteractionsByName>>,
  q: string,
  limit: number,
): ChemicalProteinInteraction[] {
  return ix.slice(0, limit).map((i) => ({
    chemicalId: q,
    chemicalName: i.drugName || q,
    proteinId: i.geneSymbol || i.geneName || '',
    proteinName: i.geneSymbol || i.geneName || '',
    combinedScore: Number(i.score) || 0,
    experimentalScore: 0,
    databaseScore: Number(i.score) || 0,
    textminingScore: 0,
    url: i.url || `https://www.dgidb.org/results?searchType=drug&searchTerms=${encodeURIComponent(q)}`,
  }))
}

function mapChemblRows(
  acts: Awaited<ReturnType<typeof getChemblActivitiesByName>>,
  q: string,
  limit: number,
): ChemicalProteinInteraction[] {
  return acts
    .slice(0, limit)
    .map((a) => ({
      chemicalId: a.chemblId || q,
      chemicalName: q,
      proteinId: a.targetChemblId || '',
      proteinName: a.targetName || '',
      combinedScore: a.standardValue != null ? 1 / (1 + Math.abs(Number(a.standardValue) || 0)) : 0,
      experimentalScore: 0,
      databaseScore: 1,
      textminingScore: 0,
      url: a.url || `https://www.ebi.ac.uk/chembl/`,
    }))
    .filter((r) => r.proteinName)
}

/**
 * STITCH (stitch.embl.de) is largely retired into STRING.
 * Primary: STRING JSON with chemical CID padding when available.
 * Fallback: free DGIdb drug-gene interactions, then ChEMBL activities.
 */
export async function getChemicalInteractionsByName(
  name: string,
  limit: number = LIMITS.STITCH.initial,
  opts?: { cid?: number },
): Promise<ChemicalProteinInteraction[]> {
  const q = name?.trim()
  if (!q) return []

  const identifiers: string[] = []
  if (opts?.cid && Number.isFinite(opts.cid)) {
    identifiers.push(`CID${String(opts.cid).padStart(8, '0')}`)
    identifiers.push(`CIDm${String(opts.cid).padStart(8, '0')}`)
  }
  identifiers.push(q)

  let stringError: unknown = null
  let stringSawHonestEmpty = false
  for (const id of identifiers) {
    try {
      const mapped = await stringPartnersForId(id, q, limit)
      if (mapped.length > 0) return mapped
      stringSawHonestEmpty = true
    } catch (e) {
      stringError = e
    }
  }
  const stringOutcome: Outcome<ChemicalProteinInteraction[]> = stringSawHonestEmpty
    ? { ok: true, value: [] }
    : { ok: false, error: stringError ?? new Error('STRING upstream failed') }

  const dgidbOutcome: Outcome<ChemicalProteinInteraction[]> = await getDrugGeneInteractionsByName(q)
    .then((ix): Outcome<ChemicalProteinInteraction[]> => ({ ok: true, value: mapDgidbRows(ix, q, limit) }))
    .catch((error): Outcome<ChemicalProteinInteraction[]> => ({ ok: false, error }))
  if (dgidbOutcome.ok && dgidbOutcome.value.length > 0) return dgidbOutcome.value

  const chemblOutcome: Outcome<ChemicalProteinInteraction[]> = await getChemblActivitiesByName(q, limit)
    .then((acts): Outcome<ChemicalProteinInteraction[]> => ({ ok: true, value: mapChemblRows(acts, q, limit) }))
    .catch((error): Outcome<ChemicalProteinInteraction[]> => ({ ok: false, error }))
  if (chemblOutcome.ok && chemblOutcome.value.length > 0) return chemblOutcome.value

  if (!stringOutcome.ok && !dgidbOutcome.ok && !chemblOutcome.ok) {
    const err = chemblOutcome.error ?? dgidbOutcome.error ?? stringOutcome.error
    throw err instanceof Error ? err : new Error('STITCH upstream failed')
  }

  return []
}