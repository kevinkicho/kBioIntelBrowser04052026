/**
 * Side-effect data for molecules.
 *
 * SIDER historically required downloading multi-MB TSV dumps (timeouts + cache issues).
 * We now derive side-effect labels from openFDA FAERS reaction terms for the drug name —
 * free, real-time, and size-bounded. Frequency strings are approximate (report counts).
 *
 * List-item `url` is either a stable per-effect deep link or omitted (never API docs shells).
 */
import type { SIDERSideEffect } from '../types'
import { getAdverseEventsByName } from './adverseevents'
import { isBrokenSourceShellUrl } from '../deepLinkPolicy'

/**
 * Official record-oriented deep link for a side-effect term, or null.
 * Prefer SIDER UMLS page when CUI known; else NCBI MedGen term search for the label.
 * Never returns openFDA API documentation URLs.
 */
export function siderSideEffectDeepLink(effect: {
  umlsCui?: string | null
  sideEffectId?: string | null
  sideEffectName?: string | null
  meddraTerm?: string | null
}): string | null {
  const cui = (effect.umlsCui || '').trim()
  if (/^C\d+$/i.test(cui)) {
    const href = `https://sideeffects.embl.de/se/${cui}/`
    return isBrokenSourceShellUrl(href) ? null : href
  }
  // sideEffectId sometimes stores a CUI
  const id = (effect.sideEffectId || '').trim()
  if (/^C\d+$/i.test(id)) {
    const href = `https://sideeffects.embl.de/se/${id}/`
    return isBrokenSourceShellUrl(href) ? null : href
  }

  const name = (effect.sideEffectName || effect.meddraTerm || '').trim()
  if (!name || /^unknown$/i.test(name)) return null

  // MedGen term page — free public concept search for the reaction label
  const href = `https://www.ncbi.nlm.nih.gov/medgen/?term=${encodeURIComponent(name)}`
  return isBrokenSourceShellUrl(href) ? null : href
}

export async function getSIDERData(drugName: string): Promise<{
  sideEffects: SIDERSideEffect[]
}> {
  try {
    if (!drugName?.trim()) return { sideEffects: [] }

    const events = await getAdverseEventsByName(drugName, 30)
    if (!events.length) return { sideEffects: [] }

    const total = events.reduce((s, e) => s + (e.count || 0), 0) || 1
    const sideEffects: SIDERSideEffect[] = events.map((e) => {
      const freq = e.count / total
      let frequency = 'unknown'
      if (freq >= 0.1) frequency = 'common'
      else if (freq >= 0.01) frequency = 'infrequent'
      else if (e.count > 0) frequency = 'rare'

      const name = e.reactionName || 'Unknown'
      const row: SIDERSideEffect = {
        drugName,
        drugId: '',
        sideEffectName: name,
        sideEffectId: name,
        meddraTerm: name,
        umlsCui: '',
        frequency: `${frequency} (~${e.count} reports)`,
        source: 'openFDA FAERS (SIDER-compatible)',
      }
      const deep = siderSideEffectDeepLink(row)
      if (deep) row.url = deep
      return row
    })

    return { sideEffects }
  } catch {
    return { sideEffects: [] }
  }
}
