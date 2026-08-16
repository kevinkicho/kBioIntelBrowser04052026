/**
 * SIDER wrapper must not swallow FAERS HTTP errors as honest EMPTY.
 */
jest.mock('@/lib/api/adverseevents', () => ({
  getAdverseEventsByName: jest.fn(),
}))

import { getSIDERData } from '@/lib/api/sider'
import { getAdverseEventsByName } from '@/lib/api/adverseevents'

describe('getSIDERData honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rethrows FAERS HTTP error (not EMPTY side effects)', async () => {
    ;(getAdverseEventsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    await expect(getSIDERData('aspirin')).rejects.toThrow(/HTTP 503/)
  })

  it('true empty FAERS is empty side effects', async () => {
    ;(getAdverseEventsByName as jest.Mock).mockResolvedValue([])
    const out = await getSIDERData('unknownxyz')
    expect(out.sideEffects).toEqual([])
  })

  it('maps FAERS rows to side effects', async () => {
    ;(getAdverseEventsByName as jest.Mock).mockResolvedValue([
      { reactionName: 'nausea', count: 100, serious: 2, outcome: '' },
    ])
    const out = await getSIDERData('aspirin')
    expect(out.sideEffects).toHaveLength(1)
    expect(out.sideEffects[0].sideEffectName).toBe('nausea')
  })
})