import { render, screen } from '@testing-library/react'
import { TdlBadge } from '@/components/discover/TdlBadge'

describe('TdlBadge', () => {
  test('renders nothing when tdl empty', () => {
    const { container } = render(<TdlBadge tdl={null} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders Tclin badge', () => {
    render(<TdlBadge tdl="Tclin" />)
    const el = screen.getByTestId('pharos-tdl-badge')
    expect(el).toHaveAttribute('data-tdl', 'Tclin')
    expect(el).toHaveTextContent('Tclin')
  })
})
