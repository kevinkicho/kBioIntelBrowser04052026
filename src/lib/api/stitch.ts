import type { ChemicalProteinInteraction } from '../types'
import { LIMITS } from '../api-limits'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * STITCH (stitch.embl.de) is largely retired into STRING.
 * Primary: STRING JSON with chemical CID padding when available.
 * Fallback: free DGIdb drug–gene interactions mapped to the same DTO.
 */
export async function getChemicalInteractionsByName(
  name: string,
  limit: number = LIMITS.STITCH.initial,
  opts?: { cid?: number },
): Promise<ChemicalProteinInteraction[]> {
  try {
    const q = name?.trim()
    if (!q) return []

    // Try STRING with CID form (STITCH-style) then free-text
    const identifiers: string[] = []
    if (opts?.cid && Number.isFinite(opts.cid)) {
      identifiers.push(`CID${String(opts.cid).padStart(8, '0')}`)
      identifiers.push(`CIDm${String(opts.cid).padStart(8, '0')}`)
    }
    identifiers.push(q)

    for (const id of identifiers) {
      const url =
        `https://string-db.org/api/json/interaction_partners` +
        `?identifiers=${encodeURIComponent(id)}&species=9606&limit=${limit}&caller_identity=kNIHexplorer`
      try {
        const res = await timedFetch(url, { ...fetchOptions, timeoutMs: 8000 })
        if (!res.ok) continue
        const data = await res.json()
        if (!Array.isArray(data) || data.length === 0) continue

        // Prefer rows that look like chemical–protein (not pure PPI of wrong gene)
        const mapped = (data as Record<string, string>[])
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

        // Reject pure protein–protein hijacks (drug name resolved to unrelated gene)
        const looksLikeCid = /^CID/i.test(id)
        if (!looksLikeCid && mapped.length > 0) {
          const a = (mapped[0].chemicalName || '').toUpperCase()
          const qU = q.toUpperCase()
          // Preferred name on side A is a gene-like token unrelated to the drug query
          if (
            a &&
            a !== qU &&
            !a.includes(qU) &&
            !qU.includes(a) &&
            /^[A-Z][A-Z0-9-]{1,14}$/.test(a) &&
            a.length <= 12
          ) {
            continue
          }
        }

        if (mapped.length > 0) return mapped
      } catch {
        /* try next identifier */
      }
    }

    // Free DGIdb chemical–protein as of-record-friendly fallback
    try {
      const { getDrugGeneInteractionsByName } = await import('./dgidb')
      const ix = await getDrugGeneInteractionsByName(q)
      if (ix.length > 0) {
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
    } catch {
      /* ignore */
    }

    // ChEMBL activities as last free chemical–target source
    try {
      const { getChemblActivitiesByName } = await import('./chembl')
      const acts = await getChemblActivitiesByName(q, limit)
      return acts.slice(0, limit).map((a) => ({
        chemicalId: a.chemblId || q,
        chemicalName: q,
        proteinId: a.targetChemblId || '',
        proteinName: a.targetName || '',
        combinedScore: a.standardValue != null ? 1 / (1 + Math.abs(Number(a.standardValue) || 0)) : 0,
        experimentalScore: 0,
        databaseScore: 1,
        textminingScore: 0,
        url: a.url || `https://www.ebi.ac.uk/chembl/`,
      })).filter((r) => r.proteinName)
    } catch {
      return []
    }
  } catch {
    return []
  }
}
