import type { PdbeLigand } from '../types'
import { timedFetch } from './timedFetch'

const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * PDBe ligands harvest leaf. HTTP / HTML / timeout / network are not EMPTY.
 * Empty query, 404, missing id, and zero-hit JSON remain empty.
 * Same-source HET lookup may fall through to compound search; if that also fails, throw.
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
  const q = name?.trim()
  if (!q) return []

  const het = NAME_TO_HET[q.toLowerCase()]
  const codesToTry = [het, q.length <= 3 ? q.toUpperCase() : ''].filter(Boolean) as string[]
  for (const code of codesToTry) {
    try {
      const res = await timedFetch(
        `https://www.ebi.ac.uk/pdbe/api/pdb/compound/summary/${encodeURIComponent(code)}`,
        { ...fetchOptions, timeoutMs: 8000 },
      )
      if (isAbsentStatus(res.status)) continue
      if (!res.ok) continue
      const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
      if (contentType.includes('text/html')) continue
      const data = await res.json()
      const mapped = mapSummary(data as Record<string, unknown[]>)
      if (mapped.length > 0) return mapped
    } catch {
      // Same-source fallback: HET failure still tries compound search.
    }
  }

  const searchRes = await timedFetch(
    `https://www.ebi.ac.uk/pdbe/search/pdb/select?q=compound_name:${encodeURIComponent(q)}&rows=5&wt=json&fl=pdb_id,title,compound_name`,
    { ...fetchOptions, timeoutMs: 8000 },
  )
  if (isAbsentStatus(searchRes.status)) return []
  throwIfHttpFailed(searchRes, 'PDBe')
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
}
