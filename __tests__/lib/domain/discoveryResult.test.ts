import {
  createEmptyDiscoveryResult,
  isDiscoveryResult,
  getDiscoveryV2,
  type RankResultWithV2,
} from '@/lib/domain/discoveryResult'
import {
  DEFAULT_DISCOVERY_PREFERENCES,
  snapshotDiscoveryPreferences,
} from '@/lib/discovery/preferences'

describe('discoveryResult', () => {
  it('createEmptyDiscoveryResult builds schema v2 skeleton', () => {
    const r = createEmptyDiscoveryResult('query-x')
    expect(r.schemaVersion).toBe(2)
    expect(r.query).toBe('query-x')
    expect(r.candidates).toEqual([])
    expect(r.needsDiseaseConfirmation).toBe(false)
    expect(r.scorePhase).toBe('cheap')
    expect(r.rubric.preset).toBe('balanced')
    expect(isDiscoveryResult(r)).toBe(true)
  })

  it('isDiscoveryResult rejects non-v2 shapes', () => {
    expect(isDiscoveryResult(null)).toBe(false)
    expect(isDiscoveryResult({})).toBe(false)
    expect(isDiscoveryResult({ schemaVersion: 1, query: 'q', candidates: [] })).toBe(false)
    expect(isDiscoveryResult({ schemaVersion: 2, query: 'q', candidates: [] })).toBe(true)
  })

  it('getDiscoveryV2 reads dual-schema RankResultWithV2', () => {
    const v2 = createEmptyDiscoveryResult('alz')
    const dual: RankResultWithV2 = {
      query: 'alz',
      diseaseId: null,
      diseaseName: 'alz',
      therapeuticAreas: [],
      genes: [],
      candidates: [],
      v2,
    }
    expect(getDiscoveryV2(dual)).toBe(v2)
    expect(getDiscoveryV2({ ...dual, v2: undefined })).toBeUndefined()
  })

  it('preferences snapshot uses Pick fields from DiscoveryPreferences', () => {
    const snap = snapshotDiscoveryPreferences(DEFAULT_DISCOVERY_PREFERENCES)
    expect(snap).toEqual({
      rubricPreset: 'balanced',
      aeAggressiveness: 'soft-flag',
      harvestTiming: 'board-promote',
    })
    const r = createEmptyDiscoveryResult('q', { preferencesSnapshot: snap })
    expect(r.preferencesSnapshot?.rubricPreset).toBe('balanced')
  })
})
