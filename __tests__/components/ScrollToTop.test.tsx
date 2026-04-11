import { render, screen, fireEvent } from '@testing-library/react'
import { ScrollToTop } from '@/components/ui/ScrollToTop'

describe('ScrollToTop', () => {
  it('is hidden when not scrolled', () => {
    render(<ScrollToTop />)
    expect(screen.queryByRole('button', { name: /scroll to top/i })).not.toBeInTheDocument()
  })

  it('appears after scrolling past 500px', () => {
    render(<ScrollToTop />)
    Object.defineProperty(window, 'scrollY', { value: 600, writable: true })
    fireEvent.scroll(window)
    expect(screen.getByRole('button', { name: /scroll to top/i })).toBeInTheDocument()
  })

  it('calls window.scrollTo on click', () => {
    render(<ScrollToTop />)
    Object.defineProperty(window, 'scrollY', { value: 600, writable: true })
    fireEvent.scroll(window)
    window.scrollTo = jest.fn()
    fireEvent.click(screen.getByRole('button', { name: /scroll to top/i }))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
