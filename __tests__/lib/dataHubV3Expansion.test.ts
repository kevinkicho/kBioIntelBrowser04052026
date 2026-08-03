/**
 * v3 expansion: safety triangulation, five-regulator card, citation score, campaigns.
 */

import { buildMoleculeDataHub } from '@/lib/dataHub'
import { buildSafetyTriangulation } from '@/lib/dataHub/safetyTriangulation'
import { buildFiveRegulatorCard } from '@/lib/dataHub/fiveRegulatorCard'
import {
  scoreHubCitationCompleteness,
  scoreClaimCitationCompleteness,
} from '@/lib/dataHub/citationCompleteness'
import { buildResearchKitBundle } from '@/lib/dataHub/researchKit'
import {
  CAMPAIGN_TEMPLATES,
  campaignTemplateById,
} from '@/lib/campaign/campaignWorkspace'
import { researchPlaybookById, RESEARCH_PLAYBOOKS } from '@/lib/methods/research/playbooks'
import type { EvidenceClaim } from '@/lib/domain/entities'

describe('v3 safety triangulation', () => {
  it('scores multi-source safety coverage without inventing risk', () => {
    const tri = buildSafetyTriangulation({
      adverseEvents: [{ reactionName: 'Nausea', count: 10 }],
      drugRecalls: [],
      drugLabels: [{ title: 'Aspirin label' }],
    })
    expect(tri.sourcesWithData).toBeGreaterThanOrEqual(2)
    expect(tri.triangulationScore).toBeGreaterThan(0)
    expect(tri.honesty[0]).toMatch(/not a risk score/i)
  })
})

describe('v3 five-regulator card', () => {
  it('marks US present when Orange Book / labels exist', () => {
    const card = buildFiveRegulatorCard({
      orangeBookEntries: [{ tradeName: 'ASPIRIN' }],
      emaMedicines: [{ name: 'Acetylsalicylic acid' }],
      healthCanadaDpd: [{ brandName: 'ASA' }],
    })
    expect(card.regionsWithData).toBeGreaterThanOrEqual(3)
    expect(card.rows.find((r) => r.region === 'US')?.status).toBe('present')
    expect(card.honesty.join(' ')).toMatch(/not/i)
  })
})

describe('v3 citation completeness', () => {
  it('scores hub rows with sources', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin' },
      {
        literature: [{ title: 'Paper', url: 'https://example.org/p' }],
        adverseEvents: [{ reactionName: 'Headache', count: 1 }],
        orangeBookEntries: [{ tradeName: 'ASPIRIN' }],
      },
    )
    const s = scoreHubCitationCompleteness(ledger)
    expect(s.total).toBeGreaterThan(0)
    expect(s.score).toBeGreaterThan(0)
  })

  it('scores claims for export threshold', () => {
    const claims: EvidenceClaim[] = [
      {
        id: 'c1',
        claimType: 'safety',
        statement: 'FAERS sample',
        subjectCandidateId: 'cid:2244',
        provenance: {
          source: 'openFDA FAERS',
          sourceUrl: 'https://api.fda.gov',
          retrievedAt: new Date().toISOString(),
        },
      } as EvidenceClaim,
    ]
    const s = scoreClaimCitationCompleteness(claims)
    expect(s.meetsExportThreshold).toBe(true)
    expect(s.citable).toBe(1)
  })
})

describe('v3 research kit quality annex', () => {
  it('bundle is schemaVersion 2 with v3-quality.json', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin' },
      {
        adverseEvents: [{ reactionName: 'Nausea', count: 3 }],
        drugLabels: [{ title: 'Label' }],
        orangeBookEntries: [{ tradeName: 'ASPIRIN' }],
      },
    )
    const bundle = buildResearchKitBundle({
      ledger,
      sessionBags: {
        adverseEvents: [{ reactionName: 'Nausea', count: 3 }],
        drugLabels: [{ title: 'Label' }],
        orangeBookEntries: [{ tradeName: 'ASPIRIN' }],
      },
    })
    expect(bundle.schemaVersion).toBe(2)
    expect(bundle.files['v3-quality.json']).toBeTruthy()
    expect(bundle.manifest.citationScore).toBeDefined()
    expect(JSON.parse(bundle.files['v3-quality.json']!).kind).toBe(
      'biointel-research-kit-v3-quality',
    )
  })
})

describe('v3 hub sections wired', () => {
  it('includes five-regulators and safety-triangulation sections when bags present', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 2244, name: 'Aspirin' },
      {
        adverseEvents: [{ reactionName: 'Nausea', count: 2 }],
        drugLabels: [{ title: 'L' }],
        orangeBookEntries: [{ tradeName: 'ASPIRIN' }],
        clinicalTrials: [],
      },
    )
    const ids = ledger.sections.map((s) => s.id)
    expect(ids).toContain('five-regulators')
    expect(ids).toContain('safety-triangulation')
    expect(ids).toContain('negative-evidence')
  })
})

describe('v3 campaigns + playbooks', () => {
  it('has campaign templates for all personas', () => {
    expect(CAMPAIGN_TEMPLATES.length).toBeGreaterThanOrEqual(4)
    expect(campaignTemplateById('campaign-repurposing')?.stages.length).toBeGreaterThan(3)
  })

  it('registers new scientific playbooks', () => {
    expect(researchPlaybookById('safety_triangulation_pack')).toBeTruthy()
    expect(researchPlaybookById('five_regulator_card')).toBeTruthy()
    expect(researchPlaybookById('rare_disease_depth')).toBeTruthy()
    expect(researchPlaybookById('org_to_sites')).toBeTruthy()
    expect(researchPlaybookById('campaign_workspace_loop')).toBeTruthy()
    expect(RESEARCH_PLAYBOOKS.length).toBeGreaterThanOrEqual(8)
  })
})
