/**
 * Panel chrome: tier badges, empty states, source provenance buttons.
 * Uses the shared Panel shell that every card wraps.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Panel } from '@/components/ui/Panel'
import { listInventoryPanels } from '@/lib/fullAppCoverage/inventory'
import { getPanelSource } from '@/lib/panelSources'
import { getPanelTier } from '@/lib/panelTiers'

describe('full-app panel chrome contracts', () => {
  const panels = listInventoryPanels().filter((p) => p.componentPath)

  it('sample of panels: empty string shows no-data chrome', () => {
    render(
      <Panel title="Test Card" panelId="chembl" empty="No bioactivity found.">
        {null}
      </Panel>,
    )
    expect(screen.getByTestId('panel-empty-chembl')).toBeInTheDocument()
    expect(screen.getByTestId('panel-empty-chembl-badge')).toBeInTheDocument()
  })

  it('panels with sources expose detail + source footer controls', async () => {
    const user = userEvent.setup()
    const withSource = panels.find((p) => getPanelSource(p.panel.id))
    expect(withSource).toBeTruthy()
    const id = withSource!.panel.id
    const src = getPanelSource(id)!
    render(
      <Panel title={withSource!.panel.title} panelId={id}>
        <p>content</p>
      </Panel>,
    )
    expect(screen.getByText(withSource!.panel.title)).toBeInTheDocument()
    expect(screen.getByTestId(`panel-detail-${id}`)).toBeInTheDocument()
    // Footer source expander includes organization name
    const footer = screen.getByRole('button', { name: /Source:/i })
    expect(footer).toHaveTextContent(src.source)
    await user.click(footer)
  })

  it.each(
    panels
      .filter((p) => getPanelTier(p.panel.id) === 'supporting')
      .slice(0, 12)
      .map((p) => [p.panel.id, p.panel.title] as const),
  )('supporting panel %s shows Supporting badge', (id, title) => {
    render(
      <Panel title={title} panelId={id}>
        <span>row</span>
      </Panel>,
    )
    expect(screen.getByText('Supporting')).toBeInTheDocument()
  })

  it.each(
    panels
      .filter((p) => getPanelTier(p.panel.id) === 'experimental')
      .slice(0, 8)
      .map((p) => [p.panel.id, p.panel.title] as const),
  )('experimental panel %s shows Experimental badge', (id, title) => {
    render(
      <Panel title={title} panelId={id}>
        <span>row</span>
      </Panel>,
    )
    expect(screen.getByText('Experimental')).toBeInTheDocument()
  })
})
