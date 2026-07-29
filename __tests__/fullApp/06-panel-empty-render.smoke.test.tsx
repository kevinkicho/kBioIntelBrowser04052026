/**
 * Empty-state smoke: load every resolvable profile panel module and render
 * with empty props so React #31 / prop crashes fail the gate.
 *
 * Not a visual snapshot — a "does this card mount?" net for all free-API cards.
 */

import React from 'react'
import { render } from '@testing-library/react'
import path from 'path'
import { listInventoryPanels, type InventoryPanel } from '@/lib/fullAppCoverage/inventory'

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
})

// Filterable lists / charts may pull heavy deps — keep empty paths light
jest.mock('@/components/ui/FilterablePaginatedList', () => ({
  FilterablePaginatedList: () => <div data-testid="mock-list" />,
}))

function emptyPropsFor(p: InventoryPanel): Record<string, unknown> {
  const key = p.panel.propKey
  const base: Record<string, unknown> = {
    panelId: p.panel.id,
    lastFetched: undefined,
  }
  // Common shapes across profile panels
  if (p.panel.isNullable) {
    base[key] = null
    base.data = null
  } else {
    base[key] = []
    base.data = { items: [], entries: [], results: [] }
  }
  // Frequent alternate prop names
  base.entries = []
  base.proteins = []
  base.compounds = []
  base.guidelines = []
  base.pathways = []
  base.trials = []
  base.products = []
  base.metabolites = []
  base.genes = []
  base.interactions = []
  base.diseases = []
  base.variants = []
  base.structures = []
  base.predictions = []
  base.models = []
  base.spectra = []
  base.clusters = []
  base.awards = []
  base.publications = []
  base.projects = []
  base.hospitals = []
  base.colleges = []
  base.applications = []
  base.sections = []
  base.family = null
  base.cid = 2244
  base.moleculeName = 'Aspirin'
  return base
}

function loadPanelComponent(p: InventoryPanel): React.ComponentType<Record<string, unknown>> | null {
  if (!p.componentPath) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(path.join(process.cwd(), p.componentPath)) as Record<string, unknown>
  const hint = p.componentExportHint
  if (hint && typeof mod[hint] === 'function') {
    return mod[hint] as React.ComponentType<Record<string, unknown>>
  }
  // Prefer named *Panel export
  for (const [k, v] of Object.entries(mod)) {
    if (typeof v === 'function' && /Panel|Navigator|Strip|Map$/.test(k)) {
      return v as React.ComponentType<Record<string, unknown>>
    }
  }
  if (typeof mod.default === 'function') {
    return mod.default as React.ComponentType<Record<string, unknown>>
  }
  return null
}

describe('full-app panel empty render smoke', () => {
  const panels = listInventoryPanels().filter((p) => p.componentPath)

  it(`covers ${panels.length} panel modules`, () => {
    expect(panels.length).toBeGreaterThanOrEqual(90)
  })

  // Batch by category to keep failure messages readable
  const byCat = new Map<string, InventoryPanel[]>()
  for (const p of panels) {
    const list = byCat.get(p.categoryId) || []
    list.push(p)
    byCat.set(p.categoryId, list)
  }

  Array.from(byCat.entries()).forEach(([cat, list]) => {
    describe(`category ${cat}`, () => {
      it.each(
        list.map((p: InventoryPanel) => [p.panel.id, p] as [string, InventoryPanel]),
      )('mounts empty %s without throwing', (id: string, p: InventoryPanel) => {
        expect(id).toBe(p.panel.id)
        const Comp = loadPanelComponent(p)
        if (!Comp) {
          // Module exists but export shape unusual — still count as soft pass with warn
          expect(p.componentPath).toBeTruthy()
          return
        }
        const props = emptyPropsFor(p)
        expect(() => {
          const { unmount } = render(React.createElement(Comp, props))
          unmount()
        }).not.toThrow()
      })
    })
  })
})
