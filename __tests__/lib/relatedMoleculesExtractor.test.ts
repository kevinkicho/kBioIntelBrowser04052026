import { extractClaimsFromRelatedMolecules } from '@/lib/evidence/extractors/relatedMolecules'

describe('extractClaimsFromRelatedMolecules', () => {
  const ctx = { retrievedAt: '2026-01-01T00:00:00.000Z', moleculeName: 'X' }

  it('maps known drugs to indicated-for claims with reason', () => {
    const claims = extractClaimsFromRelatedMolecules(
      [
        {
          name: 'Metformin',
          cid: 4091,
          reason: 'Open Targets known drug for diabetes',
          relationKind: 'known_drug',
          sources: ['Open Targets'],
        },
      ],
      { ...ctx, diseaseName: 'Type 2 diabetes' },
    )
    expect(claims).toHaveLength(1)
    expect(claims[0].claimType).toBe('indicated-for')
    expect(claims[0].statement).toMatch(/Metformin/)
    expect(claims[0].statement).toMatch(/Open Targets known drug/)
    expect(claims[0].subjectCandidateId).toBeUndefined()
  })

  it('maps gene-linked as other claims', () => {
    const claims = extractClaimsFromRelatedMolecules(
      [
        {
          name: 'Some protein',
          cid: null,
          reason: 'Disease-associated gene BRCA1',
          relationKind: 'gene_associated',
        },
      ],
      { ...ctx, diseaseName: 'Breast cancer' },
    )
    expect(claims[0].claimType).toBe('other')
    // Retrieved association — weak signal is claimType/reason, not epistemic empty
    expect(claims[0].epistemicStatus).toBe('supported')
  })
})
