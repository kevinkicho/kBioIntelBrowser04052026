import type { ProteinDomain } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getProteinDomains(accessions: string[]): Promise<ProteinDomain[]> {
  try {
    const limited = accessions.slice(0, 5)
    if (limited.length === 0) return []

    const results = await Promise.all(
      limited.map(async (accession): Promise<ProteinDomain[]> => {
        try {
          const res = await fetch(
            `https://www.ebi.ac.uk/interpro/api/entry/interpro/protein/UniProt/${encodeURIComponent(accession)}?page_size=10`,
            fetchOptions,
          )
          if (!res.ok) return []
          const data = await res.json()
          const entries = data?.results ?? []
          return (entries as Record<string, Record<string, string>>[]).map(entry => {
            const meta = entry.metadata ?? {}
            const acc = meta.accession ?? ''
            return {
              domainId: acc,
              domainName: meta.name ?? '',
              name: meta.name ?? '',
              type: meta.type ?? '',
              description: meta.name ?? '',
              start: 0,
              end: 0,
              source: 'InterPro',
              url: `https://www.ebi.ac.uk/interpro/entry/InterPro/${acc}`,
            }
          })
        } catch {
          return []
        }
      }),
    )

    return results.flat()
  } catch {
    return []
  }
}
