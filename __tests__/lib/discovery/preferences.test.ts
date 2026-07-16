import {
  DEFAULT_DISCOVERY_PREFERENCES,
  snapshotDiscoveryPreferences,
  type DiscoveryPreferences,
} from '@/lib/discovery/preferences'

describe('DiscoveryPreferences defaults', () => {
  it('matches Rev 3 product defaults', () => {
    expect(DEFAULT_DISCOVERY_PREFERENCES.version).toBe(1)
    expect(DEFAULT_DISCOVERY_PREFERENCES.rubricPreset).toBe('balanced')
    expect(DEFAULT_DISCOVERY_PREFERENCES.aeAggressiveness).toBe('soft-flag')
    expect(DEFAULT_DISCOVERY_PREFERENCES.harvestTiming).toBe('board-promote')
    expect(DEFAULT_DISCOVERY_PREFERENCES.harvestTimingSticky).toBe(true)
    expect(DEFAULT_DISCOVERY_PREFERENCES.tourExampleSet).toBe('mixed')
    expect(DEFAULT_DISCOVERY_PREFERENCES.collaborationMode).toBe('solo-export')
  })

  it('snapshot only picks reproducibility fields', () => {
    const prefs: DiscoveryPreferences = {
      ...DEFAULT_DISCOVERY_PREFERENCES,
      customWeights: {
        efficacy: 0.5,
        clinicalStage: 0.2,
        safety: 0.1,
        novelty: 0.1,
        identityTrust: 0.1,
      },
    }
    expect(snapshotDiscoveryPreferences(prefs)).toEqual({
      rubricPreset: 'balanced',
      aeAggressiveness: 'soft-flag',
      harvestTiming: 'board-promote',
    })
  })
})
