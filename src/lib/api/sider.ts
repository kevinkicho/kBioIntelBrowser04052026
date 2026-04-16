import type { SIDERSideEffect } from '../types'

const fetchOptions: RequestInit = { next: { revalidate: 604800 } }

const SIDER_BASE = 'http://sideeffects.embl.de'

async function resolveCidToStitchIds(drugName: string): Promise<{ cidm: string; cids: string } | null> {
  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(drugName)}/cids/JSON`,
      fetchOptions
    )
    if (!res.ok) return null
    const data = await res.json()
    const cid = data?.IdentifierList?.CID?.[0]
    if (!cid) return null
    return { cidm: `CIDm${cid.toString().padStart(9, '0')}`, cids: `CIDs${cid.toString().padStart(9, '0')}` }
  } catch {
    return null
  }
}

async function fetchSiderMeddra(stitchId: string): Promise<Array<{ stitchId: string; umlsCui: string; meddraType: string; meddraName: string; frequency: string }>> {
  try {
    const url = `${SIDER_BASE}/download/side_effect_meddra_freq.tsv`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const text = await res.text()
    const results: Array<{ stitchId: string; umlsCui: string; meddraType: string; meddraName: string; frequency: string }> = []
    const lines = text.split('\n')
    const header = lines[0]?.split('\t') ?? []
    const colIdx = {
      stitchId: header.indexOf('stitch_id'),
      umlsCui: header.indexOf('umls_cui'),
      meddraType: header.indexOf('meddra_type'),
      sideEffectName: header.indexOf('side_effect_name'),
      frequency: header.indexOf('frequency'),
    }
    if (colIdx.stitchId === -1) {
      const altIdx = {
        stitchId: header.indexOf('STITCH ID') !== -1 ? header.indexOf('STITCH ID') : header.indexOf('stitch_id'),
        umlsCui: header.indexOf('UMLS CUI') !== -1 ? header.indexOf('UMLS CUI') : 0,
        meddraType: header.indexOf('MedDRA type') !== -1 ? header.indexOf('MedDRA type') : (header.length > 3 ? 3 : -1),
        sideEffectName: header.indexOf('Side effect name') !== -1 ? header.indexOf('Side effect name') : (header.length > 4 ? 4 : -1),
        frequency: header.indexOf('frequency') !== -1 ? header.indexOf('frequency') : (header.length > 5 ? 5 : -1),
      }
      Object.assign(colIdx, altIdx)
    }
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue
      const cols = line.split('\t')
      if (cols[colIdx.stitchId] === stitchId) {
        results.push({
          stitchId: cols[colIdx.stitchId] ?? '',
          umlsCui: cols[colIdx.umlsCui] ?? '',
          meddraType: cols[colIdx.meddraType] ?? '',
          meddraName: cols[colIdx.sideEffectName] ?? '',
          frequency: cols[colIdx.frequency] ?? '',
        })
      }
      if (results.length >= 50) break
    }
    return results
  } catch {
    return []
  }
}

async function fetchSiderSideEffects(stitchId: string): Promise<Array<{ stitchId: string; umlsCui: string; sideEffectName: string }>> {
  try {
    const url = `${SIDER_BASE}/download/side_effects.tsv`
    const res = await fetch(url, fetchOptions)
    if (!res.ok) return []
    const text = await res.text()
    const results: Array<{ stitchId: string; umlsCui: string; sideEffectName: string }> = []
    const lines = text.split('\n')
    const header = lines[0]?.split('\t') ?? []
    const colIdx = {
      stitchId: header.indexOf('stitch_id'),
      umlsCui: header.indexOf('umls_cui'),
      sideEffectName: header.indexOf('side_effect_name'),
    }
    if (colIdx.stitchId === -1) {
      const altIdx = {
        stitchId: header.indexOf('STITCH ID') !== -1 ? header.indexOf('STITCH ID') : 0,
        umlsCui: header.indexOf('UMLS CUI') !== -1 ? header.indexOf('UMLS CUI') : 1,
        sideEffectName: header.indexOf('Side effect name') !== -1 ? header.indexOf('Side effect name') : (header.length > 2 ? 2 : -1),
      }
      Object.assign(colIdx, altIdx)
    }
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue
      const cols = line.split('\t')
      if (cols[colIdx.stitchId] === stitchId) {
        results.push({
          stitchId: cols[colIdx.stitchId] ?? '',
          umlsCui: cols[colIdx.umlsCui] ?? '',
          sideEffectName: cols[colIdx.sideEffectName] ?? '',
        })
      }
      if (results.length >= 50) break
    }
    return results
  } catch {
    return []
  }
}

export async function getSIDERData(drugName: string): Promise<{
  sideEffects: SIDERSideEffect[]
}> {
  try {
    const stitchIds = await resolveCidToStitchIds(drugName)
    if (!stitchIds) return { sideEffects: [] }

    const [meddraEffects, basicEffects] = await Promise.all([
      fetchSiderMeddra(stitchIds.cidm).catch(() => []),
      fetchSiderSideEffects(stitchIds.cidm).catch(() => []),
    ])

    const seen = new Set<string>()
    const sideEffects: SIDERSideEffect[] = []

    for (const me of meddraEffects) {
      if (me.meddraType === 'llt' && me.umlsCui) {
        if (seen.has(me.umlsCui)) continue
        seen.add(me.umlsCui)
        sideEffects.push({
          drugName,
          drugId: me.stitchId,
          sideEffectName: me.meddraName || me.umlsCui,
          sideEffectId: me.umlsCui,
          meddraTerm: me.meddraName,
          umlsCui: me.umlsCui,
          frequency: me.frequency || '',
          source: 'SIDER',
          url: `https://sideeffects.embl.de/drugs/${stitchIds.cidm}/`,
        })
      }
    }

    for (const be of basicEffects) {
      const key = be.umlsCui || be.sideEffectName
      if (seen.has(key)) continue
      seen.add(key)
      sideEffects.push({
        drugName,
        drugId: be.stitchId,
        sideEffectName: be.sideEffectName || be.umlsCui,
        sideEffectId: be.umlsCui || key,
        meddraTerm: be.sideEffectName,
        umlsCui: be.umlsCui,
        frequency: '',
        source: 'SIDER',
        url: `https://sideeffects.embl.de/drugs/${stitchIds.cidm}/`,
      })
    }

    return { sideEffects: sideEffects.slice(0, 30) }
  } catch {
    return { sideEffects: [] }
  }
}

export async function searchSideEffects(drugName: string): Promise<SIDERSideEffect[]> {
  const data = await getSIDERData(drugName)
  return data.sideEffects
}

export async function getSideEffectsByStitchId(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _stitchId: string
): Promise<SIDERSideEffect[]> {
  return []
}