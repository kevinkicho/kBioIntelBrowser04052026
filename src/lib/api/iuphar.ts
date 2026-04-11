import type { PharmacologyTarget } from '../types'

const SEARCH_BASE = 'https://www.guidetopharmacology.org/services/search'
const LIGANDS_BASE = 'https://www.guidetopharmacology.org/services/ligands'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }
const jsonHeaders = { Accept: 'application/json' }

export async function getPharmacologyTargetsByName(name: string): Promise<PharmacologyTarget[]> {
  try {
    const searchUrl = `${SEARCH_BASE}?query=${encodeURIComponent(name)}&type=ligand`
    const searchRes = await fetch(searchUrl, { ...fetchOptions, headers: jsonHeaders })
    if (!searchRes.ok) return []
    const searchData: { ligandId?: number; name?: string }[] = await searchRes.json()
    if (!searchData.length) return []

    const ligandId = searchData[0].ligandId
    if (!ligandId) return []

    const interactionsUrl = `${LIGANDS_BASE}/${ligandId}/interactions`
    const interactionsRes = await fetch(interactionsUrl, { ...fetchOptions, headers: jsonHeaders })
    if (!interactionsRes.ok) return []
    const interactions: {
      targetName?: string
      type?: string | null
      action?: string | null
      affinity_median?: number | null
      affinity_units?: string | null
      species?: string
      primaryTarget?: boolean
    }[] = await interactionsRes.json()

    const ligandUrl = `https://www.guidetopharmacology.org/GRAC/LigandDisplayForward?ligandId=${ligandId}`

    return interactions.slice(0, 10).map(interaction => {
      const affinityType = interaction.type ?? interaction.action ?? ''
      const affinityNum = interaction.affinity_median
      const affinityUnits = interaction.affinity_units

      return {
        targetId: '',
        targetName: interaction.targetName ?? '',
        ligandName: searchData[0]?.name ?? '',
        actionType: affinityType,
        type: affinityType,
        affinity: affinityNum ?? undefined,
        affinityUnit: affinityUnits ?? undefined,
        species: interaction.species ?? '',
        primaryTarget: interaction.primaryTarget ?? false,
        url: ligandUrl,
      }
    })
  } catch {
    return []
  }
}
