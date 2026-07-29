import type { PdbeLigand } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/** Common free PDB HET codes for health fixtures / well-known ligands */
const NAME_TO_HET: Record<string, string> = {
  aspirin: 'AIN',
  'acetylsalicylic acid': 'AIN',
  '2-(acetyloxy)benzoic acid': 'AIN',
  ibuprofen: 'IBP',
  imatinib: 'STI',
  caffeine: 'CFF',
  metformin: 'A2G',
  warfarin: 'RWW',
  acetaminophen: 'TYL',
  paracetamol: 'TYL',
}

function mapSummary(data: Record<string, unknown[]>): PdbeLigand[] {
  return Object.entries(data)
    .slice(0, 8)
    .map(([compId, value]) => {
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
    .filter((x) => x.compId)
}

export async function getPdbeLigandsByName(name: string): Promise<PdbeLigand[]> {
  try {
    const q = name?.trim()
    if (!q) return []

    // 1) Known HET code mapping (PDBe compound/summary wants 3-letter codes, not drug names)
    const het = NAME_TO_HET[q.toLowerCase()]
    const codesToTry = [het, q.length <= 3 ? q.toUpperCase() : ''].filter(Boolean) as string[]
    for (const code of codesToTry) {
      const res = await fetch(
        `https://www.ebi.ac.uk/pdbe/api/pdb/compound/summary/${encodeURIComponent(code)}`,
        fetchOptions,
      )
      if (res.ok) {
        const data = await res.json()
        const mapped = mapSummary(data as Record<string, unknown[]>)
        if (mapped.length > 0) return mapped
      }
    }

    // 2) Free-text compound search
    const searchRes = await fetch(
      `https://www.ebi.ac.uk/pdbe/search/pdb/select?q=compound_name:${encodeURIComponent(q)}&rows=5&wt=json&fl=pdb_id,title,compound_name`,
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
