import { render, screen } from '@testing-library/react'
import { Panel } from '@/components/ui/Panel'
import { ClassificationBadge } from '@/components/ui/Badge'

describe('Panel', () => {
  test('renders title and children', () => {
    render(<Panel title="Companies & Products"><p>Test content</p></Panel>)
    expect(screen.getByText('Companies & Products')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  test('shows subtle Supporting tier badge when panelId is supporting', () => {
    render(
      <Panel title="DisGeNET" panelId="disgenet">
        <p>assoc</p>
      </Panel>
    )
    expect(screen.getByText('Supporting')).toBeInTheDocument()
  })

  test('shows subtle Experimental tier badge for NIH High-Impact panels', () => {
    render(
      <Panel title="NCI caDSR" panelId="nci-cadsr">
        <p>data</p>
      </Panel>
    )
    expect(screen.getByText('Experimental')).toBeInTheDocument()
  })

  test('does not show Core tier badge (default mental model)', () => {
    render(
      <Panel title="ChEMBL" panelId="chembl">
        <p>acts</p>
      </Panel>
    )
    expect(screen.queryByText('Core')).not.toBeInTheDocument()
  })
})

describe('Badge', () => {
  test('renders classification label', () => {
    render(<ClassificationBadge classification="therapeutic" />)
    expect(screen.getByText('Therapeutic')).toBeInTheDocument()
  })

  test('renders enzyme classification', () => {
    render(<ClassificationBadge classification="enzyme" />)
    expect(screen.getByText('Enzyme')).toBeInTheDocument()
  })
})
