import {
  aiRunButtonLabel,
  aiSurfaceIntro,
  humanModeLabel,
  packModeExpectLine,
  rhModeExpectLine,
} from '@/lib/ai/aiUiCopy'

describe('aiUiCopy', () => {
  it('humanModeLabel maps known modes and prettifies unknowns', () => {
    expect(humanModeLabel('pack_executive_brief')).toBe('Executive brief')
    expect(humanModeLabel('board_recommend')).toBe('Board recommend')
    expect(humanModeLabel('rh_thesis_draft')).toBe('Thesis draft')
    expect(humanModeLabel('some_custom_mode')).toMatch(/Some Custom Mode/i)
  })

  it('surface intros answer what / needs / gets / not', () => {
    for (const id of [
      'pack',
      'rh',
      'research_lab',
      'discover_rank',
      'board_recommend',
      'disease',
    ] as const) {
      const intro = aiSurfaceIntro(id)
      expect(intro.title.length).toBeGreaterThan(2)
      expect(intro.what.length).toBeGreaterThan(20)
      expect(intro.needs.length).toBeGreaterThan(10)
      expect(intro.gets.length).toBeGreaterThan(10)
      expect(intro.not.length).toBeGreaterThan(10)
    }
  })

  it('expect lines are mode-specific', () => {
    expect(packModeExpectLine('pack_gap_analysis')).toMatch(/gap/i)
    expect(rhModeExpectLine('rh_rival_hypotheses')).toMatch(/rival/i)
  })

  it('run button labels distinguish first vs again', () => {
    expect(aiRunButtonLabel({ busy: false, hasResult: false, surface: 'pack' })).toBe('Generate')
    expect(aiRunButtonLabel({ busy: false, hasResult: true })).toBe('Generate again')
    expect(aiRunButtonLabel({ busy: true, hasResult: false })).toBe('Generating…')
    expect(
      aiRunButtonLabel({ busy: false, hasResult: false, surface: 'board_recommend' }),
    ).toMatch(/review order/i)
  })
})
