/**
 * Remaining v3 slices: gene-led mode, biologics chapter, campaign route inventory, disease spine.
 */

import {
  applyBeachheadPersona,
  parseDiscoveryPreferences,
  DEFAULT_DISCOVERY_PREFERENCES,
} from '@/lib/discovery/preferences'
import { geneLedRankOptions, isGeneLedMode, geneLedBannerCopy } from '@/lib/discovery/geneLedMode'
import { buildBiologicsKitChapter } from '@/lib/dataHub/biologicsKitChapter'
import { buildDiseaseDataHub } from '@/lib/dataHub/buildDiseaseDataHub'
import { buildResearchKitBundle, buildMoleculeDataHub } from '@/lib/dataHub'
import { scoreClaimCitationCompleteness } from '@/lib/dataHub/citationCompleteness'
import { APP_ROUTES } from '@/lib/fullAppCoverage/inventory'
import { CAMPAIGN_TEMPLATES } from '@/lib/campaign/campaignWorkspace'
import type { EvidenceClaim } from '@/lib/domain/entities'

describe('gene-led Discover mode', () => {
  it('parse defaults to molecule mode', () => {
    const p = parseDiscoveryPreferences({})
    expect(p.discoverMode).toBe('molecule')
  })

  it('gene-led persona forces pin hard-filter', () => {
    // applyBeachheadPersona writes localStorage — pure-check via merge shape
    const next = {
      ...DEFAULT_DISCOVERY_PREFERENCES,
      discoverMode: 'gene-led' as const,
      mustHitPinnedTargets: true,
    }
    expect(isGeneLedMode(next)).toBe(true)
    const opts = geneLedRankOptions(next)
    expect(opts.mustHitPinnedTargets).toBe(true)
    expect(geneLedBannerCopy('gene-led')).toMatch(/deterministic/i)
  })

  it('applyBeachheadPersona gene-led exists', () => {
    // May touch localStorage in jsdom
    const p = applyBeachheadPersona('gene-led')
    expect(p.discoverMode).toBe('gene-led')
    expect(p.mustHitPinnedTargets).toBe(true)
  })
})

describe('biologics kit chapter', () => {
  it('marks present when BLA or Purple Book rows exist', () => {
    const ch = buildBiologicsKitChapter({
      biologicsLicensed: [{ applicationNumber: 'BLA123' }],
      purpleBookProducts: [],
    })
    expect(ch.present).toBe(true)
    expect(ch.summary.blaRows).toBe(1)
    expect(ch.honesty[0]).toMatch(/not a biologics-first/i)
  })

  it('attaches biologics-chapter.json when present in kit', () => {
    const ledger = buildMoleculeDataHub(
      { cid: 1, name: 'mAb' },
      { biologicsLicensed: [{ applicationNumber: 'BLA1' }] },
    )
    const bundle = buildResearchKitBundle({
      ledger,
      sessionBags: { biologicsLicensed: [{ applicationNumber: 'BLA1' }] },
    })
    expect(bundle.files['biologics-chapter.json']).toBeTruthy()
    expect(JSON.parse(bundle.files['biologics-chapter.json']!).kind).toBe(
      'biointel-biologics-chapter',
    )
  })
})

describe('disease spine hub', () => {
  it('includes disease-spine section and WHO samples', () => {
    const hub = buildDiseaseDataHub({
      diseaseId: 'EFO_0000001',
      diseaseName: 'Test disease',
      geneCount: 3,
      topGenes: ['EGFR', 'KRAS'],
      whoGhoCount: 2,
      whoGhoSamples: ['indicator A', 'fact B'],
      openTargetsHit: true,
      trialDrugCount: 4,
      moleculeCount: 5,
    })
    expect(hub.sections.some((s) => s.id === 'disease-spine')).toBe(true)
    expect(hub.rows.find((r) => r.id === 'd-who-samples')?.value).toMatch(/indicator/)
    expect(hub.notes?.some((n) => /Gene-led/i.test(n))).toBe(true)
  })
})

describe('citation export gate helper', () => {
  it('fails threshold without sourceUrl', () => {
    const claims = [
      {
        id: '1',
        statement: 'x',
        claimType: 'safety',
        epistemicStatus: 'supported',
        provenance: { source: 'openFDA' },
      },
    ] as unknown as EvidenceClaim[]
    const s = scoreClaimCitationCompleteness(claims, { threshold: 0.6 })
    expect(s.meetsExportThreshold).toBe(false)
  })
})

describe('campaign route inventory', () => {
  it('registers /campaign and has templates', () => {
    expect(APP_ROUTES.some((r) => r.path === '/campaign')).toBe(true)
    expect(CAMPAIGN_TEMPLATES.length).toBeGreaterThanOrEqual(4)
  })
})
