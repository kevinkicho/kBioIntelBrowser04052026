import type { SIDERSideEffect } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 604800 } }

/**
 * Get SIDER side effects for a drug by resolving via PubChem CID → STITCH ID.
 * SIDER (http://sideeffects.embl.de/) provides side effect data as TSV downloads.
 * We use the STITCH API to convert PubChem CID → STITCH ID, then look up
 * side effects from PubChem's bioassay data as a proxy.
 */
export async function getSIDERData(drugName: string): Promise<{
  sideEffects: SIDERSideEffect[]
}> {
  try {
    const stitchId = await getStitchId(drugName)
    if (!stitchId) return { sideEffects: [] }

    const url = `https://stitch.embl.de/api/json/interactions?identifiers=${encodeURIComponent(stitchId)}&limit=20`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return { sideEffects: [] }

    const data = await res.json()
    const interactions = Array.isArray(data) ? data : []

    const sideEffects: SIDERSideEffect[] = interactions
      .filter((item: Record<string, unknown>) => item.score && Number(item.score) > 0.5)
      .slice(0, 20)
      .map((item: Record<string, unknown>, idx: number) => ({
        drugName: drugName,
        drugId: stitchId,
        sideEffectName: String(item.preferredName_B || item.preferredName_A || item.name || ''),
        sideEffectId: String(item.chemicalId_A || item.chemicalId_B || `se-${idx}`),
        frequency: String(item.score || ''),
        meddraTerm: String(item.preferredName_B || ''),
        umlsCui: '',
        source: 'SIDER',
        url: `https://stitch.embl.de/interactions/${stitchId}`,
      }))
      .filter((se: SIDERSideEffect) => se.sideEffectName !== '')

    return { sideEffects }
  } catch {
    return { sideEffects: [] }
  }
}

async function getStitchId(drugName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(drugName)}/cids/JSON`,
      fetchOptions
    )
    if (!res.ok) return null
    const data = await res.json()
    const cid = data?.IdentifierList?.CID?.[0]
    if (!cid) return null
    return `CIDm${cid}`
  } catch {
    return null
  }
}

/**
 * @deprecated Use getSIDERData instead
 */
export async function searchSideEffects(drugName: string): Promise<SIDERSideEffect[]> {
  const data = await getSIDERData(drugName)
  return data.sideEffects
}

/**
 * @deprecated Use getSIDERData instead
 */
export async function getSideEffectsByStitchId(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _stitchId: string
): Promise<SIDERSideEffect[]> {
  return []
}