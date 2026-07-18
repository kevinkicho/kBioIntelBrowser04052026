import {
  explainScoreContributions,
  formatAxisTooltip,
  formatCompositeTooltip,
  AXIS_HELP,
} from '@/lib/domain/scoreAxisHelp'
import {
  createDefaultScoreRubric,
  createEmptyScoreVector,
  type ScoreVector,
} from '@/lib/domain'

function scores(): ScoreVector {
  const base = createEmptyScoreVector('full', createDefaultScoreRubric('balanced'))
  return {
    ...base,
    composite: 0.7,
    axes: {
      efficacy: 0.8,
      clinicalStage: 0.6,
      safety: null,
      novelty: 0.4,
      identityTrust: 0.9,
    },
    axisStatus: {
      efficacy: 'computed',
      clinicalStage: 'computed',
      safety: 'not-retrieved',
      novelty: 'computed',
      identityTrust: 'computed',
    },
    weights: createDefaultScoreRubric('balanced').weights,
  }
}

describe('scoreAxisHelp', () => {
  it('documents all five axes', () => {
    expect(Object.keys(AXIS_HELP)).toHaveLength(5)
    expect(AXIS_HELP.safety.summary).toMatch(/Empty ≠ safe|Empty/i)
  })

  it('explainScoreContributions excludes missing under renormalize', () => {
    const expl = explainScoreContributions(scores(), createDefaultScoreRubric('balanced'))
    const safety = expl.axes.find((a) => a.key === 'safety')
    expect(safety?.included).toBe(false)
    const efficacy = expl.axes.find((a) => a.key === 'efficacy')
    expect(efficacy?.included).toBe(true)
    expect(efficacy?.shareOfComposite).toBeGreaterThan(0)
    expect(expl.policy).toMatch(/renormalize|skipped/i)
  })

  it('formatAxisTooltip includes weight and sources', () => {
    const tip = formatAxisTooltip('efficacy', scores())
    expect(tip).toContain('Efficacy')
    expect(tip).toContain('weight')
    expect(tip).toContain('Open Targets')
  })

  it('formatCompositeTooltip lists contribution lines', () => {
    const tip = formatCompositeTooltip(scores())
    expect(tip).toContain('Composite')
    expect(tip).toContain('Investigation priority')
  })
})
