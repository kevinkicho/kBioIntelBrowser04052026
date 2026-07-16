import {
  mergeMoleculeCandidate,
  createDefaultScoreRubric,
  createEmptyScoreVector,
  type MoleculeCandidate,
  type ScoreVector,
} from '@/lib/domain'

function baseCandidate(overrides?: Partial<MoleculeCandidate>): MoleculeCandidate {
  return {
    candidateId: 'cid:2244',
    identity: {
      name: 'Aspirin',
      synonyms: [],
      pubchemCid: 2244,
      identityTrust: 'medium',
    },
    origins: ['dgidb'],
    evidenceBreadthSources: ['DGIdb'],
    links: [],
    boardStatus: 'untriaged',
    ...overrides,
  }
}

function scores(partial: Partial<ScoreVector['axes']> & { phase?: 'cheap' | 'full' }): ScoreVector {
  const empty = createEmptyScoreVector(partial.phase ?? 'cheap', createDefaultScoreRubric('balanced'))
  return {
    ...empty,
    axes: {
      ...empty.axes,
      efficacy: partial.efficacy ?? null,
      clinicalStage: partial.clinicalStage ?? null,
      safety: partial.safety ?? null,
      novelty: partial.novelty ?? null,
      identityTrust: partial.identityTrust ?? null,
    },
    axisStatus: {
      efficacy: partial.efficacy != null ? 'computed' : 'not-retrieved',
      clinicalStage: partial.clinicalStage != null ? 'computed' : 'not-retrieved',
      safety: partial.safety != null ? 'computed' : 'not-retrieved',
      novelty: partial.novelty != null ? 'computed' : 'not-retrieved',
      identityTrust: partial.identityTrust != null ? 'computed' : 'not-retrieved',
    },
    composite: 0.5,
    weights: createDefaultScoreRubric('balanced').weights,
  }
}

describe('mergeMoleculeCandidate', () => {
  it('prefers incoming candidateId when non-empty', () => {
    const merged = mergeMoleculeCandidate(
      baseCandidate({ candidateId: 'nm:aspirin' }),
      baseCandidate({ candidateId: 'cid:2244' }),
    )
    expect(merged.candidateId).toBe('cid:2244')
  })

  it('prefers non-empty inchiKey over empty', () => {
    const existing = baseCandidate({
      identity: {
        name: 'Aspirin',
        synonyms: [],
        pubchemCid: 2244,
        identityTrust: 'medium',
        inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
      },
    })
    const incoming = baseCandidate({
      identity: {
        name: 'Aspirin',
        synonyms: [],
        pubchemCid: 2244,
        identityTrust: 'medium',
      },
    })
    const merged = mergeMoleculeCandidate(existing, incoming)
    expect(merged.identity.inchiKey).toBe('BSYNRYMUTXBXSQ-UHFFFAOYSA-N')
  })

  it('prefers non-null pubchemCid', () => {
    const existing = baseCandidate({
      identity: {
        name: 'Aspirin',
        synonyms: [],
        pubchemCid: null,
        identityTrust: 'low',
      },
    })
    const incoming = baseCandidate()
    expect(mergeMoleculeCandidate(existing, incoming).identity.pubchemCid).toBe(2244)
  })

  it('unions alternateCids unique', () => {
    const existing = baseCandidate({
      identity: {
        name: 'Aspirin',
        synonyms: [],
        pubchemCid: 2244,
        identityTrust: 'medium',
        alternateCids: [100, 200],
      },
    })
    const incoming = baseCandidate({
      identity: {
        name: 'Aspirin',
        synonyms: [],
        pubchemCid: 2244,
        identityTrust: 'medium',
        alternateCids: [200, 300],
      },
    })
    expect(mergeMoleculeCandidate(existing, incoming).identity.alternateCids).toEqual([
      100, 200, 300,
    ])
  })

  it('prefers longer name when trust equal', () => {
    const existing = baseCandidate()
    const incoming = baseCandidate({
      identity: {
        name: 'Aspirin USP',
        synonyms: [],
        pubchemCid: 2244,
        identityTrust: 'medium',
      },
    })
    expect(mergeMoleculeCandidate(existing, incoming).identity.name).toBe('Aspirin USP')
  })

  it('prefers higher identityTrust', () => {
    const existing = baseCandidate({
      identity: {
        name: 'Aspirin',
        synonyms: [],
        pubchemCid: 2244,
        identityTrust: 'low',
      },
    })
    const incoming = baseCandidate({
      identity: {
        name: 'Aspirin',
        synonyms: [],
        pubchemCid: 2244,
        identityTrust: 'high',
        inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
      },
    })
    expect(mergeMoleculeCandidate(existing, incoming).identity.identityTrust).toBe('high')
  })

  it('unions origins and evidenceBreadthSources', () => {
    const existing = baseCandidate({
      origins: ['dgidb'],
      evidenceBreadthSources: ['DGIdb'],
    })
    const incoming = baseCandidate({
      origins: ['chembl-indication'],
      evidenceBreadthSources: ['ChEMBL'],
    })
    const merged = mergeMoleculeCandidate(existing, incoming)
    expect(merged.origins).toEqual(expect.arrayContaining(['dgidb', 'chembl-indication']))
    expect(merged.evidenceBreadthSources).toEqual(
      expect.arrayContaining(['DGIdb', 'ChEMBL']),
    )
  })

  it('dedupes links by type+targetId+diseaseId', () => {
    const existing = baseCandidate({
      links: [
        { type: 'binds-target', targetId: 'EGFR', evidenceRefIds: ['a'] },
      ],
    })
    const incoming = baseCandidate({
      links: [
        { type: 'binds-target', targetId: 'EGFR', evidenceRefIds: ['b'] },
        { type: 'indicated-for', diseaseId: 'EFO_1', evidenceRefIds: [] },
      ],
    })
    const merged = mergeMoleculeCandidate(existing, incoming)
    expect(merged.links).toHaveLength(2)
    const egfr = merged.links.find((l) => l.targetId === 'EGFR')
    expect(egfr?.evidenceRefIds).toEqual(expect.arrayContaining(['a', 'b']))
  })

  it('prefers non-null axis values; recomputes composite', () => {
    const existing = baseCandidate({
      scores: scores({ efficacy: 0.5, clinicalStage: 0.4, identityTrust: 0.33 }),
    })
    const incoming = baseCandidate({
      scores: scores({
        efficacy: 0.9,
        clinicalStage: 0.4,
        safety: 0.8,
        identityTrust: 0.66,
        phase: 'full',
      }),
    })
    const merged = mergeMoleculeCandidate(existing, incoming)
    expect(merged.scores?.axes.efficacy).toBe(0.9)
    expect(merged.scores?.axes.safety).toBe(0.8)
    expect(merged.scores?.scorePhase).toBe('full')
    expect(merged.scores?.composite).toBeGreaterThan(0)
  })

  it('unions safetyFlags by kind+label', () => {
    const existing = baseCandidate({
      scores: {
        ...scores({ efficacy: 0.5 }),
        safetyFlags: [{ kind: 'ae_burden', severity: 'warn', label: 'AE' }],
      },
    })
    const incoming = baseCandidate({
      scores: {
        ...scores({ efficacy: 0.5 }),
        safetyFlags: [
          { kind: 'ae_burden', severity: 'warn', label: 'AE' },
          { kind: 'recall', severity: 'high', label: 'Recall' },
        ],
      },
    })
    const flags = mergeMoleculeCandidate(existing, incoming).scores?.safetyFlags ?? []
    expect(flags).toHaveLength(2)
  })

  it('prefers existing boardStatus when set (board-owned triage)', () => {
    const existing = baseCandidate({ boardStatus: 'promote' })
    const incoming = baseCandidate({ boardStatus: 'kill' })
    expect(mergeMoleculeCandidate(existing, incoming).boardStatus).toBe('promote')
  })

  it('defaults boardStatus to untriaged when neither set', () => {
    const existing = baseCandidate({ boardStatus: undefined })
    const incoming = baseCandidate({ boardStatus: undefined })
    expect(mergeMoleculeCandidate(existing, incoming).boardStatus).toBe('untriaged')
  })
})
