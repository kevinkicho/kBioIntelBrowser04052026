/**
 * Loaded-state smoke: key free-API cards render real row content (not only empty).
 */

import React from 'react'
import { render } from '@testing-library/react'
import path from 'path'
import { listInventoryPanels } from '@/lib/fullAppCoverage/inventory'
import {
  LOADED_FIXTURES,
  type LoadedFixtureId,
} from '../utils/loadedPanelFixtures'

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
})

function isReactComponent(v: unknown): v is React.ComponentType<Record<string, unknown>> {
  if (typeof v === 'function') return true
  if (v && typeof v === 'object' && (v as { $$typeof?: unknown }).$$typeof) return true
  return false
}

function loadExport(componentPath: string): React.ComponentType<Record<string, unknown>> | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(path.join(process.cwd(), componentPath)) as Record<string, unknown>
  for (const [k, v] of Object.entries(mod)) {
    if (/Panel|Navigator$/.test(k) && isReactComponent(v)) {
      return v
    }
  }
  if (isReactComponent(mod.default)) return mod.default
  return null
}

const EXPECT_VISIBLE: Partial<Record<LoadedFixtureId, RegExp>> = {
  chembl: /PTGS1|pChEMBL|IC50|Cyclooxygenase/i,
  'clinical-trials': /NCT00000001|Aspirin for secondary/i,
  'adverse-events': /Nausea/i,
  uniprot: /PTGS1|Prostaglandin/i,
  dgidb: /PTGS2|Prostaglandin-endoperoxide|inhibitor/i,
  literature: /Aspirin and platelets/i,
  'health-canada': /ASPIRIN|02212345|Bayer/i,
  'openaire-projects': /ASPMECH|Aspirin mechanisms/i,
  properties: /LogP|1\.2|H-Bond/i,
}

describe('full-app panel loaded render smoke', () => {
  const inventory = listInventoryPanels()

  it.each(Object.keys(LOADED_FIXTURES) as LoadedFixtureId[])(
    'renders loaded fixture for panel %s',
    (panelId) => {
      const inv = inventory.find((p) => p.panel.id === panelId)
      expect(inv?.componentPath).toBeTruthy()
      const Comp = loadExport(inv!.componentPath!)
      expect(Comp).toBeTruthy()

      const fix = LOADED_FIXTURES[panelId]
      const props: Record<string, unknown> = {
        panelId,
        [fix.componentProp]: fix.data,
        moleculeName: 'Aspirin',
        cid: 2244,
        ...('extra' in fix ? (fix as { extra?: Record<string, unknown> }).extra : {}),
      }

      expect(() => {
        const { unmount } = render(React.createElement(Comp!, props))
        unmount()
      }).not.toThrow()

      const re = EXPECT_VISIBLE[panelId]
      if (re) {
        // Re-render for text assertion (previous unmounted)
        render(React.createElement(Comp!, props))
        expect(document.body.textContent || '').toMatch(re)
      }
    },
  )
})
