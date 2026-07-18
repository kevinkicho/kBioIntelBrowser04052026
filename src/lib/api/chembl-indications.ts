import type { ChemblIndication } from '../types'
import {
  chemblCompoundIndicationsUrl,
  chemblCompoundUrl,
  chemblIndicationDeepLink,
  normalizeChemblId,
} from '../chemblLinks'

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
    const chemblId =
      normalizeChemblId(molecules[0].molecule_chembl_id) ||
      String(molecules[0].molecule_chembl_id || '')
    const moleculeName = molecules[0].pref_name || name
    // Embed indications table for this molecule (stable explore-era URL)
    const moleculeIndUrl =
      chemblCompoundIndicationsUrl(chemblId) ||
      chemblCompoundUrl(chemblId) ||
      ''

    const indRes = await fetch(
      `${INDICATION_URL}?molecule_chembl_id=${chemblId}&limit=10`,
      fetchOptions
    )
    if (!indRes.ok) return []
    const indData = await indRes.json()

    return (indData.drug_indications ?? []).map((d: {
      drugind_id?: number | string
      mesh_heading?: string
      mesh_id?: string
      efo_term?: string
      efo_id?: string
      max_phase_for_ind?: number
    }) => {
      const meshId = d.mesh_id ?? ''
      const efoId = d.efo_id ?? ''
      const meshHeading = d.mesh_heading ?? ''
      const efoTerm = d.efo_term ?? ''
      return {
        indicationId: d.drugind_id != null ? String(d.drugind_id) : `${chemblId}-${meshId || efoId}`,
        moleculeName,
        moleculeChemblId: chemblId || undefined,
        condition: meshHeading || efoTerm || '',
        maxPhase: Number(d.max_phase_for_ind) || 0,
        maxPhaseForIndication: Number(d.max_phase_for_ind) || 0,
        meshId,
        meshHeading,
        efoId,
        efoTerm,
        url:
          moleculeIndUrl ||
          chemblIndicationDeepLink({
            moleculeChemblId: chemblId,
            meshId,
            efoId,
            condition: meshHeading || efoTerm,
          }),
      } satisfies ChemblIndication
    })
  } catch {
    return []
  }
}
