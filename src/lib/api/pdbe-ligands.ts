import type { PdbeLigand } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getPdbeLigandsByName(name: string): Promise<PdbeLigand[]> {
  try {
    // Try direct compound summary first
    const res = await fetch(
      `https://www.ebi.ac.uk/pdbe/api/pdb/compound/summary/${encodeURIComponent(name)}`,
      fetchOptions,
    )
    if (res.ok) {
      const data = await res.json()
      const entries = Object.entries(data as Record<string, unknown[]>).slice(0, 5)
      if (entries.length > 0) {
        return entries.map(([compId, value]) => {
          const entry = (Array.isArray(value) ? value[0] ?? {} : {}) as Record<string, unknown>
          return {
            compId,
            name: String(entry.name ?? ''),
            formula: String(entry.formula ?? ''),
            molecularWeight: Number(entry.formula_weight) || 0,
            inchiKey: String(entry.inchi_key ?? ''),
            drugbankId: String(entry.drugbank_id ?? ''),
            url: `https://www.ebi.ac.uk/pdbe/entry/pdb/${compId}`,
          }
        })
      }
    }

    // Fallback: search endpoint
    const searchRes = await fetch(
      `https://www.ebi.ac.uk/pdbe/search/pdb-compound/select?q=name:${encodeURIComponent(name)}&rows=5&wt=json`,
      fetchOptions,
    )
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const docs = searchData?.response?.docs ?? []
    return docs.slice(0, 5).map((doc: {
      compound_id?: string
      compound_name?: string
      formula?: string
      formula_weight?: number
    }) => ({
      compId: String(doc.compound_id ?? ''),
      name: String(doc.compound_name ?? ''),
      formula: String(doc.formula ?? ''),
      molecularWeight: Number(doc.formula_weight) || 0,
      inchiKey: '',
      drugbankId: '',
      url: `https://www.ebi.ac.uk/pdbe/entry/pdb/${doc.compound_id}`,
    }))
  } catch {
    return []
  }
}
