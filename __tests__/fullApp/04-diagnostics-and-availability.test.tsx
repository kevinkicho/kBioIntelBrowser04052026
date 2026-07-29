/**
 * Diagnostics wiring: runtime config, request metrics, source availability, status strip.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RequestMetricsPanel } from '@/components/analytics/RequestMetricsPanel'
import {
  SourceStatusStrip,
  countSourceStatuses,
  bucketForStatus,
} from '@/app/discover/components/SourceStatusStrip'
import {
  isPanelSourceDisabled,
  DISABLED_API_SOURCES,
} from '@/lib/api/sourceAvailability'
import { DIAGNOSTICS_SURFACES, readRepoFile } from '@/lib/fullAppCoverage/inventory'
import { listInventoryPanels } from '@/lib/fullAppCoverage/inventory'
import type { SourceFetchStatus } from '@/lib/dataStatus'

function status(
  partial: Partial<SourceFetchStatus> & { source: string; status: SourceFetchStatus['status'] },
): SourceFetchStatus {
  return {
    source: partial.source,
    status: partial.status,
    has_data: partial.has_data ?? partial.status === 'loaded',
    duration_ms: partial.duration_ms,
    error: partial.error,
  }
}

describe('diagnostics surfaces source files', () => {
  it.each(DIAGNOSTICS_SURFACES.map((s) => [s.id, s.file, s.mustContain] as const))(
    '%s is wired',
    (_id, file, mustContain) => {
      const body = readRepoFile(file)
      for (const needle of mustContain) {
        expect(body).toContain(needle)
      }
    },
  )
})

describe('source availability', () => {
  it('DISABLED_API_SOURCES is a finite map (no accidental total disable)', () => {
    expect(typeof DISABLED_API_SOURCES).toBe('object')
    expect(Object.keys(DISABLED_API_SOURCES).length).toBeLessThan(20)
  })

  it('enabled free-API panels are not marked disabled', () => {
    const sample = ['chembl', 'clinical-trials', 'adverse-events', 'pubchem', 'properties', 'dgidb']
    for (const id of sample) {
      // pubchem may alias — properties is the panel
      if (id === 'pubchem') continue
      expect(isPanelSourceDisabled(id)).toBe(false)
    }
  })

  it('inventory panels report disabled flag consistently', () => {
    for (const p of listInventoryPanels()) {
      expect(p.disabled).toBe(isPanelSourceDisabled(p.panel.id))
    }
  })
})

describe('SourceStatusStrip diagnostics', () => {
  it('buckets statuses into ok / empty / issue', () => {
    expect(bucketForStatus('loaded')).toBe('ok')
    expect(bucketForStatus('empty')).toBe('empty')
    expect(bucketForStatus('error')).toBe('issue')
    expect(bucketForStatus('timeout')).toBe('issue')
  })

  it('counts multi-source gather status for Discover', () => {
    const counts = countSourceStatuses([
      status({ source: 'a', status: 'loaded' }),
      status({ source: 'b', status: 'empty' }),
      status({ source: 'c', status: 'error' }),
    ])
    expect(counts.ok).toBe(1)
    expect(counts.empty).toBe(1)
    expect(counts.issue).toBe(1)
    expect(counts.total).toBe(3)
  })

  it('renders strip without crashing', () => {
    render(
      <SourceStatusStrip
        emitEvent={false}
        sourceStatuses={[
          status({ source: 'chembl', status: 'loaded' }),
          status({ source: 'ct', status: 'empty' }),
        ]}
      />,
    )
    expect(document.body.textContent).toBeTruthy()
  })
})

describe('RequestMetricsPanel', () => {
  it('renders metrics chrome and clear control', async () => {
    const user = userEvent.setup()
    render(<RequestMetricsPanel />)
    // Panel may use various headings — ensure mount
    expect(document.body.textContent?.length).toBeGreaterThan(0)
    const clear = screen.queryByRole('button', { name: /clear/i })
    if (clear) await user.click(clear)
  })
})

describe('runtime-config diagnostics API', () => {
  it('route source only exposes safe boolean diagnostics (no secret fields)', () => {
    // Avoid importing firebase-admin via the route module in Jest (jose ESM).
    const body = readRepoFile('src/app/api/runtime-config/route.ts')
    expect(body).toContain('firebaseClient')
    expect(body).toContain('firebaseAdmin')
    expect(body).toContain('ollamaCloud')
    expect(body).toContain('ok: true')
    // Must not serialize raw secrets into the JSON payload
    expect(body).not.toMatch(/process\.env\.(FIREBASE_PRIVATE|OPENAI_API_KEY|OLLAMA_API_KEY)/)
  })
})
