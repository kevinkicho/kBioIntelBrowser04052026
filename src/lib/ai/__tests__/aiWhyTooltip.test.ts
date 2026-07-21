import {
  buildAiRankWhy,
  buildBoardStatusSuggestWhy,
  buildPackAiModeWhy,
  buildAskSuggestionWhy,
  buildInsightNextStepWhy,
} from '@/lib/ai/aiWhyTooltip'

describe('aiWhyTooltip builders', () => {
  it('explains AI rank move vs of-record', () => {
    const why = buildAiRankWhy({
      aiRank: 1,
      ofRecordRank: 4,
      item: {
        name: 'Aspirin',
        rank: 1,
        reasons: ['Strong trial density', 'Shared target'],
        evidenceKeys: ['trial', 'target'],
      },
      mode: 'reorder',
    })
    expect(why.fullText).toMatch(/Moved up 3/)
    expect(why.fullText).toMatch(/Strong trial density/)
    expect(why.fullText).toMatch(/trial, target/)
    expect(why.fullText).toMatch(/non-of-record|Not regulatory/i)
  })

  it('explains board status tertile rules', () => {
    const why = buildBoardStatusSuggestWhy({
      suggested: 'promote',
      aiRank: 1,
      total: 9,
      current: 'watching',
      item: { reasons: ['Phase 3 signal'], evidenceKeys: ['trial'] },
    })
    expect(why.fullText).toMatch(/Top third/)
    expect(why.fullText).toMatch(/promote/)
    expect(why.fullText).toMatch(/Phase 3/)
  })

  it('explains pack AI modes and next steps', () => {
    const mode = buildPackAiModeWhy('pack_gap_analysis')
    expect(mode.fullText).toMatch(/gap/i)
    expect(mode.fullText).toMatch(/allowlisted/i)

    const step = buildInsightNextStepWhy('Export landscape pack', ['ec:1', 'ec:2'])
    expect(step.fullText).toMatch(/ec:1/)
    expect(step.fullText).toMatch(/Export landscape/)
  })

  it('explains ask chips', () => {
    const why = buildAskSuggestionWhy('What is the primary mechanism?')
    expect(why.fullText).toMatch(/Suggested Ask/)
    expect(why.fullText).toMatch(/mechanism/)
  })
})
