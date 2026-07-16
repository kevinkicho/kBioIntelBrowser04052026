import {
  RUBRIC_PRESETS,
  createDefaultScoreRubric,
  createEmptyScoreVector,
  computeComposite,
  clampAxis,
  DEFAULT_PENALIZE_VALUE,
} from '@/lib/domain/score'

describe('score defaults', () => {
  it('balanced preset weights sum to 1', () => {
    const w = RUBRIC_PRESETS.balanced
    const sum = w.efficacy + w.clinicalStage + w.safety + w.novelty + w.identityTrust
    expect(sum).toBeCloseTo(1, 5)
  })

  it('all presets sum to 1', () => {
    for (const [id, w] of Object.entries(RUBRIC_PRESETS)) {
      const sum = w.efficacy + w.clinicalStage + w.safety + w.novelty + w.identityTrust
      expect(sum).toBeCloseTo(1, 5)
    }
  })

  it('createDefaultScoreRubric uses balanced + soft-flag + renormalize', () => {
    const r = createDefaultScoreRubric()
    expect(r.version).toBe(1)
    expect(r.preset).toBe('balanced')
    expect(r.aeAggressiveness).toBe('soft-flag')
    expect(r.missingAxisPolicy).toBe('renormalize')
    expect(r.weights).toEqual(RUBRIC_PRESETS.balanced)
  })

  it('safety-first defaults missingAxisPolicy to penalize', () => {
    const r = createDefaultScoreRubric('safety-first')
    expect(r.missingAxisPolicy).toBe('penalize')
    expect(r.penalizeValue).toBe(DEFAULT_PENALIZE_VALUE)
  })

  it('createEmptyScoreVector has null axes and not-retrieved status', () => {
    const v = createEmptyScoreVector('cheap')
    expect(v.composite).toBe(0)
    expect(v.scorePhase).toBe('cheap')
    expect(v.rubricVersion).toBe(1)
    expect(v.axes.efficacy).toBeNull()
    expect(v.axes.safety).toBeNull()
    expect(v.axisStatus.safety).toBe('not-retrieved')
    expect(v.axisStatus.efficacy).toBe('not-retrieved')
  })

  it('clampAxis bounds to 0–1 and nulls NaN', () => {
    expect(clampAxis(0.5)).toBe(0.5)
    expect(clampAxis(-1)).toBe(0)
    expect(clampAxis(2)).toBe(1)
    expect(clampAxis(null)).toBeNull()
    expect(clampAxis(Number.NaN)).toBeNull()
  })

  describe('computeComposite', () => {
    const balanced = createDefaultScoreRubric('balanced')

    it('renormalizes over non-null axes', () => {
      // only efficacy=1 with weight 0.3 → composite 1
      const c = computeComposite(
        {
          efficacy: 1,
          clinicalStage: null,
          safety: null,
          novelty: null,
          identityTrust: null,
        },
        balanced,
      )
      expect(c).toBeCloseTo(1, 5)
    })

    it('weighted average when all present', () => {
      const c = computeComposite(
        {
          efficacy: 1,
          clinicalStage: 1,
          safety: 1,
          novelty: 1,
          identityTrust: 1,
        },
        balanced,
      )
      expect(c).toBeCloseTo(1, 5)
    })

    it('penalize policy uses penalizeValue for nulls', () => {
      const safetyFirst = createDefaultScoreRubric('safety-first')
      const c = computeComposite(
        {
          efficacy: 1,
          clinicalStage: 1,
          safety: null,
          novelty: 1,
          identityTrust: 1,
        },
        safetyFirst,
      )
      // null safety contributes 0.3 * 0.45
      const w = safetyFirst.weights
      const expected =
        (w.efficacy * 1 +
          w.clinicalStage * 1 +
          w.safety * DEFAULT_PENALIZE_VALUE +
          w.novelty * 1 +
          w.identityTrust * 1) /
        (w.efficacy + w.clinicalStage + w.safety + w.novelty + w.identityTrust)
      expect(c).toBeCloseTo(expected, 5)
      expect(c).toBeLessThan(1)
    })

    it('all-null axes under renormalize yield 0', () => {
      const c = computeComposite(
        {
          efficacy: null,
          clinicalStage: null,
          safety: null,
          novelty: null,
          identityTrust: null,
        },
        balanced,
      )
      expect(c).toBe(0)
    })

    it('zero weights yield 0', () => {
      const c = computeComposite(
        {
          efficacy: 1,
          clinicalStage: 1,
          safety: 1,
          novelty: 1,
          identityTrust: 1,
        },
        {
          weights: {
            efficacy: 0,
            clinicalStage: 0,
            safety: 0,
            novelty: 0,
            identityTrust: 0,
          },
          missingAxisPolicy: 'renormalize',
        },
      )
      expect(c).toBe(0)
    })
  })
})

