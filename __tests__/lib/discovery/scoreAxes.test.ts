import {
  scoreEfficacy,
  scoreClinicalStage,
  scoreSafety,
  scoreNovelty,
  applyAeAggressiveness,
  buildScoreVector,
  mergeHarvestIntoScoreVector,
  SOFT_FLAG_CLINICAL_STAGE_THRESHOLD,
  SOFT_FLAG_SAFETY_FLOOR,
  NOVELTY_HIT_SCALE,
} from '@/lib/discovery/scoreAxes'
import { createDefaultScoreRubric, computeComposite } from '@/lib/domain/score'

describe('scoreAxes', () => {
  describe('scoreEfficacy', () => {
    it('returns null with no signals', () => {
      expect(scoreEfficacy({})).toBeNull()
    })

    it('uses known-drug floor 0.9', () => {
      expect(scoreEfficacy({ isKnownDrug: true })).toBeCloseTo(0.9, 5)
    })

    it('takes max of gene + shared target', () => {
      const v = scoreEfficacy({
        geneAssociationScore: 0.4,
        sharedTargetRatio: 0.7,
      })
      expect(v).toBeCloseTo(0.7, 5)
    })

    it('fixtures: known-drug style efficacy ≥ 0.85', () => {
      const v = scoreEfficacy({
        isKnownDrug: true,
        geneAssociationScore: 0.5,
      })
      expect(v!).toBeGreaterThanOrEqual(0.85)
    })
  })

  describe('scoreClinicalStage', () => {
    it('phase4 clinicalStage ≥ 0.7', () => {
      const v = scoreClinicalStage({ maxPhase: 4, trialNorm: 0.5 })
      // 0.7 * 1 + 0.3 * 0.5 = 0.85
      expect(v!).toBeGreaterThanOrEqual(0.7)
      expect(v).toBeCloseTo(0.85, 5)
    })

    it('phase-only when no trials', () => {
      expect(scoreClinicalStage({ maxPhase: 2 })).toBeCloseTo(0.5, 5)
    })

    it('returns null when completely missing', () => {
      expect(scoreClinicalStage({})).toBeNull()
    })
  })

  describe('scoreSafety', () => {
    it('empty AE+recall → null + empty (never safe)', () => {
      const r = scoreSafety({ aeTotal: 0, recallCount: 0 })
      expect(r.value).toBeNull()
      expect(r.status).toBe('empty')
    })

    it('high AE volume lowers safety', () => {
      const low = scoreSafety({ aeTotal: 10, recallCount: 0 })
      const high = scoreSafety({ aeTotal: 5000, recallCount: 0 })
      expect(low.value!).toBeGreaterThan(high.value!)
      expect(high.flags.some((f) => f.kind === 'ae_burden')).toBe(true)
    })

    it('recalls produce recall flag', () => {
      const r = scoreSafety({ aeTotal: 5, recallCount: 2 })
      expect(r.value).not.toBeNull()
      expect(r.flags.some((f) => f.kind === 'recall')).toBe(true)
    })

    it('timeout / error statuses', () => {
      expect(scoreSafety({ aeTotal: 0, recallCount: 0, fetchTimedOut: true }).status).toBe(
        'timeout',
      )
      expect(scoreSafety({ aeTotal: 0, recallCount: 0, fetchFailed: true }).status).toBe('error')
    })
  })

  describe('scoreNovelty', () => {
    it('obscure bioactive (few hits) novelty > 0.7', () => {
      const r = scoreNovelty({ hitCount: 5 })
      expect(r.value!).toBeGreaterThan(0.7)
      expect(r.status).toBe('computed')
    })

    it('high literature volume lowers novelty', () => {
      const obscure = scoreNovelty({ hitCount: 3 })
      const famous = scoreNovelty({ hitCount: NOVELTY_HIT_SCALE })
      expect(obscure.value!).toBeGreaterThan(famous.value!)
      expect(famous.value).toBeCloseTo(0, 5)
    })

    it('dampens when phaseNorm ≈ 1 (approved)', () => {
      const base = scoreNovelty({ hitCount: 100, phaseNorm: 0 })
      const damp = scoreNovelty({ hitCount: 100, phaseNorm: 1 })
      expect(damp.value!).toBeLessThan(base.value!)
    })
  })

  describe('applyAeAggressiveness', () => {
    it('soft-flag clamps floor for high clinicalStage', () => {
      const applied = applyAeAggressiveness(0.1, 0.9, 'soft-flag')
      expect(applied).toBeCloseTo(SOFT_FLAG_SAFETY_FLOOR, 5)
    })

    it('soft-flag does not floor low clinicalStage', () => {
      const applied = applyAeAggressiveness(0.1, 0.2, 'soft-flag')
      expect(applied).toBeCloseTo(0.1, 5)
    })

    it('hard-penalty passes through', () => {
      expect(applyAeAggressiveness(0.1, 0.9, 'hard-penalty')).toBeCloseTo(0.1, 5)
    })

    it('threshold constant is 0.75', () => {
      expect(SOFT_FLAG_CLINICAL_STAGE_THRESHOLD).toBe(0.75)
      const below = applyAeAggressiveness(0.1, 0.74, 'soft-flag')
      const above = applyAeAggressiveness(0.1, 0.75, 'soft-flag')
      expect(below).toBeCloseTo(0.1, 5)
      expect(above).toBeCloseTo(SOFT_FLAG_SAFETY_FLOOR, 5)
    })
  })

  describe('buildScoreVector + presets', () => {
    it('cheap phase leaves safety/novelty not-retrieved', () => {
      const v = buildScoreVector({
        rubric: createDefaultScoreRubric('balanced'),
        scorePhase: 'cheap',
        cheap: {
          geneAssociationScore: 0.8,
          maxPhase: 3,
          trialNorm: 0.4,
          identityTrust: 0.66,
        },
      })
      expect(v.axes.efficacy).not.toBeNull()
      expect(v.axes.clinicalStage).not.toBeNull()
      expect(v.axes.safety).toBeNull()
      expect(v.axisStatus.safety).toBe('not-retrieved')
      expect(v.axisStatus.novelty).toBe('not-retrieved')
      expect(v.scorePhase).toBe('cheap')
      expect(v.composite).toBeGreaterThan(0)
    })

    it('repurposing weights clinicalStage higher than novel-bioactive', () => {
      const cheap = {
        geneAssociationScore: 0.3,
        maxPhase: 4,
        trialNorm: 0.9,
        identityTrust: 0.66,
      }
      const rep = buildScoreVector({
        rubric: createDefaultScoreRubric('repurposing'),
        cheap,
      })
      const novel = buildScoreVector({
        rubric: createDefaultScoreRubric('novel-bioactive'),
        cheap,
      })
      // same axes; repurposing emphasizes clinicalStage so composite should be higher
      // for a high-phase low-efficacy candidate
      expect(rep.composite).toBeGreaterThan(novel.composite)
    })

    it('safety-first penalizes missing safety', () => {
      const sf = createDefaultScoreRubric('safety-first')
      expect(sf.missingAxisPolicy).toBe('penalize')
      const v = buildScoreVector({
        rubric: sf,
        scorePhase: 'cheap',
        cheap: {
          geneAssociationScore: 1,
          maxPhase: 4,
          trialNorm: 1,
          identityTrust: 1,
        },
      })
      // With all non-safety axes maxed, penalize still pulls composite below 1
      expect(v.composite).toBeLessThan(1)
    })

    it('mergeHarvestIntoScoreVector upgrades to full phase', () => {
      const rubric = createDefaultScoreRubric('balanced', {
        aeAggressiveness: 'soft-flag',
      })
      const cheap = buildScoreVector({
        rubric,
        cheap: {
          geneAssociationScore: 0.6,
          maxPhase: 4,
          trialNorm: 0.5,
          identityTrust: 1,
        },
      })
      const safety = scoreSafety({ aeTotal: 200, recallCount: 1 })
      const novelty = scoreNovelty({ hitCount: 50, phaseNorm: 1 })
      const full = mergeHarvestIntoScoreVector(cheap, rubric, {
        safety: {
          value: safety.value,
          status: safety.status,
          flags: safety.flags,
        },
        novelty: { value: novelty.value, status: novelty.status },
      })
      expect(full.scorePhase).toBe('full')
      expect(full.axes.safety).not.toBeNull()
      // soft-flag floor for phase4 clinical stage
      expect(full.axes.safety!).toBeGreaterThanOrEqual(SOFT_FLAG_SAFETY_FLOOR - 1e-9)
      expect(full.axes.novelty).not.toBeNull()
      expect(full.composite).toBe(
        computeComposite(full.axes, rubric),
      )
    })

    it('hard-penalty can bury approved drugs with high AE', () => {
      const hard = createDefaultScoreRubric('balanced', {
        aeAggressiveness: 'hard-penalty',
      })
      const soft = createDefaultScoreRubric('balanced', {
        aeAggressiveness: 'soft-flag',
      })
      const cheapInput = {
        geneAssociationScore: 0.9,
        maxPhase: 4,
        trialNorm: 0.8,
        identityTrust: 1,
      }
      const baseHard = buildScoreVector({ rubric: hard, cheap: cheapInput })
      const baseSoft = buildScoreVector({ rubric: soft, cheap: cheapInput })
      const safety = scoreSafety({ aeTotal: 8000, seriousTotal: 500, recallCount: 3 })
      const hardFull = mergeHarvestIntoScoreVector(baseHard, hard, {
        safety: { value: safety.value, status: 'computed', flags: safety.flags },
      })
      const softFull = mergeHarvestIntoScoreVector(baseSoft, soft, {
        safety: { value: safety.value, status: 'computed', flags: safety.flags },
      })
      expect(hardFull.axes.safety!).toBeLessThan(softFull.axes.safety!)
      expect(hardFull.composite).toBeLessThan(softFull.composite)
    })
  })
})
