import { render, screen } from '@testing-library/react'
import { FavoritesBar } from '@/components/home/FavoritesBar'

describe('FavoritesBar', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders nothing when no favorites', () => {
    const { container } = render(<FavoritesBar />)
    expect(container.firstChild).toBeNull()
  })

  it('renders favorite molecules as links', () => {
    localStorage.setItem(
      'biointel-favorites',
      JSON.stringify([
        { cid: 5793, name: 'Glucose', addedAt: '2026-04-06T00:00:00.000Z' },
        { cid: 2244, name: 'Aspirin', addedAt: '2026-04-06T00:01:00.000Z' },
      ])
    )
    render(<FavoritesBar />)
    const glucoseLink = screen.getByRole('link', { name: /glucose/i })
    const aspirinLink = screen.getByRole('link', { name: /aspirin/i })
    expect(glucoseLink).toHaveAttribute('href', '/molecule/5793')
    expect(aspirinLink).toHaveAttribute('href', '/molecule/2244')
  })

  it('shows "Favorites" heading when favorites exist', () => {
    localStorage.setItem(
      'biointel-favorites',
      JSON.stringify([
        { cid: 5793, name: 'Glucose', addedAt: '2026-04-06T00:00:00.000Z' },
      ])
    )
    render(<FavoritesBar />)
    expect(screen.getByText(/favorites/i)).toBeInTheDocument()
  })
})
