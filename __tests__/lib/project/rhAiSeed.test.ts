import {
  applyRhAiInsightToHypothesis,
  buildPromotedHypothesisShell,
  promotedCandidates,
  selectClaimsForPromoted,
} from '@/lib/project/rhAiSeed'
import { createProject } from '@/lib/project/store'
import type { EvidenceClaim, MoleculeCandidate } from '@/lib/domain'

const cand = (
  name: string,
  status: MoleculeCandidate['boardStatus'],
  id = `ch:${name}`,
): MoleculeCandidate => ({
  candidateId: id,
  identity: {
    name,
    pubchemCid: 1,
    chemblId: 'CHEMBL1',
    synonyms: [],
    identityTrust: 'high',
  },
  origins: [],
  evidenceBreadthSources: [],
  links: [],
  boardStatus: status,
})

const claim = (
  id: string,
  statement: string,
  subjectCandidateId?: string,
): EvidenceClaim => ({
  id,
  claimType: 'mechanism',
  statement,
  epistemicStatus: 'supported',
  subjectCandidateId,
  provenance: { source: 'ChEMBL', retrievedAt: '2026-04-07T00:00:00.000Z' },
})

describe('rhAiSeed', () => {
  it('promotedCandidates filters promote only', () => {
    const p = createProject({ name: 'P' })
    p.candidates = [cand('A', 'promote'), cand('B', 'hold')]
    expect(promotedCandidates(p).map((c) => c.identity.name)).toEqual(['A'])
  })

  it('selectClaimsForPromoted prefers subject attribution', () => {
    const promoted = [cand('Etoposide', 'promote', 'ch:eto')]
    const claims = [
      claim('ec:1', 'something else', 'ch:other'),
      claim('ec:2', 'Etoposide inhibits topo II', 'ch:eto'),
      claim('ec:3', 'unrelated', undefined),
    ]
    const sel = selectClaimsForPromoted(claims, promoted)
    expect(sel.map((c) => c.id)).toContain('ec:2')
    expect(sel.length).toBeLessThanOrEqual(claims.length)
  })

  it('buildPromotedHypothesisShell wires ids and empty thesis for AI fill', () => {
    const p = createProject({
      name: 'Lymphoma',
      disease: {
        id: 'd',
        idNamespace: 'name',
        name: 'lymphoma',
        synonyms: [],
        therapeuticAreas: [],
        xrefs: [],
        identityTrust: 'medium',
      },
    })
    p.candidates = [cand('Etoposide', 'promote')]
    const claims = [claim('ec:a', 'Etoposide MoA', 'ch:Etoposide')]
    const shell = buildPromotedHypothesisShell({ project: p, claims })
    expect(shell.thesis).toBe('')
    expect(shell.candidateIds).toEqual(['ch:Etoposide'])
    expect(shell.claimIds).toEqual(['ec:a'])
    expect(shell.title).toMatch(/lymphoma/i)
  })

  it('applyRhAiInsightToHypothesis writes sections and thesis', () => {
    const p = createProject({ name: 'P' })
    p.candidates = [cand('X', 'promote')]
    const shell = buildPromotedHypothesisShell({
      project: p,
      claims: [claim('ec:1', 'binds target', 'ch:X')],
    })
    const next = applyRhAiInsightToHypothesis(shell, {
      summary: 'Short summary',
      claimIds: ['ec:1'],
      sections: {
        workingClaim: 'X merits investigation via target T',
        killCriteria: ['Safety gap'],
        openQuestions: ['Exposure?'],
      },
    })
    expect(next.thesis).toContain('Working claim:')
    expect(next.thesis).toContain('X merits investigation')
    expect(next.sections?.killCriteria).toEqual(['Safety gap'])
    expect(next.title).toMatch(/X merits/)
  })
})
