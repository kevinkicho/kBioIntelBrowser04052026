import {
  buildDiseaseDataHub,
  buildGeneDataHub,
  buildMoleculeDataHub,
  buildOrgDataHub,
  buildSourceDirectory,
  dataHubExportFilename,
  dataHubToDelimited,
  isDataHubValueEmpty,
} from '@/lib/dataHub'

describe('data hub extended', () => {
  it('molecule hub extracts ATC / ChEMBL / RxCUI entity keys when present', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin', molecularWeight: 180, inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N' },
      {
        atcClassifications: [
          {
            code: 'N02BA01',
            name: 'Acetylsalicylic acid',
            classType: 'ATC5',
            url: 'https://atcddd.fhi.no/atc_ddd_index/?code=N02BA01',
            rxcui: '1191',
          },
        ],
        mychemAnnotations: [
          {
            chemblId: 'CHEMBL25',
            chebiId: 'CHEBI:15365',
            drugbankId: 'DB00945',
            name: 'Aspirin',
            url: 'https://mychem.info/v1/chem/BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
          },
        ],
        gsrsSubstances: [{ unii: 'R16CO5Y76E' }],
        chemblActivities: [{ chemblId: 'CHEMBL25', targetName: 'PTGS1', pchemblValue: 6 }],
      },
    )
    expect(ledger.rows.find((r) => r.id === 'key-atc')?.value).toBe('N02BA01')
    expect(ledger.rows.find((r) => r.id === 'key-chembl')?.value).toMatch(/CHEMBL25/i)
    expect(ledger.rows.find((r) => r.id === 'key-chebi')?.value).toMatch(/15365/)
    expect(ledger.rows.find((r) => r.id === 'key-drugbank')?.value).toMatch(/DB00945/i)
    expect(ledger.rows.find((r) => r.id === 'key-unii')?.value).toBe('R16CO5Y76E')
    expect(ledger.sections.some((s) => s.id === 'keys')).toBe(true)
  })

  it('gene / disease / org builders produce multi-source facts', () => {
    const gene = buildGeneDataHub({
      symbol: 'TTR',
      name: 'transthyretin',
      ncbiGeneId: '7276',
      gtexCount: 10,
      disgenetCount: 5,
      topDisease: 'Amyloidosis',
      dgidbDrugCount: 3,
      topDrug: 'Tafamidis',
    })
    expect(gene.empty).toBe(false)
    expect(gene.rows.find((r) => r.id === 'g-symbol')?.value).toBe('TTR')
    expect(gene.rows.find((r) => r.id === 'g-disease-sample')?.value).toBe('Amyloidosis')
    expect(gene.sourceCount).toBeGreaterThanOrEqual(3)

    const disease = buildDiseaseDataHub({
      diseaseId: 'EFO_0000001',
      diseaseName: 'ATTR amyloidosis',
      geneCount: 4,
      topGenes: ['TTR', 'APOA1'],
      trialDrugCount: 2,
      topTrialDrugs: ['Tafamidis'],
      openTargetsHit: true,
    })
    expect(disease.rows.find((r) => r.id === 'd-genes-sample')?.value).toMatch(/TTR/)
    expect(disease.sourceCount).toBeGreaterThanOrEqual(2)

    const org = buildOrgDataHub({
      id: 'harvard',
      name: 'Harvard University',
      kind: 'university',
      rorCount: 1,
      sampleRorName: 'Harvard University',
      sampleRorId: '00dwzs593',
      grantCount: 5,
      collegeCount: 1,
    })
    expect(org.rows.find((r) => r.id === 'o-ror-sample')?.value).toMatch(/Harvard/)
    expect(org.sourceCount).toBeGreaterThanOrEqual(2)
  })

  it('export CSV/TSV includes headers and escapes values', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 1, name: 'Test, Drug', formula: 'C2H6O' },
      { clinicalTrials: [{ nctId: 'NCT1', phase: 'PHASE2', status: 'ACTIVE', conditions: ['X'], sponsor: 'Y' }] },
    )
    const csv = dataHubToDelimited(ledger, 'csv')
    expect(csv).toContain('section')
    expect(csv).toContain('fact')
    expect(csv).toContain('Test, Drug')
    expect(csv.charCodeAt(0)).toBe(0xfeff) // BOM
    const tsv = dataHubToDelimited(ledger, 'tsv')
    expect(tsv.split('\n')[0]).toContain('\t')
    expect(dataHubExportFilename(ledger, 'csv')).toMatch(/\.csv$/)
    expect(dataHubExportFilename(ledger, 'tsv')).toMatch(/\.tsv$/)
  })

  it('source directory ranks sources with data first', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin' },
      {
        clinicalTrials: [{ nctId: 'NCT1', phase: 'P3', status: 'C', conditions: ['pain'], sponsor: 'A' }],
        adverseEvents: [{ reactionName: 'Nausea', count: 2 }],
      },
    )
    const dir = buildSourceDirectory(ledger)
    expect(dir.total).toBeGreaterThan(0)
    expect(dir.withData).toBeGreaterThan(0)
    expect(dir.entries[0]!.factCount).toBeGreaterThan(0)
    expect(dir.entries.every((e) => e.source.length > 0)).toBe(true)
  })

  it('isDataHubValueEmpty treats dashes as empty', () => {
    expect(isDataHubValueEmpty('—')).toBe(true)
    expect(isDataHubValueEmpty('Aspirin')).toBe(false)
  })
})
