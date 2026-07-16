import {
  DEFAULT_DISCOVERY_PREFERENCES,
  DISCOVERY_PREFS_STORAGE_KEY,
  parseDiscoveryPreferences,
  mergeDiscoveryPreferences,
  scoreRubricFromPreferences,
  harvestFlagsFromPreferences,
  snapshotDiscoveryPreferences,
  loadDiscoveryPreferences,
  saveDiscoveryPreferences,
  resetDiscoveryPreferences,
  updateDiscoveryPreferences,
  PREFERENCE_TOOLTIPS,
} from '@/lib/discovery/preferences'
import { RUBRIC_PRESETS } from '@/lib/domain/score'

describe('discovery preferences pure functions', () => {
  describe('parseDiscoveryPreferences', () => {
    it('returns defaults for null/garbage', () => {
      expect(parseDiscoveryPreferences(null).rubricPreset).toBe('balanced')
      expect(parseDiscoveryPreferences(undefined).harvestTiming).toBe('board-promote')
      expect(parseDiscoveryPreferences('nope').aeAggressiveness).toBe('soft-flag')
      expect(parseDiscoveryPreferences({}).version).toBe(1)
    })

    it('accepts valid fields and ignores invalid enums', () => {
      const p = parseDiscoveryPreferences({
        version: 99,
        rubricPreset: 'repurposing',
        aeAggressiveness: 'hard-penalty',
        harvestTiming: 'rank-time',
        harvestTimingSticky: false,
        tourExampleSet: 'rare-only',
        collaborationMode: 'share-links-when-available',
        bogus: true,
        rubricPreset_invalid: 'nope',
      })
      expect(p.version).toBe(1)
      expect(p.rubricPreset).toBe('repurposing')
      expect(p.aeAggressiveness).toBe('hard-penalty')
      expect(p.harvestTiming).toBe('rank-time')
      expect(p.harvestTimingSticky).toBe(false)
      expect(p.tourExampleSet).toBe('rare-only')
      expect(p.collaborationMode).toBe('share-links-when-available')
    })

    it('rejects invalid preset / mode strings', () => {
      const p = parseDiscoveryPreferences({
        rubricPreset: 'super-aggressive',
        aeAggressiveness: 'nuclear',
        harvestTiming: 'never',
      })
      expect(p.rubricPreset).toBe(DEFAULT_DISCOVERY_PREFERENCES.rubricPreset)
      expect(p.aeAggressiveness).toBe(DEFAULT_DISCOVERY_PREFERENCES.aeAggressiveness)
      expect(p.harvestTiming).toBe(DEFAULT_DISCOVERY_PREFERENCES.harvestTiming)
    })

    it('accepts customWeights when well-formed', () => {
      const weights = { ...RUBRIC_PRESETS.balanced, efficacy: 0.5, novelty: 0.0 }
      const p = parseDiscoveryPreferences({ customWeights: weights })
      expect(p.customWeights?.efficacy).toBe(0.5)
    })

    it('drops malformed customWeights', () => {
      const p = parseDiscoveryPreferences({ customWeights: { efficacy: 'high' } })
      expect(p.customWeights).toBeUndefined()
    })
  })

  describe('mergeDiscoveryPreferences', () => {
    it('patches fields and bumps updatedAt', () => {
      const base = { ...DEFAULT_DISCOVERY_PREFERENCES }
      const next = mergeDiscoveryPreferences(base, {
        rubricPreset: 'novel-bioactive',
        harvestTiming: 'rank-time',
      })
      expect(next.rubricPreset).toBe('novel-bioactive')
      expect(next.harvestTiming).toBe('rank-time')
      expect(next.aeAggressiveness).toBe('soft-flag')
      expect(next.updatedAt).not.toBe(base.updatedAt)
    })

    it('clears customWeights when preset changes', () => {
      const withCustom = mergeDiscoveryPreferences(DEFAULT_DISCOVERY_PREFERENCES, {
        customWeights: { ...RUBRIC_PRESETS.balanced },
      })
      expect(withCustom.customWeights).toBeDefined()
      const next = mergeDiscoveryPreferences(withCustom, {
        rubricPreset: 'repurposing',
      })
      expect(next.customWeights).toBeUndefined()
      expect(next.rubricPreset).toBe('repurposing')
    })

    it('clears customWeights when set to undefined explicitly', () => {
      const withCustom = mergeDiscoveryPreferences(DEFAULT_DISCOVERY_PREFERENCES, {
        customWeights: { ...RUBRIC_PRESETS['novel-bioactive'] },
      })
      const cleared = mergeDiscoveryPreferences(withCustom, {
        customWeights: undefined,
      })
      expect(cleared.customWeights).toBeUndefined()
    })
  })

  describe('scoreRubricFromPreferences', () => {
    it('maps balanced soft-flag defaults', () => {
      const r = scoreRubricFromPreferences(DEFAULT_DISCOVERY_PREFERENCES)
      expect(r.preset).toBe('balanced')
      expect(r.weights).toEqual(RUBRIC_PRESETS.balanced)
      expect(r.aeAggressiveness).toBe('soft-flag')
      expect(r.missingAxisPolicy).toBe('renormalize')
    })

    it('safety-first → penalize missing axes', () => {
      const prefs = mergeDiscoveryPreferences(DEFAULT_DISCOVERY_PREFERENCES, {
        rubricPreset: 'safety-first',
      })
      const r = scoreRubricFromPreferences(prefs)
      expect(r.missingAxisPolicy).toBe('penalize')
      expect(r.weights.safety).toBe(0.45)
    })

    it('uses customWeights when present', () => {
      const custom = {
        efficacy: 0.5,
        clinicalStage: 0.1,
        safety: 0.1,
        novelty: 0.2,
        identityTrust: 0.1,
      }
      const prefs = mergeDiscoveryPreferences(DEFAULT_DISCOVERY_PREFERENCES, {
        customWeights: custom,
      })
      expect(scoreRubricFromPreferences(prefs).weights).toEqual(custom)
    })
  })

  describe('harvestFlagsFromPreferences', () => {
    it('board-promote → no rank-time harvest (default)', () => {
      expect(harvestFlagsFromPreferences({ harvestTiming: 'board-promote' })).toEqual({
        runSafetyHarvest: false,
        runNoveltyHarvest: false,
      })
    })

    it('rank-time → both harvest flags true', () => {
      expect(harvestFlagsFromPreferences({ harvestTiming: 'rank-time' })).toEqual({
        runSafetyHarvest: true,
        runNoveltyHarvest: true,
      })
    })
  })

  describe('snapshotDiscoveryPreferences', () => {
    it('picks reproducibility fields only', () => {
      const snap = snapshotDiscoveryPreferences({
        ...DEFAULT_DISCOVERY_PREFERENCES,
        rubricPreset: 'repurposing',
        harvestTiming: 'rank-time',
      })
      expect(snap).toEqual({
        rubricPreset: 'repurposing',
        aeAggressiveness: 'soft-flag',
        harvestTiming: 'rank-time',
      })
      expect(Object.keys(snap)).toHaveLength(3)
    })
  })

  describe('tooltips', () => {
    it('covers all preset and policy options', () => {
      expect(PREFERENCE_TOOLTIPS.rubricPreset.balanced).toMatch(/equal/i)
      expect(PREFERENCE_TOOLTIPS.aeAggressiveness['soft-flag']).toMatch(/FAERS/i)
      expect(PREFERENCE_TOOLTIPS.harvestTiming['board-promote']).toMatch(/cheap|fast/i)
    })
  })

  describe('localStorage I/O', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('load returns defaults when empty', () => {
      const p = loadDiscoveryPreferences()
      expect(p.rubricPreset).toBe('balanced')
      expect(p.harvestTiming).toBe('board-promote')
    })

    it('save + load round-trips', () => {
      const next = mergeDiscoveryPreferences(DEFAULT_DISCOVERY_PREFERENCES, {
        rubricPreset: 'novel-bioactive',
        aeAggressiveness: 'hard-penalty',
        harvestTiming: 'rank-time',
      })
      saveDiscoveryPreferences(next)
      const raw = localStorage.getItem(DISCOVERY_PREFS_STORAGE_KEY)
      expect(raw).toBeTruthy()
      const loaded = loadDiscoveryPreferences()
      expect(loaded.rubricPreset).toBe('novel-bioactive')
      expect(loaded.aeAggressiveness).toBe('hard-penalty')
      expect(loaded.harvestTiming).toBe('rank-time')
    })

    it('updateDiscoveryPreferences patches and persists', () => {
      updateDiscoveryPreferences({ rubricPreset: 'safety-first' })
      expect(loadDiscoveryPreferences().rubricPreset).toBe('safety-first')
    })

    it('resetDiscoveryPreferences restores defaults', () => {
      updateDiscoveryPreferences({ harvestTiming: 'rank-time' })
      const reset = resetDiscoveryPreferences()
      expect(reset.harvestTiming).toBe('board-promote')
      expect(loadDiscoveryPreferences().harvestTiming).toBe('board-promote')
    })

    it('tolerates corrupt JSON', () => {
      localStorage.setItem(DISCOVERY_PREFS_STORAGE_KEY, '{not-json')
      expect(loadDiscoveryPreferences().rubricPreset).toBe('balanced')
    })
  })
})
