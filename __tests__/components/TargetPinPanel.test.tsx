import { render, screen, fireEvent } from '@testing-library/react'
import { TargetPinPanel } from '@/components/discover/TargetPinPanel'

describe('TargetPinPanel', () => {
  test('renders nothing when empty', () => {
    const { container } = render(<TargetPinPanel targets={[]} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders pins and clear', () => {
    const onClear = jest.fn()
    render(
      <TargetPinPanel targets={['EGFR', 'BRAF']} onClear={onClear} waitingForDisease />,
    )
    expect(screen.getByTestId('discover-pinned-targets')).toBeInTheDocument()
    expect(screen.getByText('EGFR')).toBeInTheDocument()
    expect(screen.getByText(/Enter a disease/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Clear all'))
    expect(onClear).toHaveBeenCalled()
  })
})
