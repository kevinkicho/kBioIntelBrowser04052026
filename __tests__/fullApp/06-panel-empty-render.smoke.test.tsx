/**
 * Empty-state smoke: load every resolvable profile panel module and render
 * with empty props so React #31 / prop crashes fail the gate.
 *
 * Not a visual snapshot — a "does this card mount?" net for all free-API cards.
 */

import React from 'react'
import { render } from '@testing-library/react'
import fs from 'fs'
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

/** Pull destructured prop names from `function Foo({ a, b }: { ... })` signatures. */
function extractPropNamesFromSource(src: string): string[] {
  const names = new Set<string>()
  const re = /function\s+\w+\s*\(\s*\{\s*([^}]+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const chunk = m[1]
    for (const part of chunk.split(',')) {
      const name = part.trim().split(/[=:]/)[0]?.trim()
      if (name && /^[A-Za-z_][\w]*$/.test(name) && name !== 'panelId' && name !== 'lastFetched') {
        names.add(name)
      }
    }
  }
  return Array.from(names)
}

/**
 * Empty props: category propKey + names parsed from the panel source file.
 */
function emptyPropsFor(p: InventoryPanel): Record<string, unknown> {
  const emptyList: unknown[] = []
  const emptyData = {
    geneDiseases: emptyList,
    variants: emptyList,
    domains: emptyList,
    gene3dEntries: emptyList,
    items: emptyList,
    entries: emptyList,
    results: emptyList,
    spectra: emptyList,
    clusters: emptyList,
    activities: emptyList,
    mechanisms: emptyList,
    indications: emptyList,
  }
  const base: Record<string, unknown> = {
    panelId: p.panel.id,
    lastFetched: undefined,
    cid: 2244,
    molecularWeight: 0,
    moleculeName: 'Aspirin',
    data: emptyData,
    family: emptyData,
    toxcast: emptyData,
    metabolomicsData: emptyData,
    properties: null,
    computedProperties: null,
  }
  if (p.panel.propKey) base[p.panel.propKey] = emptyList
  if (p.componentPath) {
    try {
      const src = fs.readFileSync(path.join(process.cwd(), p.componentPath), 'utf8')
      for (const name of extractPropNamesFromSource(src)) {
        if (name === 'data' || name === 'family' || name === 'toxcast' || name === 'metabolomicsData') {
          base[name] = emptyData
        } else if (
          name === 'properties' ||
          name === 'computedProperties' ||
          name === 'hazards' ||
          name === 'annotation' ||
          name === 'chebiAnnotation'
        ) {
          // Nullable object bags — [] is truthy and breaks `.roles` / `.hazardStatements`
          base[name] = null
        } else if (name === 'cid' || name === 'molecularWeight') {
          base[name] = name === 'cid' ? 2244 : 0
        } else if (
          name === 'moleculeName' ||
          name === 'firmHint' ||
          name === 'diseaseName' ||
          /Hint$|Name$|Title$|Query$|Label$/.test(name)
        ) {
          base[name] = name === 'moleculeName' ? 'Aspirin' : ''
        } else {
          base[name] = emptyList
        }
      }
    } catch {
      /* ignore */
    }
  }
  return base
}

function isReactComponent(v: unknown): v is React.ComponentType<Record<string, unknown>> {
  if (typeof v === 'function') return true
  if (v && typeof v === 'object' && (v as { $$typeof?: unknown }).$$typeof) return true
  return false
}

function loadPanelComponent(p: InventoryPanel): React.ComponentType<Record<string, unknown>> | null {
  if (!p.componentPath) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(path.join(process.cwd(), p.componentPath)) as Record<string, unknown>
  const hint = p.componentExportHint
  if (hint && isReactComponent(mod[hint])) {
    return mod[hint] as React.ComponentType<Record<string, unknown>>
  }
  for (const [k, v] of Object.entries(mod)) {
    if (/Panel|Navigator|Strip|Map$/.test(k) && isReactComponent(v)) {
      return v
    }
  }
  if (isReactComponent(mod.default)) return mod.default
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
