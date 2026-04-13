import type { PharmacologyTarget } from '../types'
import { stripHtml } from '../utils'

const LIGANDS_URL = 'https://www.guidetopharmacology.org/services/ligands'
const INTERACTIONS_URL = 'https://www.guidetopharmacology.org/services/interactions'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }
const jsonHeaders = { Accept: 'application/json' }

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
    const searchRes = await fetch(searchUrl, { ...fetchOptions, headers: jsonHeaders })
    if (!searchRes.ok) return []

    const contentLength = searchRes.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 2 * 1024 * 1024) return []

    const searchData: LigandResult[] = await searchRes.json()
    if (!searchData.length) return []

    const ligand = searchData[0]
    const ligandId = ligand.ligandId
    if (!ligandId) return []

    const interactionsUrl = `${INTERACTIONS_URL}?ligandId=${ligandId}`
    const interactionsRes = await fetch(interactionsUrl, { ...fetchOptions, headers: jsonHeaders })
    if (!interactionsRes.ok) return []

    const interactionContentLength = interactionsRes.headers.get('content-length')
    if (interactionContentLength && parseInt(interactionContentLength) > 2 * 1024 * 1024) return []

    const interactions: InteractionResult[] = await interactionsRes.json()

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