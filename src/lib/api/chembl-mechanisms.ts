import type { ChemblMechanism } from '../types'
import {
  chemblCompoundUrl,
  chemblMechanismDeepLink,
  chemblTargetUrl,
  normalizeChemblId,
} from '../chemblLinks'

const SEARCH_URL = 'https://www.ebi.ac.uk/chembl/api/data/molecule/search.json'
const MECHANISM_URL = 'https://www.ebi.ac.uk/chembl/api/data/mechanism.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export async function getChemblMechanismsByName(name: string, limit: number = 10): Promise<ChemblMechanism[]> {
  try {
    const searchRes = await fetch(
      `${SEARCH_URL}?q=${encodeURIComponent(name)}&limit=1`,
      fetchOptions
    )
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const molecules = searchData.molecules ?? []
    if (molecules.length === 0) return []
    const chemblId = normalizeChemblId(molecules[0].molecule_chembl_id) || molecules[0].molecule_chembl_id
    const moleculeName = molecules[0].pref_name || name

    const mechRes = await fetch(
      `${MECHANISM_URL}?molecule_chembl_id=${chemblId}&limit=${limit}`,
      fetchOptions
    )
    if (!mechRes.ok) return []
    const mechData = await mechRes.json()

    return (mechData.mechanisms ?? []).map((m: {
      mec_id?: number | string
      mechanism_of_action?: string
      action_type?: string
      target_chembl_id?: string
      target_name?: string
      max_phase?: number
      direct_interaction?: boolean
      disease_efficacy?: boolean
    }) => {
      const targetChemblId = normalizeChemblId(m.target_chembl_id) || m.target_chembl_id || ''
      return {
        mechanismId: m.mec_id != null ? String(m.mec_id) : undefined,
        moleculeName,
        targetName: m.target_name ?? '',
        targetChemblId,
        actionType: m.action_type ?? '',
        mechanismOfAction: m.mechanism_of_action ?? '',
        directInteraction: Boolean(m.direct_interaction),
        diseaseEfficacy: Boolean(m.disease_efficacy),
        maxPhase: Number(m.max_phase) || 0,
        // Direct report card: target first, else molecule (never empty /target_report_card//)
        url: chemblMechanismDeepLink({
          targetChemblId,
          moleculeChemblId: chemblId,
        }),
      } satisfies ChemblMechanism
    })
  } catch {
    return []
  }
}

export { chemblCompoundUrl, chemblTargetUrl }
