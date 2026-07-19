import { suggestBoardStatusFromAiRank } from '@/components/projects/BoardAiRecommend'

describe('suggestBoardStatusFromAiRank', () => {
  it('suggests promote for top third', () => {
    expect(suggestBoardStatusFromAiRank(1, 9)).toBe('promote')
    expect(suggestBoardStatusFromAiRank(3, 9)).toBe('promote')
  })

  it('suggests watching for middle third', () => {
    expect(suggestBoardStatusFromAiRank(5, 9)).toBe('watching')
  })

  it('suggests hold for bottom third', () => {
    expect(suggestBoardStatusFromAiRank(8, 9)).toBe('hold')
  })

  it('preserves kill', () => {
    expect(suggestBoardStatusFromAiRank(1, 9, 'kill')).toBe('kill')
  })
})
