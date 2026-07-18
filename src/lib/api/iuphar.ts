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

function pickBestLigand(hits: LigandResult[], query: string): LigandResult | null {
  if (!hits.length) return null
  const q = query.trim().toLowerCase()
  // Prefer exact / starts-with name match over first hit (often a salt/analog)
  const exact = hits.find((h) => (h.name || '').toLowerCase() === q)
  if (exact) return exact
  const starts = hits.find((h) => (h.name || '').toLowerCase().startsWith(q))
  if (starts) return starts
  const includes = hits.find((h) => (h.name || '').toLowerCase().includes(q))
  if (includes) return includes
  // Prefer approved ligands when names are noisy
  const approved = hits.find((h) => h.approved)
  return approved || hits[0]
}

export async function getPharmacologyTargetsByName(name: string): Promise<PharmacologyTarget[]> {
  try {
    const q = name?.trim()
    if (!q || q.length < 2) return []

    const searchUrl = `${LIGANDS_URL}?search=${encodeURIComponent(q)}`
    const searchData = await fetchJsonWithSizeLimit<LigandResult[]>(searchUrl, {
      maxBytes: MAX_IUPHAR_BYTES,
      timeoutMs: 12000,
    })
    if (!searchData || !Array.isArray(searchData) || !searchData.length) return []

    // Try up to 3 best ligand matches until interactions exist
    const ordered = [
      pickBestLigand(searchData, q),
      ...searchData.filter((h) => h !== pickBestLigand(searchData, q)),
    ].filter(Boolean) as LigandResult[]

    const seenLigand = new Set<number>()
    for (const ligand of ordered.slice(0, 3)) {
      const ligandId = ligand.ligandId
      if (!ligandId || seenLigand.has(ligandId)) continue
      seenLigand.add(ligandId)

      const interactionsUrl = `${INTERACTIONS_URL}?ligandId=${ligandId}`
      const interactions = await fetchJsonWithSizeLimit<InteractionResult[]>(interactionsUrl, {
        maxBytes: MAX_IUPHAR_BYTES,
        timeoutMs: 12000,
      })
      if (!interactions || !Array.isArray(interactions) || interactions.length === 0) continue

      const ligandUrl = `https://www.guidetopharmacology.org/GRAC/LigandDisplayForward?ligandId=${ligandId}`

      return interactions.slice(0, 15).map((interaction) => {
        const affRaw = interaction.affinity
        let affinity: number | undefined
        if (affRaw != null && String(affRaw).trim() !== '') {
          const n = parseFloat(String(affRaw).split('-')[0].trim())
          affinity = Number.isFinite(n) ? n : undefined
        }
        return {
          targetId: String(interaction.targetId ?? ''),
          targetName: stripHtml(interaction.targetName || '') || `Target ${interaction.targetId}`,
          ligandName: interaction.ligandName || ligand.name || q,
          actionType: interaction.action || interaction.type || '',
          type: interaction.type || interaction.action || '',
          affinity,
          affinityUnit: interaction.affinityParameter || undefined,
          url: interaction.targetId
            ? `https://www.guidetopharmacology.org/GRAC/ObjectDisplayForward?objectId=${interaction.targetId}`
            : ligandUrl,
          primaryTarget: interaction.primaryTarget ?? false,
          species: interaction.targetSpecies || '',
        }
      })
    }
    return []
  } catch {
    return []
  }
}
