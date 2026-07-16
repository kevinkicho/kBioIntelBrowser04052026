/**
 * Side-effect data for molecules.
 *
 * SIDER historically required downloading multi-MB TSV dumps (timeouts + cache issues).
 * We now derive side-effect labels from openFDA FAERS reaction terms for the drug name —
 * free, real-time, and size-bounded. Frequency strings are approximate (report counts).
 */
import type { SIDERSideEffect } from '../types'
import { getAdverseEventsByName } from './adverseevents'

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
      return {
        drugName,
        drugId: '',
        sideEffectName: name,
        sideEffectId: name,
        meddraTerm: name,
        umlsCui: '',
        frequency: `${frequency} (~${e.count} reports)`,
        source: 'openFDA FAERS (SIDER-compatible)',
        url: 'https://open.fda.gov/apis/drug/event/',
      }
    })

    return { sideEffects }
  } catch {
    return { sideEffects: [] }
  }
}
