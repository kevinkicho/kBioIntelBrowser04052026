import {
  DISCOVER_PIPELINE_STAGES,
  SCORE_AXIS_GUIDE,
  effortLabel,
  stageIdFromProgressLabel,
} from '@/lib/discovery/algorithmGuide'

describe('algorithmGuide', () => {
  test('pipeline has ordered stages with sources', () => {
    expect(DISCOVER_PIPELINE_STAGES.length).toBeGreaterThanOrEqual(5)
    expect(DISCOVER_PIPELINE_STAGES[0].id).toBe('disease')
    expect(DISCOVER_PIPELINE_STAGES.every((s) => s.sources.length > 0)).toBe(true)
  })

  test('score axes cover product rubric dimensions', () => {
    const keys = SCORE_AXIS_GUIDE.map((a) => a.key)
    expect(keys).toEqual(
      expect.arrayContaining([
        'efficacy',
        'clinicalStage',
        'safety',
        'novelty',
        'identityTrust',
      ]),
    )
  })

  test('maps progress labels to stages', () => {
    expect(stageIdFromProgressLabel('Confirming disease...')).toBe('disease')
    expect(stageIdFromProgressLabel('Gathering candidates...')).toBe('gather')
    expect(stageIdFromProgressLabel('Resolving identity (top 25)...')).toBe('identity')
    expect(stageIdFromProgressLabel('Cheap multi-axis scoring...')).toBe('score')
    expect(stageIdFromProgressLabel('Harvesting safety & novelty (top-15)...')).toBe(
      'harvest',
    )
  })

  test('effort labels', () => {
    expect(effortLabel('fast')).toMatch(/quick/i)
    expect(effortLabel('heavier')).toMatch(/longer/i)
  })
})
