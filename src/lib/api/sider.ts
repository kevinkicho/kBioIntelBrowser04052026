import type { SIDERSideEffect } from '../types'

const BASE_URL = 'http://sideeffects.embl.de'
const fetchOptions: RequestInit = { next: { revalidate: 604800 } } // 7 days

/**
 * Search SIDER for drug side effects by drug name
 */
export async function searchSideEffects(drugName: string): Promise<SIDERSideEffect[]> {
  try {
    // SIDER provides download files, but we can query via API
    const url = `${BASE_URL}/api/drugs?name=${encodeURIComponent(drugName)}`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? []).slice(0, 30).map((item: Record<string, unknown>) => ({
      drugName: item.drug_name as string ?? '',
      drugId: item.drug_id as string ?? '',
      sideEffectName: item.side_effect_name as string ?? '',
      sideEffectId: item.side_effect_id as string ?? '',
      frequency: item.frequency as string ?? '',
      meddraTerm: item.meddra_term as string ?? '',
      umlsCui: item.umls_cui as string ?? '',
      source: 'SIDER',
      url: `${BASE_URL}/drugs/${item.drug_id}`
    }))
  } catch {
    return []
  }
}

/**
 * Get side effects by STITCH compound ID
 */
export async function getSideEffectsByStitchId(stitchId: string): Promise<SIDERSideEffect[]> {
  try {
    const url = `${BASE_URL}/api/compounds/${stitchId}/side_effects`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const data = await res.json()

    return (data.side_effects ?? []).slice(0, 30).map((item: Record<string, unknown>) => ({
      drugName: '',
      drugId: stitchId,
      sideEffectName: item.side_effect_name as string ?? '',
      sideEffectId: item.side_effect_id as string ?? '',
      frequency: item.frequency as string ?? '',
      meddraTerm: item.meddra_term as string ?? '',
      umlsCui: item.umls_cui as string ?? '',
      source: 'SIDER',
      url: `${BASE_URL}/compounds/${stitchId}`
    }))
  } catch {
    return []
  }
}

/**
 * Main export: Get SIDER data for a drug
 */
export async function getSIDERData(drugName: string): Promise<{
  sideEffects: SIDERSideEffect[]
}> {
  const sideEffects = await searchSideEffects(drugName)

  return {
    sideEffects: sideEffects.slice(0, 20)
  }
}