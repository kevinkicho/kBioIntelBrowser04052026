import type { PharmacologyTarget } from '../types'
import { stripHtml } from '../utils'
import { fetchJsonWithSizeLimit } from './fetchJsonWithSizeLimit'

const LIGANDS_URL = 'https://www.guidetopharmacology.org/services/ligands'
const INTERACTIONS_URL = 'https://www.guidetopharmacology.org/services/interactions'

// Guide to Pharmacology can return multi-MB ligand/interaction payloads that
// exceed Next.js Data Cache (2MB). Always use size-capped no-store fetch.
const MAX_IUPHAR_BYTES = 2 * 1024 * 1024

interface LigandResult {
  ligandId: number
  name: string
  type: string
  approved: boolean
}

interface InteractionResult {
  targetId: number
  targetName: string
  targetSpecies: string
  ligandId: number
  ligandName: string
  type: string | null
  action: string | null
  selectivity: string | null
  affinity: string | null
  affinityParameter: string | null
  primaryTarget: boolean
  refIds: number[]
}

export async function getPharmacologyTargetsByName(name: string): Promise<PharmacologyTarget[]> {
  try {
    const searchUrl = `${LIGANDS_URL}?search=${encodeURIComponent(name)}`
    const searchData = await fetchJsonWithSizeLimit<LigandResult[]>(searchUrl, {
      maxBytes: MAX_IUPHAR_BYTES,
      timeoutMs: 12000,
    })
    if (!searchData || !Array.isArray(searchData) || !searchData.length) return []

    const ligand = searchData[0]
    const ligandId = ligand.ligandId
    if (!ligandId) return []

    const interactionsUrl = `${INTERACTIONS_URL}?ligandId=${ligandId}`
    const interactions = await fetchJsonWithSizeLimit<InteractionResult[]>(interactionsUrl, {
      maxBytes: MAX_IUPHAR_BYTES,
      timeoutMs: 12000,
    })
    if (!interactions || !Array.isArray(interactions)) return []

    const ligandUrl = `https://www.guidetopharmacology.org/GRAC/LigandDisplayForward?ligandId=${ligandId}`

    return interactions.slice(0, 10).map((interaction) => ({
      targetId: String(interaction.targetId),
      targetName: stripHtml(interaction.targetName || ''),
      ligandName: interaction.ligandName || ligand.name || '',
      actionType: interaction.type || interaction.action || '',
      type: interaction.type || '',
      affinity: interaction.affinity ? parseFloat(interaction.affinity.split('-')[0].trim()) : undefined,
      affinityUnit: interaction.affinityParameter || undefined,
      url: ligandUrl,
      primaryTarget: interaction.primaryTarget ?? false,
      species: interaction.targetSpecies || '',
    }))
  } catch {
    return []
  }
}
