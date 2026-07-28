import {
  runOrphanetPinPipeline,
  runPackExtractPipeline,
} from '@/lib/pipeline'
import type { Project } from '@/lib/domain'

jest.mock('@/lib/clientFetch', () => ({
  clientFetch: jest.fn(),
}))

jest.mock('@/lib/project/packClaims', () => ({
  buildBoardPackClaims: jest.fn(),
}))

import { clientFetch } from '@/lib/clientFetch'
import { buildBoardPackClaims } from '@/lib/project/packClaims'

const mockFetch = clientFetch as jest.MockedFunction<typeof clientFetch>
const mockBuild = buildBoardPackClaims as jest.MockedFunction<typeof buildBoardPackClaims>

describe('runOrphanetPinPipeline', () => {
  beforeEach(() => mockFetch.mockReset())

  it('merges Orphanet genes into existing pins', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        genes: ['TTR', 'RBP4'],
        orphaCode: 'ORPHA:123',
        diseaseName: 'ATTR',
      }),
    } as Response)

    const out = await runOrphanetPinPipeline({
      diseaseName: 'ATTR amyloidosis',
      existingTargets: ['TTR'],
    })
    expect(out.ok).toBe(true)
    expect(out.mergedTargets).toEqual(expect.arrayContaining(['TTR', 'RBP4']))
    expect(out.provenance.added).toBe(1)
    expect(out.pipeline.ok).toBe(true)
  })

  it('non-fatal on HTTP error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response)

    const out = await runOrphanetPinPipeline({
      diseaseName: 'ATTR',
      existingTargets: ['TTR'],
    })
    expect(out.ok).toBe(false)
    expect(out.mergedTargets).toEqual(['TTR'])
    expect(out.provenance.error).toMatch(/503|Orphanet/i)
  })
})

describe('runPackExtractPipeline', () => {
  beforeEach(() => mockBuild.mockReset())

  it('wraps buildBoardPackClaims with pipeline report', async () => {
    mockBuild.mockResolvedValue({
      panels: {},
      claims: [
        {
          id: 'c1',
          statement: 'test claim',
          claimType: 'mechanism',
          subjectCandidateId: 'x',
        } as never,
      ],
      landscapeClaims: [],
      claimIds: ['c1'],
      candidatesUsed: [],
      warnings: [],
      citableCount: 1,
    })

    const project = {
      schemaVersion: 1,
      id: 'p1',
      name: 't',
      targetIds: [],
      candidates: [],
      packIndex: [],
      createdAt: '',
      updatedAt: '',
    } as Project

    const out = await runPackExtractPipeline({ project })
    expect(out.claims).toHaveLength(1)
    expect(out.pipeline.ok).toBe(true)
    expect(out.pipeline.stages.some((s) => s.id === 'build_board_claims')).toBe(true)
  })
})
