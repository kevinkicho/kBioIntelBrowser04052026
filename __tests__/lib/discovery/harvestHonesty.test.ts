/**
 * Discover harvest must mark openFDA AE/recalls / EuropePMC HTTP failure as error,
 * not honest empty — otherwise rank treats an outage as zero AE / zero recalls / zero papers.
 */
jest.mock('@/lib/api/adverseevents', () => ({
  getAdverseEventsByName: jest.fn(),
}))
jest.mock('@/lib/api/recalls', () => ({
  getDrugRecallsByName: jest.fn(),
}))
jest.mock('@/lib/api/europepmc', () => ({
  getLiteratureHitCount: jest.fn(),
}))

import { harvestCandidateAxes } from '@/lib/discovery/harvest'
import { getAdverseEventsByName } from '@/lib/api/adverseevents'
import { getDrugRecallsByName } from '@/lib/api/recalls'
import { getLiteratureHitCount } from '@/lib/api/europepmc'
import { createDefaultScoreRubric } from '@/lib/domain/score'

const rubric = createDefaultScoreRubric()

describe('harvestCandidateAxes honesty', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getDrugRecallsByName as jest.Mock).mockResolvedValue([])
  })

  it('openFDA HTTP 503 is safety error, not empty-safe', async () => {
    ;(getAdverseEventsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    ;(getLiteratureHitCount as jest.Mock).mockResolvedValue(12)
    const out = await harvestCandidateAxes([{ name: 'Aspirin' }], {
      rubric,
      runNovelty: false,
      safetyTimeoutMs: 0,
    })
    expect(out.candidates[0].safety.status).toBe('error')
    expect(out.candidates[0].scores.axes.safety).toBeNull()
    const safetyStatus = out.sourceStatuses.find((s) => s.source.includes('openFDA'))
    expect(safetyStatus?.status).toBe('error')
    expect(out.warnings.some((w) => /Safety harvest/i.test(w))).toBe(true)
  })

  it('openFDA recalls HTTP 503 is safety error, not empty-safe', async () => {
    ;(getAdverseEventsByName as jest.Mock).mockResolvedValue([])
    ;(getDrugRecallsByName as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const out = await harvestCandidateAxes([{ name: 'Aspirin' }], {
      rubric,
      runNovelty: false,
      safetyTimeoutMs: 0,
    })
    expect(out.candidates[0].safety.status).toBe('error')
    expect(out.candidates[0].scores.axes.safety).toBeNull()
    const safetyStatus = out.sourceStatuses.find((s) => s.source.includes('openFDA'))
    expect(safetyStatus?.status).toBe('error')
    expect(out.warnings.some((w) => /Safety harvest/i.test(w))).toBe(true)
  })

  it('true zero FAERS is empty, not error', async () => {
    ;(getAdverseEventsByName as jest.Mock).mockResolvedValue([])
    const out = await harvestCandidateAxes([{ name: 'Unknownxyz' }], {
      rubric,
      runNovelty: false,
      safetyTimeoutMs: 0,
    })
    expect(out.candidates[0].safety.status).toBe('empty')
    const safetyStatus = out.sourceStatuses.find((s) => s.source.includes('openFDA'))
    expect(safetyStatus?.status).toBe('empty')
  })

  it('EuropePMC HTTP 503 is novelty error, not 0-as-success', async () => {
    ;(getAdverseEventsByName as jest.Mock).mockResolvedValue([])
    ;(getLiteratureHitCount as jest.Mock).mockRejectedValue(new Error('HTTP 503'))
    const out = await harvestCandidateAxes([{ name: 'Aspirin' }], {
      rubric,
      runSafety: false,
      noveltyTimeoutMs: 0,
    })
    expect(out.candidates[0].novelty.status).toBe('error')
    expect(out.candidates[0].scores.axes.novelty).toBeNull()
    const noveltyStatus = out.sourceStatuses.find((s) => s.source.includes('EuropePMC'))
    expect(noveltyStatus?.status).toBe('error')
    expect(out.warnings.some((w) => /Novelty harvest/i.test(w))).toBe(true)
  })

  it('true zero literature hits is empty/computed, not error', async () => {
    ;(getLiteratureHitCount as jest.Mock).mockResolvedValue(0)
    const out = await harvestCandidateAxes([{ name: 'Unknownxyz' }], {
      rubric,
      runSafety: false,
      noveltyTimeoutMs: 0,
    })
    expect(out.candidates[0].novelty.status).not.toBe('error')
    const noveltyStatus = out.sourceStatuses.find((s) => s.source.includes('EuropePMC'))
    expect(noveltyStatus?.status).not.toBe('error')
  })
})