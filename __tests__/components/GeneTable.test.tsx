/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { GeneTable } from '@/app/discover/components/GeneTable'
import type { DiseaseGene } from '@/lib/candidateRanker'
import { MAX_DISCOVER_TARGETS } from '@/lib/discovery/discoverUrl'

const genes: DiseaseGene[] = [
  { symbol: 'EGFR', score: 0.92, source: 'Open Targets' },
  { symbol: 'BRAF', score: 0.81, source: 'Open Targets' },
  { symbol: 'TP53', score: 0.7, source: 'Open Targets' },
]

describe('GeneTable', () => {
  test('renders nothing when genes empty', () => {
    const { container } = render(<GeneTable genes={[]} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders gene symbols and scores with gene links', () => {
    render(<GeneTable genes={genes} />)
    expect(screen.getByTestId('discover-gene-table')).toBeInTheDocument()
    expect(screen.getByText('EGFR')).toBeInTheDocument()
    expect(screen.getByText('0.92')).toBeInTheDocument()
    const link = screen.getByText('EGFR').closest('a')
    expect(link).toHaveAttribute('href', '/gene/EGFR')
  })

  test('shows pinned visual state for genes in pinnedTargets', () => {
    render(
      <GeneTable genes={genes} pinnedTargets={['EGFR']} onTogglePin={jest.fn()} />,
    )
    expect(screen.getByTestId('gene-row-EGFR')).toHaveAttribute('data-pinned', 'true')
    expect(screen.getByTestId('gene-row-BRAF')).toHaveAttribute('data-pinned', 'false')
    expect(screen.getByTestId('gene-pin-EGFR')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('gene-pin-BRAF')).toHaveAttribute('aria-pressed', 'false')
  })

  test('pin toggle calls onTogglePin with symbol', () => {
    const onTogglePin = jest.fn()
    render(
      <GeneTable genes={genes} pinnedTargets={[]} onTogglePin={onTogglePin} />,
    )
    fireEvent.click(screen.getByTestId('gene-pin-BRAF'))
    expect(onTogglePin).toHaveBeenCalledWith('BRAF')
  })

  test('unpin calls onTogglePin for already pinned gene', () => {
    const onTogglePin = jest.fn()
    render(
      <GeneTable genes={genes} pinnedTargets={['EGFR', 'BRAF']} onTogglePin={onTogglePin} />,
    )
    fireEvent.click(screen.getByTestId('gene-pin-EGFR'))
    expect(onTogglePin).toHaveBeenCalledWith('EGFR')
  })

  test('disables pin for unpinned genes when at max cap', () => {
    const onTogglePin = jest.fn()
    const pinned = Array.from({ length: MAX_DISCOVER_TARGETS }, (_, i) => `G${i}`)
    render(
      <GeneTable
        genes={[...genes, { symbol: 'NEW1', score: 0.5, source: 'x' }]}
        pinnedTargets={pinned}
        onTogglePin={onTogglePin}
        maxPins={MAX_DISCOVER_TARGETS}
      />,
    )
    const btn = screen.getByTestId('gene-pin-EGFR')
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onTogglePin).not.toHaveBeenCalled()
  })

  test('case-insensitive pinned match', () => {
    render(
      <GeneTable genes={genes} pinnedTargets={['egfr']} onTogglePin={jest.fn()} />,
    )
    expect(screen.getByTestId('gene-row-EGFR')).toHaveAttribute('data-pinned', 'true')
  })
})
