import {
  buildDiscoverCandidateCrossSource,
  buildDiseaseCrossSource,
  buildGeneCrossSource,
  buildMoleculeCrossSource,
  buildOrgDossierCrossSource,
  countActiveSources,
  isFactEmpty,
  moleculeCrossSourceActiveGroupCount,
} from '@/lib/crossSource'

describe('crossSource', () => {
  it('buildMoleculeCrossSource joins multiple free-API bags with per-source facts', () => {
    const bundle = buildMoleculeCrossSource('2244', 'Aspirin', {
      clinicalTrials: [{ nctId: 'NCT1', sponsor: 'Acme Pharma' }],
      isrctnTrials: [{}],
      adverseEvents: [{}, {}],
      chemblActivities: [{ targetName: 'PTGS1' }],
      drugGeneInteractions: [{ geneSymbol: 'PTGS2' }],
      literature: [{}, {}, {}],
      openAlexWorks: [{}],
      researchOrgs: [{ id: 'ror:1' }],
    })
    expect(bundle.empty).toBe(false)
    expect(bundle.sourceCount).toBeGreaterThanOrEqual(4)
    expect(moleculeCrossSourceActiveGroupCount(bundle)).toBeGreaterThanOrEqual(3)
    const trialFact = bundle.facts.find((f) => f.id === 'ct-trials')
    expect(trialFact?.source).toMatch(/ClinicalTrials/i)
    expect(trialFact?.panelId).toBe('clinical-trials')
    expect(bundle.facts.find((f) => f.id === 'top-gene')?.value).toBe('PTGS2')
  })

  it('buildMoleculeCrossSource empty when no data', () => {
    const bundle = buildMoleculeCrossSource('1', 'X', {})
    expect(bundle.empty).toBe(true)
    expect(bundle.sourceCount).toBe(0)
  })

  it('buildDiscoverCandidateCrossSource surfaces multi-source gather', () => {
    const bundle = buildDiscoverCandidateCrossSource({
      key: 'cid:1',
      name: 'DrugA',
      sources: ['DGIdb', 'ClinicalTrials', 'ChEMBL'],
      clinicalPhase: 3,
      trialCount: 4,
      targetNames: ['TTR'],
    })
    expect(bundle.empty).toBe(false)
    expect(bundle.sourceCount).toBeGreaterThanOrEqual(2)
    expect(bundle.facts.some((f) => f.id === 'trials')).toBe(true)
  })

  it('buildGeneCrossSource keeps sources as separate chips', () => {
    const bundle = buildGeneCrossSource({
      symbol: 'TTR',
      gtexCount: 10,
      bgeeCount: 5,
      expressionAtlasCount: 2,
      clinvarCount: 3,
      disgenetCount: 7,
      dgidbDrugCount: 4,
    })
    expect(bundle.empty).toBe(false)
    expect(bundle.groups.map((g) => g.id)).toEqual(
      expect.arrayContaining(['expression', 'variants', 'disease']),
    )
    expect(bundle.facts.find((f) => f.id === 'gtex')?.source).toBe('GTEx')
    expect(bundle.facts.find((f) => f.id === 'bgee')?.source).toBe('Bgee')
  })

  it('buildDiseaseCrossSource and buildOrgDossierCrossSource report multi-source', () => {
    const d = buildDiseaseCrossSource({
      diseaseId: 'EFO_1',
      diseaseName: 'ATTR',
      geneCount: 5,
      trialDrugCount: 3,
      moleculeCount: 8,
      openTargetsHit: true,
    })
    expect(d.sourceCount).toBeGreaterThanOrEqual(2)

    const o = buildOrgDossierCrossSource({
      id: 'harvard',
      name: 'Harvard',
      rorCount: 2,
      openAlexCount: 1,
      collegeCount: 1,
      grantCount: 4,
      affiliationEdgeCount: 3,
    })
    expect(o.empty).toBe(false)
    expect(o.sourceCount).toBeGreaterThanOrEqual(3)
  })

  it('isFactEmpty and countActiveSources', () => {
    expect(isFactEmpty({ id: 'a', label: 'x', value: 0, source: 'S', kind: 'count' })).toBe(true)
    expect(isFactEmpty({ id: 'b', label: 'x', value: 3, source: 'S', kind: 'count' })).toBe(false)
    expect(
      countActiveSources([
        { id: 'a', label: 'x', value: 1, source: 'A', kind: 'count' },
        { id: 'b', label: 'y', value: 2, source: 'A', kind: 'count' },
        { id: 'c', label: 'z', value: 0, source: 'B', kind: 'count' },
      ]),
    ).toBe(1)
  })
})
