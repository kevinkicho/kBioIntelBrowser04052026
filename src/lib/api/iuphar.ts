import type { PharmacologyTarget } from '../types'
import { stripHtml } from '../utils'
import { fetchJsonWithSizeLimit } from './fetchJsonWithSizeLimit'

const LIGANDS_URL = 'https://www.guidetopharmacology.org/services/ligands'
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
  const exact = hits.find((h) => (h.name || '').toLowerCase() === q)
  if (exact) return exact
  const starts = hits.find((h) => (h.name || '').toLowerCase().startsWith(q))
  if (starts) return starts
  const includes = hits.find((h) => (h.name || '').toLowerCase().includes(q))
  if (includes) return includes
  const approved = hits.find((h) => h.approved)
  return approved || hits[0]
}

function mapInteractions(
  interactions: InteractionResult[],
  ligand: LigandResult,
  q: string,
): PharmacologyTarget[] {
  const ligandUrl = `https://www.guidetopharmacology.org/GRAC/LigandDisplayForward?ligandId=${ligand.ligandId}`
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

export async function getPharmacologyTargetsByName(name: string): Promise<PharmacologyTarget[]> {
  try {
    const q = name?.trim()
    if (!q || q.length < 2) return []

    // Prefer exact name= (search= returns huge unranked dumps)
    let hits =
      (await fetchJsonWithSizeLimit<LigandResult[]>(
        `${LIGANDS_URL}?name=${encodeURIComponent(q)}`,
        { maxBytes: MAX_IUPHAR_BYTES, timeoutMs: 15000 },
      )) || []

    if (!Array.isArray(hits) || hits.length === 0) {
      hits =
        (await fetchJsonWithSizeLimit<LigandResult[]>(
          `${LIGANDS_URL}?search=${encodeURIComponent(q)}`,
          { maxBytes: MAX_IUPHAR_BYTES, timeoutMs: 15000 },
        )) || []
    }
    if (!Array.isArray(hits) || hits.length === 0) return []

    const ordered = [
      pickBestLigand(hits, q),
      ...hits.filter((h) => h !== pickBestLigand(hits, q)),
    ].filter(Boolean) as LigandResult[]

    const seenLigand = new Set<number>()
    for (const ligand of ordered.slice(0, 3)) {
      const ligandId = ligand.ligandId
      if (!ligandId || seenLigand.has(ligandId)) continue
      seenLigand.add(ligandId)

      // Path form filters correctly; ?ligandId= often ignores filter
      let interactions =
        (await fetchJsonWithSizeLimit<InteractionResult[]>(
          `${LIGANDS_URL}/${ligandId}/interactions`,
          { maxBytes: MAX_IUPHAR_BYTES, timeoutMs: 15000 },
        )) || []

      if (!Array.isArray(interactions) || interactions.length === 0) {
        interactions =
          (await fetchJsonWithSizeLimit<InteractionResult[]>(
            `https://www.guidetopharmacology.org/services/interactions?ligandId=${ligandId}`,
            { maxBytes: MAX_IUPHAR_BYTES, timeoutMs: 15000 },
          )) || []
        // If query-param form returned foreign ligands, filter client-side
        if (Array.isArray(interactions) && interactions.length > 0) {
          const filtered = interactions.filter((i) => i.ligandId === ligandId)
          if (filtered.length > 0) interactions = filtered
          else if (interactions[0]?.ligandId !== ligandId) interactions = []
        }
      }

      if (!Array.isArray(interactions) || interactions.length === 0) continue
      return mapInteractions(interactions, ligand, q)
    }
    return []
  } catch {
    return []
  }
}
