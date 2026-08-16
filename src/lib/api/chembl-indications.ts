import type { ChemblIndication } from '../types'
import {
  chemblCompoundIndicationsUrl,
  chemblCompoundUrl,
  chemblIndicationDeepLink,
  normalizeChemblId,
} from '../chemblLinks'
import { timedFetch } from './timedFetch'

const SEARCH_URL = 'https://www.ebi.ac.uk/chembl/api/data/molecule/search.json'
const INDICATION_URL = 'https://www.ebi.ac.uk/chembl/api/data/drug_indication.json'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

/**
 * ChEMBL indications harvest leaf. HTTP / HTML / timeout are not EMPTY.
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

export async function getChemblIndicationsByName(name: string): Promise<ChemblIndication[]> {
  const q = name?.trim()
  if (!q) return []

  const searchRes = await timedFetch(
    `${SEARCH_URL}?q=${encodeURIComponent(q)}&limit=1`,
    { ...fetchOptions, timeoutMs: 8000 },
  )
  throwIfHttpFailed(searchRes, 'ChEMBL (indications)')
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

  const indRes = await timedFetch(
    `${INDICATION_URL}?molecule_chembl_id=${chemblId}&limit=10`,
    { ...fetchOptions, timeoutMs: 8000 },
  )
  throwIfHttpFailed(indRes, 'ChEMBL (indications)')
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
}