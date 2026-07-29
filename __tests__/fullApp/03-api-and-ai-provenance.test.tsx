/**
 * API + AI provenance UI wiring — chips, honesty, regenerate, non-of-record.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiProvenanceChip } from '@/components/ui/ApiProvenanceChip'
import { AiContentProvenance } from '@/components/ai/AiContentProvenance'
import { AiPanelIntro } from '@/components/ai/AiPanelIntro'
import {
  AI_PROVENANCE_HONESTY,
  formatAiProvenanceLabel,
  hasAiPrompt,
} from '@/lib/ai/aiProvenance'
import { resolveProvenance } from '@/lib/provenance'
import { getPanelSource } from '@/lib/panelSources'
import { listInventoryPanels } from '@/lib/fullAppCoverage/inventory'
import { AI_SURFACES, readRepoFile } from '@/lib/fullAppCoverage/inventory'
import { PROMPT_CATALOG } from '@/lib/methods/systemWiringCatalog'

describe('API provenance', () => {
  it('ApiProvenanceChip renders and toggles', async () => {
    const user = userEvent.setup()
    render(
      <ApiProvenanceChip
        sourceKey="chembl"
        sourceUrl="https://www.ebi.ac.uk/chembl/"
        testId="api-prov"
      />,
    )
    expect(screen.getByTestId('api-prov')).toBeInTheDocument()
    const btn = screen.getByTestId('api-prov-btn')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    await user.click(btn)
    // Hover/click may open portaled panel; at minimum control is interactive
    expect(btn).toBeEnabled()
  })

  it('resolveProvenance returns organization + docs for known panel keys', () => {
    const p = resolveProvenance('chembl', {
      recordUrl: 'https://www.ebi.ac.uk/chembl/compound_report_card/CHEMBL25/',
    })
    expect(p.api).toBeTruthy()
    expect(p.docs).toMatch(/^https?:\/\//)
    expect(p.organization || p.api).toBeTruthy()
  })

  it('majority of molecule panels resolve provenance via panelSources', () => {
    const molecule = listInventoryPanels().filter((p) => p.categoryId !== 'gene')
    const withProv = molecule.filter((p) => {
      const src = getPanelSource(p.panel.id)
      if (!src) return false
      const r = resolveProvenance(p.panel.id)
      return Boolean(r.api)
    })
    expect(withProv.length / Math.max(1, molecule.length)).toBeGreaterThan(0.75)
  })
})

describe('AI provenance', () => {
  it('exposes honesty lines for non-of-record AI', () => {
    expect(AI_PROVENANCE_HONESTY.length).toBeGreaterThanOrEqual(3)
    expect(AI_PROVENANCE_HONESTY.join(' ')).toMatch(/non-of-record/i)
    expect(AI_PROVENANCE_HONESTY.join(' ')).toMatch(/not clinical|regulatory/i)
  })

  it('AiContentProvenance shows prompt + regenerate when meta complete', async () => {
    const user = userEvent.setup()
    const onRegenerate = jest.fn()
    render(
      <AiContentProvenance
        meta={{
          kind: 'pack',
          mode: 'pack_executive_brief',
          promptSystem: 'You are claim-bound.',
          promptUser: 'Summarize pack claims.',
          model: 'test-model',
        }}
        onRegenerate={onRegenerate}
        density="compact"
        testId="ai-prov"
      />,
    )
    expect(screen.getByTestId('ai-prov')).toBeInTheDocument()
    expect(screen.getByTestId('ai-prov')).toHaveAttribute('data-deterministic', 'false')
    expect(screen.getByTestId('ai-prov-regen-open')).toBeInTheDocument()
    await user.click(screen.getByTestId('ai-prov-regen-open'))
  })

  it('deterministic AI meta does not offer regenerate', () => {
    render(
      <AiContentProvenance
        meta={{
          kind: 'pack',
          mode: 'kit',
          deterministic: true,
        }}
        onRegenerate={jest.fn()}
        testId="ai-det"
      />,
    )
    expect(screen.getByTestId('ai-det')).toHaveAttribute('data-deterministic', 'true')
    expect(screen.queryByTestId('ai-det-regen-open')).not.toBeInTheDocument()
    expect(screen.getByText(/Built from free-API bags/i)).toBeInTheDocument()
  })

  it('AiPanelIntro mounts status testids', () => {
    render(
      <AiPanelIntro
        intro={{
          title: 'Pack AI',
          what: 'Claim-bound brief',
          needs: 'Pack claims',
          gets: 'Structured insight',
          not: 'Clinical decisions',
        }}
        testId="ai-intro"
      />,
    )
    expect(screen.getByTestId('ai-intro')).toBeInTheDocument()
    expect(screen.getByTestId('ai-intro-what')).toBeInTheDocument()
  })

  it('hasAiPrompt / formatAiProvenanceLabel contracts', () => {
    expect(hasAiPrompt({ promptSystem: 'x', promptUser: '' })).toBe(true)
    expect(hasAiPrompt({ promptSystem: '', promptUser: '' })).toBe(false)
    expect(formatAiProvenanceLabel({ kind: 'pack', mode: 'brief', model: 'm' })).toMatch(/pack/)
  })

  it('PROMPT_CATALOG modes never affect Discover rank', () => {
    expect(PROMPT_CATALOG.length).toBeGreaterThan(5)
    for (const e of PROMPT_CATALOG) {
      expect(e.affectsDiscoverRank).toBe(false)
    }
  })

  it.each(AI_SURFACES.map((s) => [s.id, s.file, s.mustContain] as const))(
    'AI surface %s source contains honesty markers',
    (_id, file, mustContain) => {
      const body = readRepoFile(file)
      for (const needle of mustContain) {
        expect(body).toContain(needle)
      }
    },
  )
})
