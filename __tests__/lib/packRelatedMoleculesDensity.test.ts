/**
 * Board pack density: related-molecule claims use claimType other / indicated-for
 * and sit after Core facets in preferFacetOrder — they must not starve mechanisms.
 */
import {
  DEFAULT_CLAIM_TOTAL_CAP,
  extractClaimsFromCorePanels,
} from '@/lib/evidence/extractAll'
import type { ChemblMechanism, ClinicalTrial } from '@/lib/types'

describe('pack related-molecule density vs Core extractors', () => {
  const ctx = {
    retrievedAt: '2026-01-01T00:00:00.000Z',
    moleculeName: 'TestMol',
    subjectCandidateId: 'cand-1',
  }

  it('keeps mechanism claims when related molecules flood the bag under totalCap', () => {
    const mechanisms: ChemblMechanism[] = Array.from({ length: 5 }, (_, i) => ({
      mechanismOfAction: `Inhibitor of target ${i}`,
      targetName: `Target${i}`,
      targetChemblId: `CHEMBL${1000 + i}`,
      actionType: 'INHIBITOR',
      maxPhase: 3,
      directInteraction: true,
      url: `https://www.ebi.ac.uk/chembl/target_report_card/CHEMBL${1000 + i}/`,
    }))

    const trials: ClinicalTrial[] = Array.from({ length: 5 }, (_, i) => ({
      nctId: `NCT0000000${i}`,
      title: `Trial ${i}`,
      status: 'COMPLETED',
      phase: 'PHASE3',
      conditions: ['Disease'],
      interventions: ['Drug'],
      startDate: '2020-01-01',
      completionDate: '2021-01-01',
      enrollment: 100,
      sponsor: 'Org',
    }))

    const relatedMolecules = Array.from({ length: 80 }, (_, i) => ({
      name: `Related${i}`,
      cid: 10_000 + i,
      reason: `Gene-linked association ${i}`,
      relationKind: 'gene_associated' as const,
      sources: ['Open Targets'],
    }))

    const claims = extractClaimsFromCorePanels(
      {
        chemblMechanisms: mechanisms,
        clinicalTrials: trials,
        relatedMolecules,
        diseaseName: 'Test disease',
      },
      { ...ctx, totalCap: DEFAULT_CLAIM_TOTAL_CAP, preferFacetOrder: true },
    )

    expect(claims.length).toBeLessThanOrEqual(DEFAULT_CLAIM_TOTAL_CAP)
    const mechanismsKept = claims.filter((c) => c.claimType === 'mechanism')
    expect(mechanismsKept.length).toBeGreaterThanOrEqual(5)

    // Gene-linked related sit in "other" — may be trimmed after Core facets
    const relatedKept = claims.filter((c) => c.statement.includes('related to'))
    expect(relatedKept.length).toBeLessThanOrEqual(80)
    // Cap pressure: with 80 other + Core, other should not fully displace mechanism
    expect(mechanismsKept.length + relatedKept.length).toBeLessThanOrEqual(
      DEFAULT_CLAIM_TOTAL_CAP,
    )
  })
})
