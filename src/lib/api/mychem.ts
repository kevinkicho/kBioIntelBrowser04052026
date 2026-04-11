import type { MyChemAnnotation } from '../types'

const BASE_URL = 'https://mychem.info/v1'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * Search chemicals by name or identifier
 */
export async function searchChemicals(query: string): Promise<MyChemAnnotation[]> {
  try {
    const url = `${BASE_URL}/query?q=${encodeURIComponent(query)}&fields=chembl,chebi,drugbank,pubchem,name,synonyms,formula,mass,inchi,inchi_key&size=20`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.hits ?? []).map((hit: Record<string, unknown>) => {
      const chembl = hit.chembl as Record<string, unknown> | undefined
      const chebi = hit.chebi as Record<string, unknown> | undefined
      const drugbank = hit.drugbank as Record<string, unknown> | undefined
      const pubchem = hit.pubchem as Record<string, unknown> | undefined

      return {
        chemblId: chembl?.molecule_chembl_id as string ?? '',
        pubchemCid: pubchem?.cid?.toString() ?? '',
        chebiId: chebi?.id as string ?? '',
        inchiKey: hit.inchi_key as string ?? '',
        drugbankId: drugbank?.id as string ?? '',
        name: hit.name as string ?? '',
        synonyms: (hit.synonyms ?? []) as string[],
        formula: hit.formula as string ?? '',
        molecularWeight: hit.mass as number ?? 0,
        smiles: hit.inchi?.toString().split('/')?.[1] ?? '',
        sources: Object.keys(hit).filter(k => ['chembl', 'chebi', 'drugbank', 'pubchem'].includes(k)),
        chembl: chembl ? {
          moleculeType: chembl.molecule_type as string ?? '',
          maxPhase: chembl.max_phase as number ?? 0,
          indications: (chembl.indications ?? []) as string[]
        } : undefined,
        chebi: chebi ? {
          name: chebi.name as string ?? '',
          definition: chebi.definition as string ?? '',
          parentIds: (chebi.parent_ids ?? []) as string[]
        } : undefined,
        drugbank: drugbank ? {
          categories: (drugbank.categories ?? []) as string[],
          groups: (drugbank.groups ?? []) as string[],
          atcCodes: (drugbank.atc_codes ?? []) as string[]
        } : undefined
      }
    })
  } catch {
    return []
  }
}

/**
 * Get chemical annotation by InChIKey
 */
export async function getChemicalByInchiKey(inchiKey: string): Promise<MyChemAnnotation | null> {
  try {
    const url = `${BASE_URL}/chem/${encodeURIComponent(inchiKey)}?fields=chembl,chebi,drugbank,pubchem,name,synonyms,formula,mass,inchi,inchi_key`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return null
    const hit = await res.json()

    const chembl = hit.chembl as Record<string, unknown> | undefined
    const chebi = hit.chebi as Record<string, unknown> | undefined
    const drugbank = hit.drugbank as Record<string, unknown> | undefined
    const pubchem = hit.pubchem as Record<string, unknown> | undefined

    return {
      chemblId: chembl?.molecule_chembl_id as string ?? '',
      pubchemCid: pubchem?.cid?.toString() ?? '',
      chebiId: chebi?.id as string ?? '',
      inchiKey: hit.inchi_key as string ?? '',
      drugbankId: drugbank?.id as string ?? '',
      name: hit.name as string ?? '',
      synonyms: (hit.synonyms ?? []) as string[],
      formula: hit.formula as string ?? '',
      molecularWeight: hit.mass as number ?? 0,
      smiles: hit.inchi?.toString().split('/')?.[1] ?? '',
      sources: Object.keys(hit).filter(k => ['chembl', 'chebi', 'drugbank', 'pubchem'].includes(k)),
      chembl: chembl ? {
        moleculeType: chembl.molecule_type as string ?? '',
        maxPhase: chembl.max_phase as number ?? 0,
        indications: (chembl.indications ?? []) as string[]
      } : undefined,
      chebi: chebi ? {
        name: chebi.name as string ?? '',
        definition: chebi.definition as string ?? '',
        parentIds: (chebi.parent_ids ?? []) as string[]
      } : undefined,
      drugbank: drugbank ? {
        categories: (drugbank.categories ?? []) as string[],
        groups: (drugbank.groups ?? []) as string[],
        atcCodes: (drugbank.atc_codes ?? []) as string[]
      } : undefined
    }
  } catch {
    return null
  }
}

/**
 * Main export: Get MyChem annotation data
 */
export async function getMyChemData(name: string): Promise<{
  chemicals: MyChemAnnotation[]
}> {
  const chemicals = await searchChemicals(name)

  return {
    chemicals: chemicals.slice(0, 15)
  }
}