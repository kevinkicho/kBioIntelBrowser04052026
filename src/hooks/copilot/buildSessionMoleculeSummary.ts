/**
 * Shared session → SessionMoleculeSummary mapping for insight / ask hooks.
 */

import { extractRichData } from '@/lib/ai/copilot/context'
import type { SessionMoleculeSummary } from '@/lib/ai/copilot/prompts'
import { sessionHistory } from '@/lib/sessionHistory'

export function sessionMoleculeToSummary(name: string): SessionMoleculeSummary | null {
  const sm = sessionHistory.getMolecule(name)
  if (!sm) return null
  const rd = extractRichData(sm.drugData)
  return {
    name: sm.name,
    searchedAt: sm.searchedAt,
    topTargets: rd.topTargetActivities.slice(0, 5).map((t) => t.targetName),
    topAEs: rd.topAdverseEvents.slice(0, 5).map((ae) => ae.reactionName),
    mechanisms: rd.mechanismDetails
      .slice(0, 3)
      .map((m) => `${m.mechanismOfAction} -> ${m.targetName}`),
    indications: rd.indicationDetails.slice(0, 5).map((i) => i.condition),
  }
}

export function recentSessionSummaries(
  excludeName: string,
  limit = 5,
): SessionMoleculeSummary[] {
  return sessionHistory
    .getRecentMolecules(limit)
    .filter((m) => m.name !== excludeName)
    .map((m) => {
      const rd = extractRichData(m.drugData)
      return {
        name: m.name,
        searchedAt: m.searchedAt,
        topTargets: rd.topTargetActivities.slice(0, 5).map((t) => t.targetName),
        topAEs: rd.topAdverseEvents.slice(0, 5).map((ae) => ae.reactionName),
        mechanisms: rd.mechanismDetails
          .slice(0, 3)
          .map((mech) => `${mech.mechanismOfAction} -> ${mech.targetName}`),
        indications: rd.indicationDetails.slice(0, 5).map((i) => i.condition),
      }
    })
}
