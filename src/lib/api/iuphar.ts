import type { PharmacologyTarget } from '../types'
import { stripHtml } from '../utils'
import { timedFetch } from './timedFetch'

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

/**
 * IUPHAR harvest leaf. HTTP / HTML / timeout / oversize are not EMPTY.
 * True zero-hit JSON remains [].
 */
function throwIfHttpFailed(res: Response, source: string): void {
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  const contentType = (res.headers?.get?.('content-type') || '').toLowerCase()
  if (contentType.includes('text/html')) {
    throw new Error(`HTML response from ${source}`)
  }
}

async function fetchIupharJson<T>(url: string): Promise<T> {
  const res = await timedFetch(url, {
    timeoutMs: 15000,
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  throwIfHttpFailed(res, 'IUPHAR')

  const contentLength = res.headers?.get?.('content-length')
  if (contentLength) {
    const len = parseInt(contentLength, 10)
    if (!Number.isNaN(len) && len > MAX_IUPHAR_BYTES) {
      throw new Error('IUPHAR response too large')
    }
  }

  const text = await res.text()
  if (text.length > MAX_IUPHAR_BYTES) {
    throw new Error('IUPHAR response too large')
  }

  const trimmed = text.trimStart()
  if (!trimmed || trimmed.startsWith('<')) {
    throw new Error('HTML response from IUPHAR')
  }

  return JSON.parse(text) as T
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
  const q = name?.trim()
  if (!q || q.length < 2) return []

  // Prefer exact name= (search= returns huge unranked dumps)
  let hits = await fetchIupharJson<LigandResult[]>(
    `${LIGANDS_URL}?name=${encodeURIComponent(q)}`,
  )

  if (!Array.isArray(hits) || hits.length === 0) {
    hits = await fetchIupharJson<LigandResult[]>(
      `${LIGANDS_URL}?search=${encodeURIComponent(q)}`,
    )
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
    let interactions = await fetchIupharJson<InteractionResult[]>(
      `${LIGANDS_URL}/${ligandId}/interactions`,
    )

    if (!Array.isArray(interactions) || interactions.length === 0) {
      interactions = await fetchIupharJson<InteractionResult[]>(
        `https://www.guidetopharmacology.org/services/interactions?ligandId=${ligandId}`,
      )
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
}
