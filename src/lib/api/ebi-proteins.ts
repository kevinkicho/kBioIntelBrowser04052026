import type { ProteinFeature } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

const INTERESTING_TYPES = new Set([
  'ACTIVE_SITE',
  'BINDING',
  'DOMAIN',
  'SIGNAL',
  'TRANSMEM',
  'DISULFID',
  'MOD_RES',
])

/**
 * EBI Proteins harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * 404, missing accession, and zero-hit JSON remain empty.
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

export async function getProteinFeaturesByAccessions(accessions: string[]): Promise<ProteinFeature[]> {
  const limited = accessions.slice(0, 3)
  if (limited.length === 0) return []

  const results = await Promise.all(
    limited.map(async (accession): Promise<ProteinFeature[]> => {
      const res = await timedFetch(
        `https://www.ebi.ac.uk/proteins/api/features/${encodeURIComponent(accession)}`,
        {
          ...fetchOptions,
          headers: { Accept: 'application/json' },
          timeoutMs: 8000,
        },
      )
      if (isAbsentStatus(res.status)) return []
      throwIfHttpFailed(res, 'EBI Proteins')
      const data = await res.json()
      const features = data?.features ?? []
      return (features as Record<string, unknown>[])
        .filter(f => INTERESTING_TYPES.has(String(f.type ?? '')))
        .map(f => {
          const evidences = Array.isArray(f.evidences)
            ? (f.evidences as Record<string, string>[]).map(e => e.code ?? String(e))
            : []
          return {
            featureId: String(f.id ?? ''),
            featureName: String(f.description ?? ''),
            start: Number(f.begin) || 0,
            begin: Number(f.begin) || 0,
            end: Number(f.end) || 0,
            description: String(f.description ?? ''),
            source: 'UniProt',
            type: String(f.type ?? ''),
            evidences,
            url: `https://www.uniprot.org/uniprot/${accession}#${f.type}`,
          }
        })
    }),
  )

  return results.flat().slice(0, 15)
}
