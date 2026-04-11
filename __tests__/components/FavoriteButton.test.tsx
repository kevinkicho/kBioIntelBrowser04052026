import { render, screen, fireEvent } from '@testing-library/react'
import { FavoriteButton } from '@/components/profile/FavoriteButton'

describe('FavoriteButton', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders outline heart when not favorited', () => {
    render(<FavoriteButton cid={5793} name="Glucose" />)
    const button = screen.getByRole('button', { name: /favorite/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('♡')
  })

  it('toggles to filled heart on click', () => {
    render(<FavoriteButton cid={5793} name="Glucose" />)
    const button = screen.getByRole('button', { name: /favorite/i })
    fireEvent.click(button)
    expect(button).toHaveTextContent('♥')
  })

  it('toggles back to outline on second click', () => {
    render(<FavoriteButton cid={5793} name="Glucose" />)
    const button = screen.getByRole('button', { name: /favorite/i })
    fireEvent.click(button)
    expect(button).toHaveTextContent('♥')
    fireEvent.click(button)
    expect(button).toHaveTextContent('♡')
  })
})
