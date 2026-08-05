import {
  GOLDEN_PATHS,
  goldenPathById,
  goldenPathsByPersona,
  spineLinksForGoldenPath,
} from '@/lib/golden/goldenPaths'
import { CAMPAIGN_TEMPLATES } from '@/lib/campaign/campaignWorkspace'
import { researchPlaybookById } from '@/lib/methods/researchToolCatalog'
import fs from 'fs'
import path from 'path'

describe('goldenPaths (v3 E4)', () => {
  it('catalogs all beachhead paths with law-safe notes', () => {
    expect(GOLDEN_PATHS.length).toBeGreaterThanOrEqual(5)
    for (const p of GOLDEN_PATHS) {
      expect(p.id).toBeTruthy()
      expect(p.discoverHref.startsWith('/')).toBe(true)
      expect(p.notes.length).toBeGreaterThan(10)
      expect(CAMPAIGN_TEMPLATES.some((t) => t.id === p.campaignTemplateId)).toBe(true)
      expect(researchPlaybookById(p.playbookId)).toBeTruthy()
    }
  })

  it('ATTR and EGFR have rank fixtures on disk', () => {
    const attr = goldenPathById('attr')!
    const egfr = goldenPathById('egfr-nsclc')!
    const root = path.join(process.cwd(), '__tests__/fixtures/discovery')
    expect(fs.existsSync(path.join(root, attr.rankFixture!))).toBe(true)
    expect(fs.existsSync(path.join(root, egfr.rankFixture!))).toBe(true)
  })

  it('kit expectation files exist under docs/golden', () => {
    const root = path.join(process.cwd(), 'docs/golden')
    for (const p of GOLDEN_PATHS) {
      if (!p.kitExpectation) continue
      expect(fs.existsSync(path.join(root, p.kitExpectation))).toBe(true)
    }
  })

  it('spine links disease → gene → molecule → org', () => {
    const attr = goldenPathById('attr')!
    const links = spineLinksForGoldenPath(attr)
    expect(links.some((l) => l.kind === 'disease')).toBe(true)
    expect(links.some((l) => l.kind === 'gene' && l.label === 'TTR')).toBe(true)
    expect(links.some((l) => l.kind === 'molecule')).toBe(true)
    expect(links.some((l) => l.kind === 'org')).toBe(true)
  })

  it('filters by persona', () => {
    expect(goldenPathsByPersona('rare-disease').every((p) => p.persona === 'rare-disease')).toBe(true)
  })
})
