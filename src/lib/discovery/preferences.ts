/**
 * Discovery preferences — types + defaults only (no localStorage I/O in PR1).
 * Storage key (later): biointel-discovery-prefs-v1
 * @see docs/design/discovery-workbench-v1.md §5.3.1, KD21
 */

import type { RubricPresetId, ScoreAxisWeights } from '../domain/score'

export type HarvestTimingPref = 'board-promote' | 'rank-time'
export type AeAggressivenessPref = 'soft-flag' | 'hard-penalty'
export type TourExampleSetPref = 'mixed' | 'common-only' | 'rare-only'
export type CollaborationModePref = 'solo-export' | 'share-links-when-available'

export interface DiscoveryPreferences {
  version: 1
  rubricPreset: RubricPresetId
  aeAggressiveness: AeAggressivenessPref
  harvestTiming: HarvestTimingPref
  /** Sticky: remember harvestTiming across sessions when true */
  harvestTimingSticky: boolean
  tourExampleSet: TourExampleSetPref
  collaborationMode: CollaborationModePref
  /** Optional custom weights; when set, preset shows as "Custom" until reset */
  customWeights?: ScoreAxisWeights
  updatedAt: string
}

export const DEFAULT_DISCOVERY_PREFERENCES: DiscoveryPreferences = {
  version: 1,
  rubricPreset: 'balanced',
  aeAggressiveness: 'soft-flag',
  harvestTiming: 'board-promote',
  harvestTimingSticky: true,
  tourExampleSet: 'mixed',
  collaborationMode: 'solo-export',
  updatedAt: new Date(0).toISOString(),
}

/** Fields snapshotted onto DiscoveryResult / board export for reproducibility. */
export type DiscoveryPreferencesSnapshot = Pick<
  DiscoveryPreferences,
  'rubricPreset' | 'aeAggressiveness' | 'harvestTiming'
>

export function snapshotDiscoveryPreferences(
  prefs: DiscoveryPreferences,
): DiscoveryPreferencesSnapshot {
  return {
    rubricPreset: prefs.rubricPreset,
    aeAggressiveness: prefs.aeAggressiveness,
    harvestTiming: prefs.harvestTiming,
  }
}
