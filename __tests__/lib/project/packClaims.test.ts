import type { MoleculeCandidate, Project } from '@/lib/domain'
import {
  PACK_MAX_CANDIDATES,
  PACK_CANDIDATE_CONCURRENCY,
  PACK_PANEL_CONCURRENCY,
  PACK_PANEL_TIMEOUT_MS,
  selectPackCandidates,
  buildBoardPackClaims,
} from '@/lib/project/packClaims'
import * as fetchCategory from '@/lib/fetchCategory'

jest.mock('@/lib/fetchCategory')

function makeCand(
  id: string,
  status: MoleculeCandidate['boardStatus'],
  cid: number | null,
): MoleculeCandidate {
  return {
    candidateId: id,
    identity: {
      name: id,
      synonyms: [],
      pubchemCid: cid,
      identityTrust: 'medium',
    },
    origins: ['chembl-indication'],
    evidenceBreadthSources: [],
    links: [],
    boardStatus: status,
  }
}

function makeProject(candidates: MoleculeCandidate[]): Project {
  return {
    schemaVersion: 1,
    id: 'prj_pack',
    name: 'Pack test',
    targetIds: [],
    candidates,
    packIndex: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('packClaims budgets', () => {
  it('exports design §6.5.3 constants', () => {
    expect(PACK_MAX_CANDIDATES).toBe(5)
    expect(PACK_CANDIDATE_CONCURRENCY).toBe(2)
    expect(PACK_PANEL_CONCURRENCY).toBe(2)
    expect(PACK_PANEL_TIMEOUT_MS).toBe(8000)
  })

  it('multi-partition fill: promote first then watching up to 5', () => {
    const cands = [
      makeCand('a', 'hold', 1),
      makeCand('b', 'promote', 2),
      makeCand('c', 'promote', null),
      makeCand('d', 'watching', 3),
      makeCand('e', 'promote', 4),
    ]
    const pick = selectPackCandidates(makeProject(cands))
    expect(pick.every((c) => c.identity.pubchemCid)).toBe(true)
    // promote b,e first; then fill watching d and hold a
    expect(pick.map((c) => c.candidateId)).toEqual(['b', 'e', 'd', 'a'])
    expect(pick).toHaveLength(4)
  })

  it('fills from watching when fewer than 5 promotes', () => {
    const pick = selectPackCandidates(
      makeProject([
        makeCand('p1', 'promote', 1),
        makeCand('w1', 'watching', 2),
        makeCand('w2', 'watching', 3),
      ]),
    )
    expect(pick.map((c) => c.candidateId)).toEqual(['p1', 'w1', 'w2'])
  })

  it('caps at 5 with promote-first multi-partition', () => {
    const cands = [
      makeCand('b', 'promote', 2),
      makeCand('e', 'promote', 4),
      makeCand('f', 'promote', 5),
      makeCand('g', 'promote', 6),
      makeCand('h', 'promote', 7),
      makeCand('d', 'watching', 3),
    ]
    const pick = selectPackCandidates(makeProject(cands))
    expect(pick).toHaveLength(PACK_MAX_CANDIDATES)
    expect(pick.every((c) => c.boardStatus === 'promote')).toBe(true)
  })
})

describe('buildBoardPackClaims', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns empty with warning when no CID candidates', async () => {
    const res = await buildBoardPackClaims(
      makeProject([makeCand('x', 'promote', null)]),
    )
    expect(res.claims).toEqual([])
    expect(res.citableCount).toBe(0)
    expect(res.warnings[0]).toMatch(/PubChem CID/)
  })

  it('uses rich golden fixture panels for claim density', async () => {
    const rich = await import('../../fixtures/discovery/core-panels-rich.json')
    const empty = await import('../../fixtures/discovery/core-panels-empty.json')
    ;(fetchCategory.fetchCategoryData as jest.Mock).mockImplementation(
      async (cid: number, cat: string) => {
        if (cid === 999) return empty as unknown as Record<string, unknown>
        if (cat === 'bioactivity-targets') {
          return {
            chemblMechanisms: rich.chemblMechanisms,
            chemblActivities: rich.chemblActivities,
          }
        }
        if (cat === 'pharmaceutical') {
          return { clinicalTrials: rich.clinicalTrials, openTargets: rich.openTargets }
        }
        if (cat === 'clinical-safety') {
          return { adverseEvents: rich.adverseEvents }
        }
        return {}
      },
    )

    const res = await buildBoardPackClaims(
      makeProject([
        makeCand('tafamidis', 'promote', 208901),
        makeCand('empty', 'watching', 999),
      ]),
    )
    expect(res.claims.length).toBeGreaterThan(0)
    expect(res.claims.some((c) => c.subjectCandidateId === 'tafamidis')).toBe(true)
  })

  it('extracts per-candidate claims with subject attribution (not merged re-extract)', async () => {
    ;(fetchCategory.fetchCategoryData as jest.Mock).mockImplementation(
      async (_cid: number, cat: string) => {
        if (cat === 'bioactivity-targets') {
          return {
            chemblMechanisms: [
              {
                mechanismId: `mech-${_cid}`,
                mechanismOfAction: 'Inhibitor',
                targetName: 'TTR',
                targetChemblId: 'CHEMBL_TTR',
              },
            ],
          }
        }
        return {}
      },
    )

    const res = await buildBoardPackClaims(
      makeProject([makeCand('cid:100', 'promote', 100), makeCand('cid:200', 'promote', 200)]),
    )

    expect(res.candidatesUsed).toHaveLength(2)
    expect(res.claims.length).toBeGreaterThanOrEqual(2)
    const subjects = new Set(res.claims.map((c) => c.subjectCandidateId))
    expect(subjects.has('cid:100')).toBe(true)
    expect(subjects.has('cid:200')).toBe(true)
    expect(res.citableCount).toBe(res.claims.length)
    expect(res.claims.every((c) => c.provenance.source && c.provenance.retrievedAt)).toBe(true)
  })
})
