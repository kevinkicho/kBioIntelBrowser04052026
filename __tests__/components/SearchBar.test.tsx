import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '@/components/search/SearchBar'

global.fetch = jest.fn()
const mockRouter = { push: jest.fn() }
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }))

beforeEach(() => {
  jest.resetAllMocks()
})

describe('SearchBar (unified)', () => {
  test('renders unified placeholder', () => {
    render(<SearchBar />)
    expect(screen.getByPlaceholderText(/disease, molecule, or gene/i)).toBeInTheDocument()
  })

  test('shows typed hits with kind badges', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        searchType: 'all',
        results: [
          { kind: 'disease', label: 'diabetes' },
          { kind: 'molecule', label: 'aspirin' },
          { kind: 'gene', label: 'BRCA1', geneKey: '672-BRCA1' },
        ],
        suggestions: ['diabetes', 'aspirin', 'BRCA1'],
      }),
    })

    render(<SearchBar />)
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'as')

    await waitFor(() => {
      expect(screen.getByText('aspirin')).toBeInTheDocument()
      expect(screen.getByText('diabetes')).toBeInTheDocument()
      expect(screen.getByText('BRCA1')).toBeInTheDocument()
      // Group headers + row badges both use DISEASE/MOLECULE/GENE labels
      expect(screen.getAllByText('DISEASE').length).toBeGreaterThan(0)
      expect(screen.getAllByText('MOLECULE').length).toBeGreaterThan(0)
      expect(screen.getAllByText('GENE').length).toBeGreaterThan(0)
    })
  })

  test('navigates to molecule when molecule hit clicked', async () => {
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ kind: 'molecule', label: 'insulin' }],
          suggestions: ['insulin'],
        }),
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

  test('navigates to disease page when disease hit clicked', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ kind: 'disease', label: 'cancer' }],
        suggestions: ['cancer'],
      }),
    })

    render(<SearchBar />)
    await userEvent.type(screen.getByRole('textbox'), 'ca')
    await waitFor(() => screen.getByText('cancer'))
    fireEvent.click(screen.getByText('cancer'))

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('/disease?q=cancer'),
      )
    })
  })
})
