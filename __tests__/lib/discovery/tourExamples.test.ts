import {
  TOUR_EXAMPLE_SETS,
  examplesForTourSet,
  diseaseChipLabels,
} from '@/lib/discovery/tourExamples'

describe('tourExamples', () => {
  it('defines mixed, common-only, and rare-only sets with 4 examples each', () => {
    expect(TOUR_EXAMPLE_SETS.mixed).toHaveLength(4)
    expect(TOUR_EXAMPLE_SETS['common-only']).toHaveLength(4)
    expect(TOUR_EXAMPLE_SETS['rare-only']).toHaveLength(4)
  })

  it('mixed includes both rare and common kinds', () => {
    const kinds = new Set(examplesForTourSet('mixed').map((e) => e.kind))
    expect(kinds.has('rare')).toBe(true)
    expect(kinds.has('common')).toBe(true)
  })

  it('common-only has only common kinds', () => {
    expect(examplesForTourSet('common-only').every((e) => e.kind === 'common')).toBe(true)
  })

  it('rare-only has only rare kinds', () => {
    expect(examplesForTourSet('rare-only').every((e) => e.kind === 'rare')).toBe(true)
  })

  it('diseaseChipLabels returns display names', () => {
    const labels = diseaseChipLabels('mixed')
    expect(labels).toContain('ATTR amyloidosis')
    expect(labels).toContain('Type 2 diabetes')
    expect(labels).toHaveLength(4)
  })
})
