import type { EvidenceClaim, Project, ResearchHypothesis } from '@/lib/domain'
import { orderClaimsByIds, rehydrateClaimsForHypothesis } from '@/lib/project/rehydrateClaims'
import * as packCache from '@/lib/project/packCache'
import * as packClaims from '@/lib/project/packClaims'

jest.mock('@/lib/project/packCache')
jest.mock('@/lib/project/packClaims')

function makeClaim(id: string, statement: string): EvidenceClaim {
  return {
    id,
    statement,
    claimType: 'mechanism',
    epistemicStatus: 'supported',
    provenance: { source: 'test', retrievedAt: new Date().toISOString() },
  }
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    schemaVersion: 1,
    id: 'prj_test',
    name: 'Test',
    targetIds: [],
    candidates: [
      {
        candidateId: 'cid:1',
        identity: {
          name: 'Drug',
          synonyms: [],
          pubchemCid: 1,
          identityTrust: 'medium',
        },
        origins: ['chembl-indication'],
        evidenceBreadthSources: [],
        links: [],
        boardStatus: 'promote',
      },
    ],
    packIndex: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeHyp(overrides: Partial<ResearchHypothesis> = {}): ResearchHypothesis {
  return {
    id: 'rh_1',
    projectId: 'prj_test',
    version: 1,
    title: 'H',
    thesis: 'T',
    targetIds: [],
    candidateIds: ['cid:1'],
    claimIds: ['cl_a', 'cl_b'],
    packId: 'pack_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('orderClaimsByIds', () => {
  it('preserves claim id order', () => {
    const map = new Map([
      ['cl_b', makeClaim('cl_b', 'B')],
      ['cl_a', makeClaim('cl_a', 'A')],
    ])
    expect(orderClaimsByIds(['cl_a', 'cl_b'], map).map((c) => c.statement)).toEqual(['A', 'B'])
  })

  it('skips missing ids', () => {
    const map = new Map([['cl_a', makeClaim('cl_a', 'A')]])
    expect(orderClaimsByIds(['cl_a', 'cl_missing'], map)).toHaveLength(1)
  })
})

describe('rehydrateClaimsForHypothesis', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns none when no claim ids', async () => {
    const res = await rehydrateClaimsForHypothesis(makeHyp({ claimIds: [] }), makeProject())
    expect(res.source).toBe('none')
    expect(res.claims).toEqual([])
  })

  it('prefers IDB pack cache when pack has matching claims', async () => {
    ;(packCache.getPackFromCache as jest.Mock).mockResolvedValue({
      id: 'pack_1',
      claims: [makeClaim('cl_a', 'From IDB A'), makeClaim('cl_b', 'From IDB B')],
    })
    const res = await rehydrateClaimsForHypothesis(makeHyp(), makeProject())
    expect(res.source).toBe('idb')
    expect(res.claims.map((c) => c.statement)).toEqual(['From IDB A', 'From IDB B'])
    expect(packClaims.buildBoardPackClaims).not.toHaveBeenCalled()
  })

  it('falls back to rebuild when IDB miss', async () => {
    ;(packCache.getPackFromCache as jest.Mock).mockResolvedValue(null)
    ;(packClaims.buildBoardPackClaims as jest.Mock).mockResolvedValue({
      claims: [makeClaim('cl_a', 'Rebuilt A'), makeClaim('cl_b', 'Rebuilt B')],
      warnings: [],
    })
    const res = await rehydrateClaimsForHypothesis(makeHyp(), makeProject())
    expect(res.source).toBe('rebuild')
    expect(res.claims[0].statement).toBe('Rebuilt A')
  })

  it('reports none when rebuild yields no claims', async () => {
    ;(packCache.getPackFromCache as jest.Mock).mockResolvedValue(null)
    ;(packClaims.buildBoardPackClaims as jest.Mock).mockResolvedValue({
      claims: [],
      warnings: ['No panels'],
    })
    const res = await rehydrateClaimsForHypothesis(makeHyp(), makeProject())
    expect(res.source).toBe('none')
    expect(res.error).toMatch(/No panels|Could not rebuild/)
  })
})
