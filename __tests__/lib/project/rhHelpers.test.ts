import {
  buildEvidenceGapMap,
  buildMechanismStoryboard,
  rhTemplateThesis,
  sectionsToThesis,
  researchHypothesisToLabMeetingMd,
  seedRhFromTemplate,
  seedRhFromPromoted,
} from '@/lib/project/rhHelpers'
import { createProject } from '@/lib/project/store'
import type { EvidenceClaim, MoleculeCandidate } from '@/lib/domain'

const claim = (
  id: string,
  claimType: EvidenceClaim['claimType'],
  statement: string,
): EvidenceClaim => ({
  id,
  claimType,
  statement,
  epistemicStatus: 'supported',
  provenance: { source: 'test', retrievedAt: '2026-04-07T12:00:00.000Z' },
})

const cand = (name: string, status?: MoleculeCandidate['boardStatus']): MoleculeCandidate => ({
  candidateId: `ch:${name}`,
  identity: {
    name,
    pubchemCid: 2244,
    chemblId: 'CHEMBL25',
    synonyms: [],
    identityTrust: 'high',
  },
  origins: [],
  evidenceBreadthSources: [],
  links: [],
  boardStatus: status,
})

describe('buildEvidenceGapMap', () => {
  it('flags missing facets when claims empty', () => {
    const gaps = buildEvidenceGapMap({ claims: [], diseaseName: 'pain' })
    expect(gaps.some((g) => g.id === 'gap_empty')).toBe(true)
    expect(gaps.some((g) => g.facet === 'mechanism')).toBe(true)
  })

  it('does not flag facets that exist', () => {
    const claims = [
      claim('ec:1', 'mechanism', 'inhibits COX'),
      claim('ec:2', 'binds-target', 'binds COX1'),
      claim('ec:3', 'indicated-for', 'pain'),
      claim('ec:4', 'trial', 'NCT1'),
      claim('ec:5', 'safety', 'GI bleed'),
    ]
    const gaps = buildEvidenceGapMap({
      claims,
      candidates: [cand('Aspirin')],
      diseaseName: 'pain',
      targetIds: ['PTGS1'],
    })
    expect(gaps.find((g) => g.facet === 'mechanism')).toBeUndefined()
    expect(gaps.find((g) => g.id === 'gap_empty')).toBeUndefined()
  })
})

describe('buildMechanismStoryboard', () => {
  it('builds four nodes', () => {
    const sb = buildMechanismStoryboard({
      diseaseName: 'pain',
      targetIds: ['PTGS1'],
      candidates: [cand('Aspirin')],
      claims: [claim('ec:1', 'mechanism', 'x'), claim('ec:2', 'trial', 'y')],
    })
    expect(sb.nodes).toHaveLength(4)
    expect(sb.edges).toHaveLength(3)
    expect(sb.nodes[0].label).toBe('pain')
  })
})

describe('templates and seeds', () => {
  it('rhTemplateThesis repurposing includes working claim', () => {
    const t = rhTemplateThesis('repurposing', {
      diseaseName: 'T2D',
      candidateName: 'Aspirin',
      targetSymbol: 'PTGS1',
    })
    expect(t.thesis).toContain('Aspirin')
    expect(t.sections?.workingClaim).toBeTruthy()
  })

  it('seedRhFromPromoted uses promote board status', () => {
    const project = createProject({
      name: 'P',
      disease: {
        id: 'd1',
        idNamespace: 'name',
        name: 'pain',
        synonyms: [],
        therapeuticAreas: [],
        xrefs: [],
        identityTrust: 'medium',
      },
    })
    project.candidates = [cand('A', 'promote'), cand('B', 'hold')]
    const hyp = seedRhFromPromoted({ projectId: project.id, project })
    expect(hyp.candidateIds).toEqual(['ch:A'])
    expect(hyp.status).toBe('draft')
  })

  it('seedRhFromTemplate sets sections', () => {
    const project = createProject({ name: 'P' })
    project.candidates = [cand('Aspirin', 'promote')]
    project.targetIds = ['PTGS1']
    const hyp = seedRhFromTemplate({
      projectId: project.id,
      templateId: 'safety-first-kill',
      project,
    })
    expect(hyp.sections?.killCriteria?.length).toBeGreaterThan(0)
  })
})

describe('sectionsToThesis / export', () => {
  it('sectionsToThesis formats blocks', () => {
    const t = sectionsToThesis({
      workingClaim: 'X modulates Y',
      killCriteria: ['AE cluster'],
      claimIds: ['ec:1'],
    })
    expect(t).toContain('Working claim:')
    expect(t).toContain('Kill criteria')
    expect(t).toContain('ec:1')
  })

  it('lab meeting md includes title', () => {
    const md = researchHypothesisToLabMeetingMd({
      id: 'rh1',
      projectId: 'p1',
      version: 2,
      title: 'Test RH',
      thesis: 'Hello thesis',
      targetIds: [],
      candidateIds: [],
      claimIds: [],
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
    expect(md).toContain('Test RH')
    expect(md).toContain('Hello thesis')
    expect(md).toContain('Investigation priority')
  })
})
