/**
 * Supporting free-API extractors + denser Pack AI context.
 */

import {
  extractClaimsFromPatents,
  extractClaimsFromNihGrants,
  extractClaimsFromChemblIndications,
  extractClaimsFromDgidb,
  extractClaimsFromProperties,
  extractClaimsFromRecalls,
  extractClaimsFromCorePanels,
} from '@/lib/evidence'
import { FIXTURE_CTX, FIXTURE_CORE_PANELS } from '@/lib/evidence/fixtures/corePanels'
import {
  buildPackAiContext,
  packModeUserPrompt,
  PACK_AI_CONTEXT_CLAIM_LIMIT,
} from '@/lib/ai/contracts'
import type { EvidencePack } from '@/lib/evidence'

describe('supporting extractors', () => {
  it('maps patents, grants, indications, DGIdb, properties, recalls', () => {
    const patents = extractClaimsFromPatents(
      [
        {
          id: '1',
          patentNumber: 'US123',
          title: 'Example patent',
          filingDate: '',
          publicationDate: '',
          expirationDate: '',
          status: 'Active',
          assignee: 'Acme',
        },
      ],
      FIXTURE_CTX,
    )
    expect(patents[0].claimType).toBe('literature')
    expect(patents[0].statement).toMatch(/US123/)

    const grants = extractClaimsFromNihGrants(
      [
        {
          projectId: 'p1',
          projectNumber: 'R01X',
          title: 'Grant title',
          abstract: 'abs',
          piName: 'PI',
          institute: 'NCI',
          fundingIcg: '',
          fundingMechanism: '',
          programOfficer: '',
          startDate: '',
          endDate: '',
          fundingAmount: 1,
          totalCost: 1,
        },
      ],
      FIXTURE_CTX,
    )
    expect(grants[0].provenance.source).toMatch(/NIH/)

    const inds = extractClaimsFromChemblIndications(
      [
        {
          indicationId: 'i1',
          moleculeName: 'Aspirin',
          condition: 'Pain',
          maxPhase: 4,
          maxPhaseForIndication: 4,
          meshId: '',
          meshHeading: '',
          efoId: 'EFO_1',
          efoTerm: 'pain',
          url: 'https://www.ebi.ac.uk/chembl/',
        },
      ],
      FIXTURE_CTX,
    )
    expect(inds[0].claimType).toBe('indicated-for')

    const dgi = extractClaimsFromDgidb(
      [
        {
          drugName: 'Aspirin',
          geneSymbol: 'PTGS2',
          geneName: 'COX-2',
          interactionType: 'inhibitor',
          evidence: 'lit',
          source: 'DGIdb',
          url: 'https://www.dgidb.org/',
          score: 0.9,
        },
      ],
      FIXTURE_CTX,
    )
    expect(dgi[0].claimType).toBe('binds-target')

    const props = extractClaimsFromProperties(
      {
        xLogP: 1.2,
        tpsa: 40,
        hBondDonorCount: 1,
        hBondAcceptorCount: 2,
        complexity: 1,
        exactMass: 180,
        charge: 0,
        rotatableBondCount: 1,
      },
      FIXTURE_CTX,
    )
    expect(props[0].claimType).toBe('property')

    const recalls = extractClaimsFromRecalls(
      [
        {
          recallNumber: 'F-001',
          recallDate: '2020-01-01',
          reportDate: '',
          recallingFirm: 'Firm',
          reason: 'Contamination',
          classification: 'Class II',
          distribution: 'Nationwide',
          status: 'Completed',
        },
      ],
      FIXTURE_CTX,
    )
    expect(recalls[0].claimType).toBe('safety')
  })

  it('extractClaimsFromCorePanels includes supporting bags', () => {
    const claims = extractClaimsFromCorePanels(
      {
        ...FIXTURE_CORE_PANELS,
        patents: [
          {
            id: '1',
            patentNumber: 'US999',
            title: 'T',
            filingDate: '',
            publicationDate: '',
            expirationDate: '',
            status: '',
            assignee: '',
          },
        ],
        chemblIndications: [
          {
            indicationId: 'x',
            moleculeName: 'Aspirin',
            condition: 'Fever',
            maxPhase: 4,
            maxPhaseForIndication: 4,
            meshId: '',
            meshHeading: '',
            efoId: '',
            efoTerm: '',
            url: '',
          },
        ],
        drugGeneInteractions: [
          {
            drugName: 'Aspirin',
            geneSymbol: 'PTGS1',
            geneName: 'COX-1',
            interactionType: 'inhibitor',
            evidence: '',
            source: 'DGIdb',
            url: '',
            score: 1,
          },
        ],
      },
      FIXTURE_CTX,
    )
    expect(claims.some((c) => c.statement.includes('US999'))).toBe(true)
    expect(claims.some((c) => c.claimType === 'indicated-for')).toBe(true)
    expect(claims.some((c) => c.statement.includes('PTGS1'))).toBe(true)
  })
})

describe('Pack AI denser context', () => {
  it('exports raised claim limit and builds typed inventory', () => {
    expect(PACK_AI_CONTEXT_CLAIM_LIMIT).toBeGreaterThanOrEqual(100)

    const manyClaims = Array.from({ length: 30 }, (_, i) => ({
      id: `ec:test${i}`,
      statement: `Statement ${i}`,
      claimType: (['mechanism', 'trial', 'safety', 'literature'] as const)[i % 4],
      epistemicStatus: 'supported' as const,
      provenance: {
        source: i % 2 === 0 ? 'ChEMBL' : 'PubMed',
        retrievedAt: FIXTURE_CTX.retrievedAt,
        sourceUrl: 'https://example.com',
        quote: `quote ${i}`,
      },
    }))

    const pack = {
      title: 'Dense pack',
      claims: manyClaims,
      candidates: [],
      disease: null,
    } as unknown as Pick<EvidencePack, 'title' | 'claims' | 'candidates' | 'disease'>

    const ctx = buildPackAiContext(pack)
    expect(ctx.totalClaimCount).toBe(30)
    expect(ctx.contextClaimCount).toBe(30)
    expect(ctx.claimTypeCounts.trial).toBeGreaterThan(0)
    expect(ctx.sources).toEqual(expect.arrayContaining(['ChEMBL', 'PubMed']))
    expect(ctx.claims[0].quote).toBeTruthy()

    const user = packModeUserPrompt(ctx, 'pack_gap_analysis')
    expect(user).toMatch(/Claim types:/)
    expect(user).toMatch(/Sources:/)
    expect(user).toMatch(/Pack inventory/)
  })
})
