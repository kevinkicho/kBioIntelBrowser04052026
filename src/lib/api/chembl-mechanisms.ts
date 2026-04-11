import type { ChemblMechanism } from '../types'

const SEARCH_URL = 'https://www.ebi.ac.uk/chembl/api/data/molecule/search.json'
const MECHANISM_URL = 'https://www.ebi.ac.uk/chembl/api/data/mechanism.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getChemblMechanismsByName(name: string): Promise<ChemblMechanism[]> {
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

    const mechRes = await fetch(
      `${MECHANISM_URL}?molecule_chembl_id=${chemblId}&limit=10`,
      fetchOptions
    )
    if (!mechRes.ok) return []
    const mechData = await mechRes.json()

    return (mechData.mechanisms ?? []).map((m: {
      mechanism_of_action?: string
      action_type?: string
      target_chembl_id?: string
      max_phase?: number
      direct_interaction?: boolean
    }) => {
      const targetChemblId = m.target_chembl_id ?? ''
      return {
        mechanismOfAction: m.mechanism_of_action ?? '',
        actionType: m.action_type ?? '',
        targetChemblId,
        maxPhase: Number(m.max_phase) || 0,
        directInteraction: Boolean(m.direct_interaction),
        url: `https://www.ebi.ac.uk/chembl/target_report_card/${targetChemblId}/`,
      }
    })
  } catch {
    return []
  }
}
