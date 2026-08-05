/**
 * One-click golden path applicator (prefs + href + session payload).
 * Pure where possible; localStorage writes are explicit side effects.
 */

import type { GoldenPath } from './goldenPaths'
import {
  loadDiscoveryPreferences,
  saveDiscoveryPreferences,
  type DiscoveryPreferences,
} from '@/lib/discovery/preferences'
import { saveDiscoverSession } from '@/lib/discovery/discoverSessions'
import { saveLastCampaignPath } from '@/lib/campaign/lastCampaignPath'
import type { CampaignPersona } from '@/lib/campaign/campaignWorkspace'

export interface ApplyGoldenPathResult {
  discoverHref: string
  prefs: DiscoveryPreferences
  sessionId: string | null
  label: string
}

/**
 * Map golden persona → discovery prefs that raise finish rate for that beachhead.
 */
export function prefsForGoldenPath(
  path: GoldenPath,
  base?: DiscoveryPreferences,
): DiscoveryPreferences {
  const cur = base ?? loadDiscoveryPreferences()
  const next: DiscoveryPreferences = {
    ...cur,
    updatedAt: new Date().toISOString(),
  }
  if (path.persona === 'rare-disease') {
    next.rareDiseaseBoost = true
    next.tourExampleSet = 'rare-only'
    next.aeAggressiveness = 'soft-flag'
    next.mustHitPinnedTargets = path.targets.length > 0
    next.discoverMode = path.targets.length > 0 ? 'gene-led' : cur.discoverMode
  } else if (path.persona === 'competitive') {
    next.tourExampleSet = 'common-only'
    next.mustHitPinnedTargets = path.targets.length > 0
    next.discoverMode = path.targets.length > 0 ? 'gene-led' : 'molecule'
  } else if (path.persona === 'lab-affiliation') {
    next.tourExampleSet = 'mixed'
  } else {
    // repurposing default beachhead
    next.tourExampleSet = 'mixed'
    next.rareDiseaseBoost = false
    next.discoverMode = path.targets.length > 0 ? cur.discoverMode : 'molecule'
    if (path.targets.length > 0) {
      next.mustHitPinnedTargets = true
    }
  }
  return next
}

/**
 * Apply golden path: write prefs, last campaign, optional discover session.
 * Caller navigates to result.discoverHref.
 */
export function applyGoldenPath(
  path: GoldenPath,
  opts?: { saveSession?: boolean },
): ApplyGoldenPathResult {
  const prefs = prefsForGoldenPath(path)
  saveDiscoveryPreferences(prefs)
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event('biointel-prefs-changed'))
    } catch {
      /* ignore */
    }
  }

  saveLastCampaignPath({
    persona: path.persona as CampaignPersona,
    goldenPathId: path.id,
    diseaseQuery: path.diseaseQuery,
    targets: [...path.targets],
    discoverHref: path.discoverHref,
    label: path.label,
  })

  let sessionId: string | null = null
  if (opts?.saveSession !== false && path.diseaseQuery) {
    const session = saveDiscoverSession({
      label: `Golden · ${path.label}`,
      q: path.diseaseQuery,
      diseaseId: null,
      targets: [...path.targets],
    })
    sessionId = session.id
  }

  return {
    discoverHref: path.discoverHref,
    prefs,
    sessionId,
    label: path.label,
  }
}
