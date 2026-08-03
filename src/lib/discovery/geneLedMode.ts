/**
 * Gene-led Discover mode (v3 B1) — of-record preference + rank options.
 * Does NOT invent scores or use LLM. Hard-filters / prioritizes pin hits only.
 */

import type { DiscoveryPreferences } from './preferences'

export type DiscoverEntityMode = 'molecule' | 'gene-led'

export const GENE_LED_MODE_HELP =
  'Gene-led mode keeps of-record deterministic ranking but requires candidates to hit ≥1 pinned gene (mustHitPinnedTargets). Orphanet boost recommended for rare phenotypes. Not LLM ranking.'

/**
 * Whether prefs mean gene-led shortlist behavior.
 */
export function isGeneLedMode(prefs: Pick<DiscoveryPreferences, 'discoverMode' | 'mustHitPinnedTargets'>): boolean {
  if (prefs.discoverMode === 'gene-led') return true
  // Backward compatible: pin-hard-filter alone is gene-led-ish
  return prefs.mustHitPinnedTargets === true && prefs.discoverMode !== 'molecule'
}

/**
 * Rank engine options derived from gene-led prefs (pure).
 */
export function geneLedRankOptions(prefs: DiscoveryPreferences): {
  mustHitPinnedTargets: boolean
  rareDiseaseBoost: boolean
  discoverMode: DiscoverEntityMode
} {
  const geneLed = prefs.discoverMode === 'gene-led'
  return {
    discoverMode: geneLed ? 'gene-led' : 'molecule',
    // Gene-led always requires pin hits; rare boost remains user-controlled
    mustHitPinnedTargets: geneLed ? true : prefs.mustHitPinnedTargets,
    rareDiseaseBoost: prefs.rareDiseaseBoost,
  }
}

export function geneLedBannerCopy(mode: DiscoverEntityMode): string | null {
  if (mode !== 'gene-led') return null
  return 'Gene-led mode (of-record): candidates must hit ≥1 pinned gene. Rank stays deterministic — no LLM.'
}
