import type { ChemblIndication } from '../types'

const SEARCH_URL = 'https://www.ebi.ac.uk/chembl/api/data/molecule/search.json'
const INDICATION_URL = 'https://www.ebi.ac.uk/chembl/api/data/drug_indication.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getChemblIndicationsByName(name: string): Promise<ChemblIndication[]> {
  try {
    const searchRes = await fetch(
      `${SEARCH_URL}?q=${encodeURIComponent(name)}&limit=1`,
      fetchOptions
    )
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const molecules = searchData.molecules ?? []
    if (molecules.length === 0) return []
    const chemblId = molecules[0].molecule_chembl_id

    const indRes = await fetch(
      `${INDICATION_URL}?molecule_chembl_id=${chemblId}&limit=10`,
      fetchOptions
    )
    if (!indRes.ok) return []
    const indData = await indRes.json()

    return (indData.drug_indications ?? []).map((d: {
      mesh_heading?: string
      mesh_id?: string
      efo_term?: string
      efo_id?: string
      max_phase_for_ind?: number
    }) => ({
      meshHeading: d.mesh_heading ?? '',
      meshId: d.mesh_id ?? '',
      efoTerm: d.efo_term ?? '',
      efoId: d.efo_id ?? '',
      maxPhaseForIndication: Number(d.max_phase_for_ind) || 0,
      url: `https://www.ebi.ac.uk/chembl/g/#browse/drug_indications/filter/molecule_chembl_id:${chemblId}`,
    }))
  } catch {
    return []
  }
}
