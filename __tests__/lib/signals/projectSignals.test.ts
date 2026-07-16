import type { MoleculeCandidate, Project } from '@/lib/domain'
import { saveSnapshot } from '@/lib/changeDetection'
import {
  buildCandidateSignalRow,
  projectDeepLinkOpts,
} from '@/lib/signals'

function makeCandidate(
  id: string,
  opts: { cid?: number | null; name?: string } = {},
): MoleculeCandidate {
  return {
    candidateId: id,
    identity: {
      name: opts.name ?? 'Aspirin',
      synonyms: [],
      pubchemCid: opts.cid === undefined ? 2244 : opts.cid,
      identityTrust: 'medium',
    },
    origins: ['manual'],
    evidenceBreadthSources: [],
    links: [],
    boardStatus: 'watching',
  }
}

function makeProject(candidates: MoleculeCandidate[]): Project {
  return {
    schemaVersion: 1,
    id: 'prj_test',
    name: 'Test board',
    disease: {
      id: 'd1',
      idNamespace: 'mondo',
      name: 'ATTR',
      synonyms: [],
      therapeuticAreas: [],
      xrefs: [],
      identityTrust: 'medium',
    },
    targetIds: [],
    candidates,
    packIndex: [],
    researchHypothesisIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  }
}

describe('projectSignals pure helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('projectDeepLinkOpts carries project id + disease', () => {
    const p = makeProject([])
    expect(projectDeepLinkOpts(p)).toEqual({
      projectId: 'prj_test',
      disease: 'ATTR',
    })
  })

  it('buildCandidateSignalRow: no_cid when missing PubChem', () => {
    const row = buildCandidateSignalRow(makeCandidate('x', { cid: null }), {
      clinicalTrials: 1,
    })
    expect(row.status).toBe('no_cid')
    expect(row.signals).toEqual([])
  })

  it('buildCandidateSignalRow: loading without counts', () => {
    const row = buildCandidateSignalRow(makeCandidate('c1'), null)
    expect(row.status).toBe('loading')
  })

  it('buildCandidateSignalRow: baseline when no prior snapshot', () => {
    const row = buildCandidateSignalRow(makeCandidate('c1', { cid: 2244 }), {
      clinicalTrials: 5,
    })
    expect(row.status).toBe('baseline')
    expect(row.signals).toEqual([])
  })

  it('buildCandidateSignalRow: ready with deep-linked signals', () => {
    saveSnapshot(2244, { clinicalTrials: [{}], adverseEvents: [{}, {}] })
    const row = buildCandidateSignalRow(
      makeCandidate('c1', { cid: 2244 }),
      { clinicalTrials: 4, adverseEvents: 2 },
      { projectId: 'prj_test', disease: 'ATTR' },
    )
    expect(row.status).toBe('ready')
    expect(row.signals.length).toBeGreaterThanOrEqual(1)
    const trial = row.signals.find((s) => s.key === 'clinicalTrials')
    expect(trial).toBeDefined()
    expect(trial!.href).toContain('/molecule/2244')
    expect(trial!.href).toContain('project=prj_test')
    expect(trial!.href).toContain('#clinical-trials')
  })

  it('buildCandidateSignalRow: error status', () => {
    const row = buildCandidateSignalRow(makeCandidate('c1'), null, {
      error: 'network',
    })
    expect(row.status).toBe('error')
    expect(row.error).toBe('network')
  })
})
