/**
 * Resolve a drug / chemical name to human gene symbols and UniProt accessions
 * via free ChEMBL mechanisms + target components (no paid keys).
 *
 * Used by gene-oriented molecule panels (AlphaFold, Bgee, Intact, PeptideAtlas, …)
 * that otherwise query free-text chemical names and return empty.
 */

const SEARCH_URL = 'https://www.ebi.ac.uk/chembl/api/data/molecule/search.json'
const MECHANISM_URL = 'https://www.ebi.ac.uk/chembl/api/data/mechanism.json'
const TARGET_URL = 'https://www.ebi.ac.uk/chembl/api/data/target'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export interface DrugTargetResolve {
  chemblId: string | null
  geneSymbols: string[]
  uniprotAccessions: string[]
  targetNames: string[]
}

async function getChemblId(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${SEARCH_URL}?q=${encodeURIComponent(name)}&limit=1`,
      fetchOptions,
    )
    if (!res.ok) return null
    const data = await res.json()
    const id = data.molecules?.[0]?.molecule_chembl_id
    return typeof id === 'string' ? id : null
  } catch {
    return null
  }
}

async function targetComponents(targetChemblId: string): Promise<{
  genes: string[]
  accessions: string[]
  name: string
}> {
  try {
    const res = await fetch(`${TARGET_URL}/${encodeURIComponent(targetChemblId)}.json`, fetchOptions)
    if (!res.ok) return { genes: [], accessions: [], name: '' }
    const data = await res.json()
    const name = String(data.pref_name || '')
    const genes: string[] = []
    const accessions: string[] = []
    for (const comp of data.target_components ?? []) {
      const acc = String(comp.accession || '').trim()
      if (acc && /^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(acc)) {
        accessions.push(acc.toUpperCase())
      }
      for (const syn of comp.target_component_synonyms ?? []) {
        if (syn.syn_type === 'GENE_SYMBOL' || syn.syn_type === 'GENE_SYMBOL_OTHER') {
          const g = String(syn.component_synonym || '').trim()
          if (g && /^[A-Z][A-Z0-9-]{1,14}$/i.test(g)) genes.push(g.toUpperCase())
        }
      }
    }
    return { genes, accessions, name }
  } catch {
    return { genes: [], accessions: [], name: '' }
  }
}

/**
 * Best-effort map: drug name → human target genes + UniProt accessions.
 */
export async function resolveDrugTargets(name: string, limit = 6): Promise<DrugTargetResolve> {
  const q = name?.trim()
  if (!q) {
    return { chemblId: null, geneSymbols: [], uniprotAccessions: [], targetNames: [] }
  }

  // Gene-shaped pass-through (TP53, EGFR, BRCA1) — NOT free-text drug names.
  // PubChem often returns ALL-CAPS titles (ASPIRIN) which must not short-circuit ChEMBL.
  const noSpace = !/\s/.test(q) && q.length >= 2 && q.length <= 12
  const alnumGene = /^[A-Za-z][A-Za-z0-9-]{1,14}$/.test(q)
  const hasDigit = /[0-9]/.test(q)
  // Real gene symbols are typically ≤6 chars without digits, or any length with a digit
  const looksLikeGene =
    noSpace &&
    alnumGene &&
    (hasDigit || q.length <= 6) &&
    !/^(drug|acid|salt|aspirin|ibuprofen|metformin|warfarin|caffeine)$/i.test(q)
  if (looksLikeGene) {
    return {
      chemblId: null,
      geneSymbols: [q.toUpperCase()],
      uniprotAccessions: [],
      targetNames: [],
    }
  }

  // UniProt accession pass-through
  if (/^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(q)) {
    return {
      chemblId: null,
      geneSymbols: [],
      uniprotAccessions: [q.toUpperCase()],
      targetNames: [],
    }
  }

  const chemblId = await getChemblId(q)
  if (!chemblId) {
    return { chemblId: null, geneSymbols: [], uniprotAccessions: [], targetNames: [] }
  }

  const geneSet = new Set<string>()
  const accSet = new Set<string>()
  const nameSet = new Set<string>()

  try {
    const mechRes = await fetch(
      `${MECHANISM_URL}?molecule_chembl_id=${encodeURIComponent(chemblId)}&limit=${limit}`,
      fetchOptions,
    )
    if (mechRes.ok) {
      const mechData = await mechRes.json()
      for (const m of mechData.mechanisms ?? []) {
        const tid = m.target_chembl_id as string | undefined
        const tname = String(m.target_name || '').trim()
        if (tname) nameSet.add(tname)
        if (!tid) continue
        const comps = await targetComponents(tid)
        for (const g of comps.genes) geneSet.add(g)
        for (const a of comps.accessions) accSet.add(a)
        if (comps.name) nameSet.add(comps.name)
        if (geneSet.size >= limit && accSet.size >= limit) break
      }
    }
  } catch {
    /* continue */
  }

  // DGIdb gene symbols as extra coverage (free GraphQL)
  if (geneSet.size < 2) {
    try {
      const { getDrugGeneInteractionsByName } = await import('./dgidb')
      const ix = await getDrugGeneInteractionsByName(q)
      for (const i of ix) {
        const g = (i.geneSymbol || i.geneName || '').trim().toUpperCase()
        if (g && /^[A-Z][A-Z0-9-]{1,14}$/.test(g)) geneSet.add(g)
        if (geneSet.size >= limit) break
      }
    } catch {
      /* ignore */
    }
  }

  return {
    chemblId,
    geneSymbols: Array.from(geneSet).slice(0, limit),
    uniprotAccessions: Array.from(accSet).slice(0, limit),
    targetNames: Array.from(nameSet).slice(0, limit),
  }
}
