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

  it('selectPackCandidates prefers promote with CID, caps at 5', () => {
    const cands = [
      makeCand('a', 'hold', 1),
      makeCand('b', 'promote', 2),
      makeCand('c', 'promote', null),
      makeCand('d', 'watching', 3),
      makeCand('e', 'promote', 4),
      makeCand('f', 'promote', 5),
      makeCand('g', 'promote', 6),
      makeCand('h', 'promote', 7),
    ]
    const pick = selectPackCandidates(makeProject(cands))
    expect(pick.every((c) => c.boardStatus === 'promote')).toBe(true)
    expect(pick.every((c) => c.identity.pubchemCid)).toBe(true)
    expect(pick).toHaveLength(PACK_MAX_CANDIDATES)
    expect(pick.map((c) => c.candidateId)).toEqual(['b', 'e', 'f', 'g', 'h'])
  })

  it('falls back to watching then any with CID', () => {
    const watchingOnly = selectPackCandidates(
      makeProject([makeCand('w', 'watching', 9), makeCand('h', 'hold', 10)]),
    )
    expect(watchingOnly.map((c) => c.candidateId)).toEqual(['w'])

    const anyCid = selectPackCandidates(
      makeProject([makeCand('h', 'hold', 11), makeCand('k', 'kill', 12)]),
    )
    expect(anyCid).toHaveLength(2)
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
