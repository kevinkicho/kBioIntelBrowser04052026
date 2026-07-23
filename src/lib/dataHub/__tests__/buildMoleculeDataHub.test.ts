import { buildMoleculeDataHub } from '@/lib/dataHub'

describe('buildMoleculeDataHub', () => {
  it('builds identity facts from molecule props', () => {
    const ledger = buildMoleculeDataHub(
      {
        cid: 2244,
        name: 'Aspirin',
        formula: 'C9H8O4',
        molecularWeight: 180.16,
        inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
        cas: '50-78-2',
      },
      {},
    )
    expect(ledger.rows.find((r) => r.id === 'id-name')?.value).toBe('Aspirin')
    expect(ledger.rows.find((r) => r.id === 'id-cid')?.value).toBe('2244')
    expect(ledger.rows.find((r) => r.id === 'id-formula')?.value).toBe('C9H8O4')
    expect(ledger.rows.find((r) => r.id === 'id-inchikey')?.value).toMatch(/BSYNRY/)
    expect(ledger.sourceCount).toBeGreaterThanOrEqual(1)
    expect(ledger.sections.some((s) => s.id === 'identity')).toBe(true)
  })

  it('joins multi-source clinical, target, and safety bags with provenance', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin', molecularWeight: 180 },
      {
        clinicalTrials: [
          {
            nctId: 'NCT00000001',
            phase: 'PHASE3',
            status: 'COMPLETED',
            conditions: ['Pain'],
            sponsor: 'Acme',
          },
        ],
        chemblActivities: [
          {
            targetName: 'PTGS1',
            pchemblValue: 6.2,
            standardType: 'IC50',
            standardValue: 500,
            standardUnits: 'nM',
            url: 'https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL25',
          },
        ],
        chemblMechanisms: [
          {
            mechanismOfAction: 'Cyclooxygenase inhibitor',
            actionType: 'INHIBITOR',
            targetName: 'PTGS1',
            url: 'https://www.ebi.ac.uk/chembl/',
          },
        ],
        drugGeneInteractions: [{ geneSymbol: 'PTGS2', interactionType: 'inhibitor' }],
        adverseEvents: [{ reactionName: 'Nausea', count: 12 }],
        orangeBookEntries: [
          {
            tradeName: 'ASPIRIN',
            activeIngredient: 'ASPIRIN',
            applicationNumber: 'NDA001',
            approvalDate: '1950-01-01',
          },
        ],
        literature: [{ title: 'Aspirin and platelets', url: 'https://europepmc.org/article/MED/1' }],
      },
    )

    expect(ledger.empty).toBe(false)
    expect(ledger.sourceCount).toBeGreaterThanOrEqual(4)

    const nct = ledger.rows.find((r) => r.id === 'cl-sample-nct')
    expect(nct?.value).toBe('NCT00000001')
    expect(nct?.source).toMatch(/ClinicalTrials/i)
    expect(nct?.sourceUrl).toContain('NCT00000001')

    const act = ledger.rows.find((r) => r.id === 'tg-best-act')
    expect(act?.value).toMatch(/PTGS1/)
    expect(act?.source).toBe('ChEMBL')

    const mech = ledger.rows.find((r) => r.id === 'tg-mech')
    expect(mech?.value).toMatch(/Cyclooxygenase/i)

    const ae = ledger.rows.find((r) => r.id === 'sf-faers-top')
    expect(ae?.value).toBe('Nausea')
    expect(ae?.source).toMatch(/FAERS/i)

    const ob = ledger.rows.find((r) => r.id === 'reg-orange-trade')
    expect(ob?.value).toBe('ASPIRIN')
    expect(ob?.source).toMatch(/Orange Book/i)

    // Every non-empty non-identity row must name a source
    for (const r of ledger.rows) {
      if (r.value === '—') continue
      expect(r.source.length).toBeGreaterThan(0)
    }
  })

  it('does not invent values when bags are empty', () => {
    const ledger = buildMoleculeDataHub({ cid: 1, name: 'X' }, {})
    const clinical = ledger.rows.filter((r) => r.domain === 'clinical')
    expect(clinical.every((r) => r.value === '—')).toBe(true)
  })
})
