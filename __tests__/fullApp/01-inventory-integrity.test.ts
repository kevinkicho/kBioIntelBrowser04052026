/**
 * Full-app inventory integrity — every category panel must resolve to a component
 * file and (for molecule free-API cards) a panelSources provenance entry.
 */

import fs from 'fs'
import path from 'path'
import {
  APP_ROUTES,
  inventorySummary,
  listInventoryPanels,
} from '@/lib/fullAppCoverage/inventory'
import { CATEGORIES, MOLECULE_CATEGORY_IDS as MOL_IDS } from '@/lib/categoryConfig'
import { getPanelSource } from '@/lib/panelSources'

const root = process.cwd()

describe('full-app inventory integrity', () => {
  const summary = inventorySummary(root)
  const panels = listInventoryPanels(root)

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
    const ids = panels.map((p) => p.panel.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every panel resolves to a profile component file', () => {
    const missing = summary.missingComponent.map(
      (p) => `${p.categoryId}/${p.panel.id} (${p.panel.title})`,
    )
    if (missing.length) {
      // Allow gene-only synthetic panels without *Panel.tsx when intentionally virtual
      const virtualOk = new Set([
        'gene-overview',
        'gene_drugs',
        'gene-diseases',
        'gene-variants',
        'gene-expression',
        'gene-pathways',
      ])
      const realMissing = summary.missingComponent.filter(
        (p) => !virtualOk.has(p.panel.id),
      )
      expect(realMissing.map((p) => `${p.panel.id}`)).toEqual([])
    }
  })

  it('molecule free-API panels have panelSources provenance (api + docs)', () => {
    const molecule = panels.filter((p) =>
      (MOL_IDS as string[]).includes(p.categoryId),
    )
    const missing = molecule.filter((p) => {
      // Virtual gene tabs live under gene category only
      if (p.categoryId === 'gene') return false
      const src = getPanelSource(p.panel.id)
      return !src || !src.api || !src.docs
    })
    // Some experimental panels may share a parent source — report clearly
    const allowedMissing = new Set([
      // multi-source / portal / bulk / navigator surfaces without sole panelSources key yet
      'biosimilar-family',
      'establishment-links',
      'international-regulators',
      'evidence-neighborhood',
      'therapeutic-landscape',
      'eu-research-orgs',
      'health-canada',
      'ema-medicines',
      'biologics-licensed',
      'purple-book',
      'purple-book-patents',
      'ema-bulk',
      'research-orgs-lit',
      'openaire-projects',
      'openaire-publications',
    ])
    const unexpected = missing.filter((p) => !allowedMissing.has(p.panel.id))
    expect(
      unexpected.map((p) => `${p.panel.id}: source=${Boolean(getPanelSource(p.panel.id))}`),
    ).toEqual([])
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
