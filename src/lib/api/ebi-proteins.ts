import type { ProteinFeature } from '../types'

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

export async function getProteinFeaturesByAccessions(accessions: string[]): Promise<ProteinFeature[]> {
  try {
    const limited = accessions.slice(0, 3)
    if (limited.length === 0) return []

    const results = await Promise.all(
      limited.map(async (accession): Promise<ProteinFeature[]> => {
        try {
          const res = await fetch(
            `https://www.ebi.ac.uk/proteins/api/features/${encodeURIComponent(accession)}`,
            {
              ...fetchOptions,
              headers: { Accept: 'application/json' },
            },
          )
          if (!res.ok) return []
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
        } catch {
          return []
        }
      }),
    )

    return results.flat().slice(0, 15)
  } catch {
    return []
  }
}
