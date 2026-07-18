/**
 * DrugCentral API Client
 * 
 * Direct API access to DrugCentral (https://drugcentral.org/)
 * Provides drug indications, targets, ATC codes, and more.
 */

import type { DrugCentralDrug, DrugCentralTarget } from '../types'

const BASE_URL = 'https://drugcentral.org/api/v1'
const fetchOptions: RequestInit = { next: { revalidate: 86400 } }

export interface DrugCentralEnhanced {
  drug: DrugCentralDrug | null
  targets: DrugCentralTarget[]
  indications: string[]
  pharmacologicActions: string[]
  atcCodes: string[]
  manufacturers: string[]
  products: DrugCentralProduct[]
}

export interface DrugCentralProduct {
  id: number
  name: string
  form: string
  route: string
  marketingStartDate: string
}

export async function getDrugCentralData(
  name: string,
  opts?: { drugbankId?: string | null; inchiKey?: string | null },
): Promise<{
  drug: DrugCentralDrug | null
  targets: DrugCentralTarget[]
}> {
  try {
    // Identity-first: DrugBank id or InChIKey before free-text name
    const identityQueries = [
      opts?.drugbankId?.trim(),
      opts?.inchiKey?.trim(),
      name?.trim(),
    ].filter(Boolean) as string[]

    let firstResult: Record<string, unknown> | null = null
    for (const q of identityQueries) {
      const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(q)}`
      const searchRes = await fetch(searchUrl, fetchOptions)
      if (!searchRes.ok) continue
      const searchData = await searchRes.json()
      const hit = Array.isArray(searchData) ? searchData[0] : searchData?.results?.[0]
      if (hit) {
        firstResult = hit as Record<string, unknown>
        break
      }
    }
    if (!firstResult) return { drug: null, targets: [] }

    const drugId = firstResult.id || firstResult.STRUCT_ID || firstResult.inchikey
    if (!drugId) return { drug: null, targets: [] }

    const detailUrl = `${BASE_URL}/drug/${drugId}`
    const detailRes = await fetch(detailUrl, fetchOptions)
    if (!detailRes.ok) {
      const drug: DrugCentralDrug = {
        id: typeof drugId === 'number' ? drugId : 0,
        name: String(firstResult.name || name || ''),
        synonym: [],
        indication: [],
        actionType: [],
        routes: [],
        faers: [],
        targets: [],
        atcCodes: [],
      }
      return { drug, targets: [] }
    }
    const detailData = await detailRes.json()

    const indications: string[] = Array.isArray(detailData.indications)
      ? detailData.indications.map((i: Record<string, unknown>) => i.indication_name || i.indication || String(i)).filter(Boolean)
      : []

    const actionTypes: string[] = Array.isArray(detailData.actions)
      ? detailData.actions.map((a: Record<string, unknown>) => a.action_type || a.action || String(a)).filter(Boolean)
      : []

    const atcCodes: string[] = Array.isArray(detailData.atc)
      ? detailData.atc.map((a: Record<string, unknown>) => a.code || a.atc_code || String(a)).filter(Boolean)
      : []

    const targets: DrugCentralTarget[] = Array.isArray(detailData.targets)
      ? detailData.targets.map((t: Record<string, unknown>, idx: number) => ({
          targetId: idx,
          targetName: t.target_name || t.gene || String(t),
          geneSymbol: t.gene || '',
          uniprotId: t.accession || t.uniprot || '',
          actionType: t.action_type || t.action || 'unknown',
          actionCode: t.action_code || '',
          drugId: typeof drugId === 'number' ? drugId : 0,
        }))
      : []

    const drug: DrugCentralDrug = {
      id: typeof drugId === 'number' ? drugId : 0,
      name: detailData.name || firstResult.name || name,
      synonym: Array.isArray(detailData.synonyms) ? detailData.synonyms.map((s: Record<string, unknown>) => s.synonym || String(s)) : [],
      indication: indications,
      actionType: actionTypes,
      routes: [],
      faers: [],
      targets,
      atcCodes,
    }

    return { drug, targets }
  } catch {
    return { drug: null, targets: [] }
  }
}

export async function getDrugCentralEnhanced(
  name: string,
  opts?: { drugbankId?: string | null; inchiKey?: string | null },
): Promise<DrugCentralEnhanced | null> {
  const { drug, targets } = await getDrugCentralData(name, opts)

  if (!drug) return null

  return {
    drug,
    targets,
    indications: drug.indication,
    pharmacologicActions: drug.actionType,
    atcCodes: drug.atcCodes,
    manufacturers: [],
    products: [],
  }
}

export async function getDrugsByTarget(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _targetIdentifier: string
): Promise<DrugCentralDrug[]> {
  return []
}