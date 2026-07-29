import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  SourceEvidenceCard,
  EmptySourcesToggle,
} from '@/components/gene/SourceEvidenceCard'

describe('SourceEvidenceCard', () => {
  it('shows API + of-record AI provenance when empty and collapsed by default', () => {
    render(
      <SourceEvidenceCard
        title="Targeted drugs"
        sourceKey="dgidb"
        sourceLabel="DGIdb"
        rowCount={0}
        resultStatus="empty"
        fetchedAt={new Date('2026-01-01T12:00:00Z')}
        registryUrl="https://www.dgidb.org/"
        testId="drugs"
      >
        <p>No rows loaded yet for this source.</p>
      </SourceEvidenceCard>,
    )
    expect(screen.getByTestId('drugs')).toHaveAttribute('data-empty', 'true')
    expect(screen.getByTestId('drugs')).toHaveAttribute('data-expanded', 'false')
    expect(screen.getByTestId('drugs-api-prov')).toBeInTheDocument()
    expect(screen.getByTestId('drugs-ai-prov')).toBeInTheDocument()
    expect(screen.getByTestId('drugs-gather-strip')).toHaveTextContent(/No rows returned/i)
    expect(screen.queryByTestId('drugs-body')).not.toBeInTheDocument()
    expect(screen.getByTestId('drugs-reveal')).toHaveTextContent(/Reveal empty/i)
  })

  it('reveals empty body on click', async () => {
    const user = userEvent.setup()
    render(
      <SourceEvidenceCard
        title="Disease associations"
        sourceKey="disgenet"
        rowCount={0}
        testId="dis"
      >
        <p>No rows loaded yet for this source.</p>
      </SourceEvidenceCard>,
    )
    await user.click(screen.getByTestId('dis-reveal'))
    expect(screen.getByTestId('dis')).toHaveAttribute('data-expanded', 'true')
    expect(screen.getByTestId('dis-body')).toHaveTextContent(/No rows loaded/i)
  })

  it('keeps loaded cards expanded with full opacity class', () => {
    render(
      <SourceEvidenceCard
        title="ClinVar variants"
        sourceKey="clinvar"
        rowCount={3}
        resultStatus="loaded"
        testId="cv"
      >
        <p>row content</p>
      </SourceEvidenceCard>,
    )
    expect(screen.getByTestId('cv')).toHaveAttribute('data-empty', 'false')
    expect(screen.getByTestId('cv')).toHaveAttribute('data-expanded', 'true')
    expect(screen.getByTestId('cv-body')).toHaveTextContent('row content')
    expect(screen.queryByTestId('cv-reveal')).not.toBeInTheDocument()
  })
})

describe('EmptySourcesToggle', () => {
  it('toggles show empty label', async () => {
    const user = userEvent.setup()
    const onToggle = jest.fn()
    const { rerender } = render(
      <EmptySourcesToggle emptyCount={3} showEmpty={false} onToggle={onToggle} />,
    )
    expect(screen.getByTestId('empty-sources-toggle-btn')).toHaveTextContent(/Show 3 empty/)
    await user.click(screen.getByTestId('empty-sources-toggle-btn'))
    expect(onToggle).toHaveBeenCalled()
    rerender(<EmptySourcesToggle emptyCount={3} showEmpty onToggle={onToggle} />)
    expect(screen.getByTestId('empty-sources-toggle-btn')).toHaveTextContent(/Hide empty/)
  })

  it('hides when no empty sources', () => {
    const { container } = render(
      <EmptySourcesToggle emptyCount={0} showEmpty={false} onToggle={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
