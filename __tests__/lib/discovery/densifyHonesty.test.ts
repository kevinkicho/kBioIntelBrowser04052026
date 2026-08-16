/**
 * Discover densify must mark BindingDB / NIH RePORTER HTTP failure as failed,
 * not as honest zero-hit empty-success.
 */
jest.mock('@/lib/api/patents', () => ({ getPatentsByMoleculeName: jest.fn() }))
jest.mock('@/lib/api/openalex', () => ({ getOpenAlexWorksByName: jest.fn() }))
jest.mock('@/lib/api/bindingdb', () => ({ getBindingAffinitiesByName: jest.fn() }))
jest.mock('@/lib/api/semantic-scholar', () => ({ getSemanticPapersByName: jest.fn() }))
jest.mock('@/lib/api/nihreporter', () => ({ getNihGrantsByName: jest.fn() }))
jest.mock('@/lib/api/europepmc', () => ({ getLiteratureHitCount: jest.fn() }))

import { harvestBreadthForName } from '@/lib/discovery/densifyBreadth'
import { getPatentsByMoleculeName } from '@/lib/api/patents'
import { getOpenAlexWorksByName } from '@/lib/api/openalex'
import { getBindingAffinitiesByName } from '@/lib/api/bindingdb'
import { getSemanticPapersByName } from '@/lib/api/semantic-scholar'
import { getNihGrantsByName } from '@/lib/api/nihreporter'
import { getLiteratureHitCount } from '@/lib/api/europepmc'

describe('densify breadth honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getPatentsByMoleculeName as jest.Mock).mockResolvedValue([])
    ;(getOpenAlexWorksByName as jest.Mock).mockResolvedValue([])
    ;(getBindingAffinitiesByName as jest.Mock).mockResolvedValue([])
    ;(getSemanticPapersByName as jest.Mock).mockResolvedValue([])
    ;(getNihGrantsByName as jest.Mock).mockResolvedValue([])
    ;(getLiteratureHitCount as jest.Mock).mockResolvedValue(0)
  })

  it('NIH RePORTER HTTP throw sets failed (not empty-success)', async () => {
    ;(getNihGrantsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const row = await harvestBreadthForName('aspirin', { skipEuropePmc: true })
    expect(row.failed).toBe(true)
    expect(row.nihGrantCount).toBe(0)
  })

  it('BindingDB HTTP throw sets failed (not empty-success)', async () => {
    ;(getBindingAffinitiesByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const row = await harvestBreadthForName('aspirin', { skipEuropePmc: true })
    expect(row.failed).toBe(true)
    expect(row.bindingDbCount).toBe(0)
  })

  it('true empty NIH + BindingDB is not failed', async () => {
    const row = await harvestBreadthForName('aspirin', { skipEuropePmc: true })
    expect(row.failed).toBe(false)
    expect(row.nihGrantCount).toBe(0)
    expect(row.bindingDbCount).toBe(0)
  })
})
