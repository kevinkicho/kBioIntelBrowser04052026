import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '@/components/search/SearchBar'

global.fetch = jest.fn()
const mockRouter = { push: jest.fn() }
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }))

beforeEach(() => {
  jest.resetAllMocks()
})

describe('SearchBar', () => {
  test('renders input with placeholder', () => {
    render(<SearchBar />)
    expect(screen.getByPlaceholderText(/search.*molecule/i)).toBeInTheDocument()
  })

  test('shows suggestions after typing 2+ characters', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ suggestions: ['insulin', 'Insulin Glargine'] }),
    })

    render(<SearchBar />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'in')

    await waitFor(() => {
      expect(screen.getByText('insulin')).toBeInTheDocument()
    })
  })

  test('navigates to molecule page when suggestion clicked', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ suggestions: ['insulin'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cid: 5800 }),
      })

    render(<SearchBar />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'in')

    await waitFor(() => screen.getByText('insulin'))
    fireEvent.click(screen.getByText('insulin'))

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalled()
    })
  })
})
