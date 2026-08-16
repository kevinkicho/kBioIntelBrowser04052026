import type { ChemblMechanism } from '../types'
import {
  chemblCompoundUrl,
  chemblMechanismDeepLink,
  chemblTargetUrl,
  normalizeChemblId,
} from '../chemblLinks'
import { timedFetch } from './timedFetch'

const SEARCH_URL = 'https://www.ebi.ac.uk/chembl/api/data/molecule/search.json'
const MECHANISM_URL = 'https://www.ebi.ac.uk/chembl/api/data/mechanism.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * ChEMBL mechanisms harvest leaf. HTTP / HTML / timeout are not EMPTY.
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

export async function getChemblMechanismsByName(name: string, limit: number = 10): Promise<ChemblMechanism[]> {
  const q = name?.trim()
  if (!q) return []

  const searchRes = await timedFetch(
    `${SEARCH_URL}?q=${encodeURIComponent(q)}&limit=1`,
    { ...fetchOptions, timeoutMs: 8000 },
  )
  throwIfHttpFailed(searchRes, 'ChEMBL (mechanisms)')
  const searchData = await searchRes.json()
  const molecules = searchData.molecules ?? []
  if (molecules.length === 0) return []
  const chemblId = normalizeChemblId(molecules[0].molecule_chembl_id) || molecules[0].molecule_chembl_id
  const moleculeName = molecules[0].pref_name || name

  const mechRes = await timedFetch(
    `${MECHANISM_URL}?molecule_chembl_id=${chemblId}&limit=${limit}`,
    { ...fetchOptions, timeoutMs: 8000 },
  )
  throwIfHttpFailed(mechRes, 'ChEMBL (mechanisms)')
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
}

export { chemblCompoundUrl, chemblTargetUrl }
