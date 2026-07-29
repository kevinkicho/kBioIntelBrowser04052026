import type { AlphaFoldPrediction } from '../types'

const UA =
  process.env.NCBI_EMAIL
    ? `BioIntel/0.1 (mailto:${process.env.NCBI_EMAIL})`
    : 'BioIntel/0.1 (+https://github.com/kevinkicho/kBioIntelBrowser04052026; research)'

export async function getAlphaFoldPredictions(accessions: string[]): Promise<AlphaFoldPrediction[]> {
  try {
    const limited = accessions
      .slice(0, 5)
      .map((a) => a.trim().toUpperCase())
      .filter(Boolean)
    if (limited.length === 0) return []

    const results = await Promise.all(
      limited.map(async (accession): Promise<AlphaFoldPrediction | null> => {
        try {
          const res = await fetch(
            `https://alphafold.ebi.ac.uk/api/prediction/${encodeURIComponent(accession)}`,
            {
              cache: 'no-store',
              headers: {
                Accept: 'application/json',
                'User-Agent': UA,
              },
            },
          )
          if (!res.ok) return null
          const ct = (res.headers.get('content-type') || '').toLowerCase()
          const text = await res.text()
          if (!text || text.trimStart().startsWith('<') || ct.includes('text/html')) {
            return null
          }
          let data: unknown
          try {
            data = JSON.parse(text)
          } catch {
            return null
          }
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
        } catch {
          return null
        }
      }),
    )

    return results.filter((r): r is AlphaFoldPrediction => r !== null)
  } catch {
    return []
  }
}
