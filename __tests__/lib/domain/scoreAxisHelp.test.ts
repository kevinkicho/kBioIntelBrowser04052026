import {
  explainScoreContributions,
  formatAxisTooltip,
  formatCompositeTooltip,
  AXIS_HELP,
  AXIS_MATH,
  COMPOSITE_MATH,
  buildAxisMathPanel,
  buildCompositeMathPanel,
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

  it('AXIS_MATH documents scientific formulas for all axes', () => {
    expect(Object.keys(AXIS_MATH)).toHaveLength(5)
    expect(AXIS_MATH.safety.formula).toMatch(/1\s*[−\-]\s*R|S\s*=/)
    expect(AXIS_MATH.novelty.formula).toMatch(/log/)
    expect(AXIS_MATH.clinicalStage.formula).toMatch(/0\.7/)
    expect(COMPOSITE_MATH.formula).toMatch(/Σ|weighted|w/i)
  })

  it('buildAxisMathPanel includes formula and live value', () => {
    const panel = buildAxisMathPanel('efficacy', scores())
    expect(panel.formula).toContain('max')
    expect(panel.valueLine).toMatch(/Efficacy/)
    expect(panel.steps.length).toBeGreaterThan(2)
  })

  it('buildCompositeMathPanel includes renormalize policy when safety missing', () => {
    const panel = buildCompositeMathPanel(scores())
    expect(panel.formula).toMatch(/Σ|w/i)
    expect(panel.valueLine).toMatch(/Composite/)
    expect(panel.statusLine || panel.steps.join(' ')).toMatch(/renormal|skip|Missing/i)
  })
})
