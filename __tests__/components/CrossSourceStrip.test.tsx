import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CrossSourceStrip } from '@/components/crossSource/CrossSourceStrip'
import { buildMoleculeCrossSource } from '@/lib/crossSource'

describe('CrossSourceStrip', () => {
  it('hides empty zero-count chips by default', () => {
    const bundle = buildMoleculeCrossSource('2244', 'Aspirin', {
      clinicalTrials: [{ nctId: 'NCT1' }],
      // other bags empty → zeros
    })
    render(
      <CrossSourceStrip
        bundle={bundle}
        title="Source coverage (counts)"
        testId="css"
      />,
    )
    expect(screen.getByTestId('css')).toHaveAttribute('data-hide-empty', 'true')
    // Non-empty trial chip present
    expect(screen.getByTestId('css-fact-ct-trials')).toBeInTheDocument()
    // Empty FAERS (0) hidden
    expect(screen.queryByTestId('css-fact-faers')).not.toBeInTheDocument()
  })

  it('reveals empty chips when toggle clicked', async () => {
    const user = userEvent.setup()
    const bundle = buildMoleculeCrossSource('2244', 'Aspirin', {
      clinicalTrials: [{ nctId: 'NCT1' }],
    })
    render(<CrossSourceStrip bundle={bundle} testId="css" />)
    const toggle = screen.getByTestId('css-toggle-empty')
    expect(toggle).toHaveTextContent(/Show \d+ empty/)
    await user.click(toggle)
    expect(screen.getByTestId('css-fact-faers')).toBeInTheDocument()
    expect(screen.getByTestId('css')).toHaveAttribute('data-hide-empty', 'false')
  })

  it('calls onOpenPanel when a panel-linked chip is clicked', async () => {
    const user = userEvent.setup()
    const onOpenPanel = jest.fn()
    const bundle = buildMoleculeCrossSource('2244', 'Aspirin', {
      clinicalTrials: [{ nctId: 'NCT1' }, { nctId: 'NCT2' }],
    })
    render(
      <CrossSourceStrip bundle={bundle} onOpenPanel={onOpenPanel} testId="css" />,
    )
    await user.click(screen.getByTestId('css-fact-ct-trials'))
    expect(onOpenPanel).toHaveBeenCalledWith('clinical-safety', 'clinical-trials')
  })

  it('renders empty state copy when no facts', () => {
    const bundle = buildMoleculeCrossSource('1', 'X', {})
    render(<CrossSourceStrip bundle={bundle} testId="css" />)
    expect(screen.getByTestId('css')).toHaveAttribute('data-empty', 'true')
  })
})
