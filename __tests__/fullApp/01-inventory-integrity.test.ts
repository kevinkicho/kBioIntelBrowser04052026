/**
 * Full-app inventory integrity — every category panel must resolve to a component
 * (molecule cards) and every panel must have panelSources provenance (no allowlist).
 */

import fs from 'fs'
import path from 'path'
import {
  APP_ROUTES,
  inventorySummary,
  listInventoryPanels,
} from '@/lib/fullAppCoverage/inventory'
import { CATEGORIES, MOLECULE_CATEGORY_IDS as MOL_IDS } from '@/lib/categoryConfig'
import {
  getPanelSource,
  panelsMissingSources,
  listPanelSourceIds,
} from '@/lib/panelSources'

const root = process.cwd()

/** Gene detail tabs may render inside GeneDetailPageClient without *Panel.tsx */
const GENE_VIRTUAL_PANEL_IDS = new Set([
  'gene-overview',
  'gene_drugs',
  'gene-diseases',
  'gene-variants',
  'gene-expression',
  'gene-pathways',
])

describe('full-app inventory integrity', () => {
  const summary = inventorySummary(root)
  const panels = listInventoryPanels(root)
  const allPanelIds = panels.map((p) => p.panel.id)

  it('catalogs a non-trivial panel surface (100+ free-API cards)', () => {
    expect(summary.totalPanels).toBeGreaterThanOrEqual(100)
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(9)
  })

  it('includes all molecule category ids', () => {
    for (const id of MOL_IDS) {
      expect(CATEGORIES.some((c) => c.id === id)).toBe(true)
    }
  })

  it('every panel has unique id within catalog', () => {
    expect(new Set(allPanelIds).size).toBe(allPanelIds.length)
  })

  it('every non-virtual panel resolves to a profile component file', () => {
    const realMissing = summary.missingComponent.filter(
      (p) => !GENE_VIRTUAL_PANEL_IDS.has(p.panel.id),
    )
    expect(realMissing.map((p) => p.panel.id)).toEqual([])
  })

  it('every CATEGORIES panel has panelSources api + docs (zero allowlist)', () => {
    const missing = panelsMissingSources(allPanelIds)
    expect(missing).toEqual([])
  })

  it('panelSources registry is non-empty and includes health-canada / openaire', () => {
    const ids = listPanelSourceIds()
    expect(ids.length).toBeGreaterThanOrEqual(100)
    expect(ids).toEqual(expect.arrayContaining([
      'health-canada',
      'ema-medicines',
      'purple-book',
      'openaire-projects',
      'openaire-publications',
      'biologics-licensed',
    ]))
  })

  it('getPanelSource returns docs https URL for sample free APIs', () => {
    for (const id of ['chembl', 'clinical-trials', 'health-canada', 'openaire-projects']) {
      const s = getPanelSource(id)
      expect(s?.docs).toMatch(/^https?:\/\//)
      expect(s?.api).toBeTruthy()
    }
  })

  it('resolved component files exist on disk', () => {
    for (const p of panels) {
      if (!p.componentPath) continue
      expect(fs.existsSync(path.join(root, p.componentPath))).toBe(true)
    }
  })

  it('all APP_ROUTES page files exist', () => {
    for (const r of APP_ROUTES) {
      expect(fs.existsSync(path.join(root, r.pageFile))).toBe(true)
    }
  })

  it('lazyPanels.tsx exports many Lazy* panels', () => {
    const lazy = fs.readFileSync(path.join(root, 'src/lib/lazyPanels.tsx'), 'utf8')
    const count = (lazy.match(/export const Lazy\w+/g) || []).length
    expect(count).toBeGreaterThanOrEqual(80)
  })
})
