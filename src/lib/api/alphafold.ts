import type { AlphaFoldPrediction } from '../types'
import { timedFetch } from './timedFetch'

const UA =
  process.env.NCBI_EMAIL
    ? `BioIntel/0.1 (mailto:${process.env.NCBI_EMAIL})`
    : 'BioIntel/0.1 (+https://github.com/kevinkicho/kBioIntelBrowser04052026; research)'

const fetchOptions: RequestInit = {
  cache: 'no-store',
  headers: {
    Accept: 'application/json',
    'User-Agent': UA,
  },
}

/**
 * AlphaFold harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * 404, missing accession, and empty prediction JSON remain empty.
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

export async function getAlphaFoldPredictions(accessions: string[]): Promise<AlphaFoldPrediction[]> {
  const limited = accessions
    .slice(0, 5)
    .map((a) => a.trim().toUpperCase())
    .filter(Boolean)
  if (limited.length === 0) return []

  const results = await Promise.all(
    limited.map(async (accession): Promise<AlphaFoldPrediction | null> => {
      const res = await timedFetch(
        `https://alphafold.ebi.ac.uk/api/prediction/${encodeURIComponent(accession)}`,
        { ...fetchOptions, timeoutMs: 8000 },
      )
      if (isAbsentStatus(res.status)) return null
      throwIfHttpFailed(res, 'AlphaFold')
      const data = await res.json()
      const entry = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined
      if (!entry) return null
      const acc = String(
        entry.uniprotAccession ||
          entry.uniprotAccessionId ||
          entry.uniprotId ||
          accession,
      )
      return {
        entryId: String(entry.entryId || entry.modelEntityId || `AF-${acc}-F1`),
        uniprotAccession: acc,
        geneName: String(entry.gene || entry.geneName || ''),
        organismName: String(entry.organismScientificName || entry.organismName || ''),
        confidenceScore:
          Number(entry.paeOverallScore ?? entry.globalMetricValue ?? entry.plddt) || 0,
        modelUrl: String(entry.cifUrl || entry.pdbUrl || entry.modelUrl || ''),
        url: `https://alphafold.ebi.ac.uk/entry/${acc}`,
      }
    }),
  )

  return results.filter((r): r is AlphaFoldPrediction => r !== null)
}
