import {
  buildDiscoverMiniHub,
  buildMoleculeDataHub,
  buildResearchKitClaimsMarkdown,
  buildResearchKitManifest,
  buildResearchKitReadme,
  buildResearchKitSourcesJson,
  dataHubToDelimited,
} from '@/lib/dataHub'
import type { EvidenceClaim } from '@/lib/domain'

describe('research capabilities P0–P1', () => {
  it('molecule hub includes deep lit/grant/trial/structure entity rows', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin', molecularWeight: 180 },
      {
        literature: [
          {
            title: 'Aspirin and platelets',
            year: 2020,
            journal: 'Nature',
            doi: '10.1000/test',
            pmid: '123',
          },
          { title: 'Second paper', year: 2019 },
        ],
        nihGrants: [
          {
            title: 'Aspirin mechanisms',
            piName: 'Dr Smith',
            institute: 'NIA',
            projectNumber: 'R01XX',
            startDate: '2018-01-01',
          },
        ],
        clinicalTrials: [
          {
            nctId: 'NCT999',
            title: 'Aspirin trial',
            phase: 'PHASE3',
            status: 'COMPLETED',
            conditions: ['Pain'],
            sponsor: 'Acme',
            enrollment: 500,
          },
        ],
        pdbStructures: [
          { pdbId: '1AQD', title: 'COX structure', method: 'X-RAY', resolution: '2.0' },
        ],
        uniprotEntries: [{ accession: 'P23219', proteinName: 'PTGS1', geneName: 'PTGS1' }],
      },
    )

    expect(ledger.rows.find((r) => r.id === 'lit-sample-title')?.value).toMatch(/platelets/)
    expect(ledger.rows.find((r) => r.id === 'lit-sample-year')?.value).toBe('2020')
    expect(ledger.rows.find((r) => r.id === 'lit-sample-doi')?.value).toMatch(/10\.1000|123/)
    expect(ledger.rows.find((r) => r.id === 'lit-grant-title')?.value).toMatch(/mechanisms/)
    expect(ledger.rows.find((r) => r.id === 'lit-grant-pi')?.value).toBe('Dr Smith')
    expect(ledger.rows.find((r) => r.id === 'cl-trial-title')?.value).toMatch(/Aspirin trial/)
    expect(ledger.rows.find((r) => r.id === 'cl-enrollment')?.value).toBe('500')
    expect(ledger.rows.find((r) => r.id === 'st-pdb-id')?.value).toBe('1AQD')
    expect(ledger.rows.find((r) => r.id === 'st-uniprot-acc')?.value).toBe('P23219')
    expect(ledger.sections.some((s) => s.id === 'structures')).toBe(true)
  })

  it('research kit builders produce CSV-ready hub and sources JSON', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 1, name: 'Test', formula: 'H2O' },
      { clinicalTrials: [{ nctId: 'NCT1', phase: 'P2', status: 'A', conditions: ['x'], sponsor: 'y' }] },
    )
    const csv = dataHubToDelimited(ledger, 'csv')
    expect(csv).toContain('fact')
    const sources = JSON.parse(buildResearchKitSourcesJson(ledger))
    expect(sources.total).toBeGreaterThan(0)
    expect(Array.isArray(sources.entries)).toBe(true)

    const claims: EvidenceClaim[] = [
      {
        id: 'c1',
        statement: 'Binds PTGS1 (ChEMBL sample)',
        claimType: 'binds-target',
        epistemicStatus: 'supported',
        provenance: {
          source: 'ChEMBL',
          sourceUrl: 'https://www.ebi.ac.uk/chembl/',
          retrievedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ]
    const md = buildResearchKitClaimsMarkdown(claims, 'Test')
    expect(md).toMatch(/PTGS1/)
    expect(md).toMatch(/ChEMBL/)

    const files = ['a.csv', 'b.json']
    const readme = buildResearchKitReadme(ledger, files)
    expect(readme).toMatch(/research kit/i)
    const manifest = buildResearchKitManifest(ledger, files, 1)
    expect(manifest.kind).toBe('biointel-research-kit')
    expect(manifest.claimCount).toBe(1)
    expect(manifest.schemaVersion).toBe(1)
  })

  it('discover mini hub surfaces identity and research gather facts', () => {
    const hub = buildDiscoverMiniHub({
      key: 'cid:2244',
      name: 'Aspirin',
      cid: 2244,
      chemblId: 'CHEMBL25',
      diseaseName: 'Pain',
      sources: ['ChEMBL', 'ClinicalTrials', 'DGIdb'],
      clinicalPhase: 4,
      trialCount: 12,
      targetNames: ['PTGS1', 'PTGS2'],
      geneAssociationScore: 0.8,
      identityTrust: 0.9,
    })
    expect(hub.empty).toBe(false)
    expect(hub.rows.find((r) => r.id === 'm-cid')?.value).toBe('2244')
    expect(hub.rows.find((r) => r.id === 'm-chembl')?.value).toMatch(/CHEMBL25/i)
    expect(hub.rows.find((r) => r.id === 'm-phase')?.value).toMatch(/Approved|Phase/i)
    expect(hub.rows.find((r) => r.id === 'm-targets')?.value).toMatch(/PTGS/)
    expect(hub.rows.find((r) => r.id === 'm-sources')?.value).toMatch(/ChEMBL/)
    // does not invent clinical conclusions
    expect(hub.notes.some((n) => /rank|profile/i.test(n))).toBe(true)
  })
})
