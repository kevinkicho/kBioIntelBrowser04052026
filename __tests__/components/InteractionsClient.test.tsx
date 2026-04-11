import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { InteractionsClient } from '@/app/interactions/InteractionsClient'

// Reset module-level nextId before each test suite run
beforeAll(() => {
  jest.useFakeTimers()
})

afterAll(() => {
  jest.useRealTimers()
})

beforeEach(() => {
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('InteractionsClient', () => {
  test('renders two drug inputs by default', () => {
    render(<InteractionsClient />)
    expect(screen.getByTestId('drug-input-0')).toBeInTheDocument()
    expect(screen.getByTestId('drug-input-1')).toBeInTheDocument()
  })

  test('renders Add Drug button', () => {
    render(<InteractionsClient />)
    expect(screen.getByTestId('add-drug-button')).toBeInTheDocument()
  })

  test('Check Interactions button is disabled when no drugs filled', () => {
    render(<InteractionsClient />)
    const btn = screen.getByTestId('check-button')
    expect(btn).toBeDisabled()
  })

  test('Check Interactions button enabled when 2+ drugs filled', async () => {
    render(<InteractionsClient />)
    const input0 = screen.getByTestId('drug-input-0')
    const input1 = screen.getByTestId('drug-input-1')

    fireEvent.change(input0, { target: { value: 'warfarin' } })
    fireEvent.change(input1, { target: { value: 'aspirin' } })

    // Flush any pending state
    await act(async () => { jest.runAllTimers() })

    expect(screen.getByTestId('check-button')).not.toBeDisabled()
  })

  test('adds a new drug input when Add Drug is clicked', () => {
    render(<InteractionsClient />)
    fireEvent.click(screen.getByTestId('add-drug-button'))
    expect(screen.getByTestId('drug-input-2')).toBeInTheDocument()
  })

  test('remove button is disabled when only 2 drugs remain', () => {
    render(<InteractionsClient />)
    const removeBtn0 = screen.getByTestId('remove-drug-0')
    expect(removeBtn0).toBeDisabled()
  })

  test('removes a drug input when remove button clicked (with 3 drugs)', async () => {
    render(<InteractionsClient />)
    // Add a third drug
    fireEvent.click(screen.getByTestId('add-drug-button'))
    expect(screen.getByTestId('drug-input-2')).toBeInTheDocument()

    // Remove the third one
    const removeBtn2 = screen.getByTestId('remove-drug-2')
    expect(removeBtn2).not.toBeDisabled()
    fireEvent.click(removeBtn2)

    await waitFor(() => {
      expect(screen.queryByTestId('drug-input-2')).not.toBeInTheDocument()
    })
  })

  test('calls the interactions API and shows results', async () => {
    const mockInteractionsResponse = {
      interactions: [
        {
          drugA: 'warfarin',
          drugB: 'aspirin',
          severity: 'major',
          description: 'Increased bleeding risk',
          source: 'ONCHigh',
        },
      ],
      warnings: [],
    }

    // Mock fetch to always return empty suggestions for autocomplete calls,
    // and the interaction response for the POST call
    ;(global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => mockInteractionsResponse,
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ suggestions: [] }),
      })
    })

    render(<InteractionsClient />)

    fireEvent.change(screen.getByTestId('drug-input-0'), { target: { value: 'warfarin' } })
    fireEvent.change(screen.getByTestId('drug-input-1'), { target: { value: 'aspirin' } })

    await act(async () => { jest.runAllTimers() })

    fireEvent.click(screen.getByTestId('check-button'))

    await waitFor(() => {
      expect(screen.getByTestId('results-section')).toBeInTheDocument()
    })

    expect(screen.getByText(/Increased bleeding risk/)).toBeInTheDocument()
    expect(screen.getByTestId('interaction-card')).toBeInTheDocument()
  })

  test('shows no-interaction success message when empty interactions returned', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ interactions: [], warnings: [] }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({ suggestions: [] }) })
    })

    render(<InteractionsClient />)
    fireEvent.change(screen.getByTestId('drug-input-0'), { target: { value: 'tylenol' } })
    fireEvent.change(screen.getByTestId('drug-input-1'), { target: { value: 'ibuprofen' } })

    await act(async () => { jest.runAllTimers() })

    fireEvent.click(screen.getByTestId('check-button'))

    await waitFor(() => {
      expect(screen.getByText(/No known interactions found/i)).toBeInTheDocument()
    })
  })

  test('shows warning when drug cannot be resolved', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            interactions: [],
            warnings: ["Could not resolve 'xyz123' to an RxNorm concept"],
          }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({ suggestions: [] }) })
    })

    render(<InteractionsClient />)
    fireEvent.change(screen.getByTestId('drug-input-0'), { target: { value: 'aspirin' } })
    fireEvent.change(screen.getByTestId('drug-input-1'), { target: { value: 'xyz123' } })

    await act(async () => { jest.runAllTimers() })

    fireEvent.click(screen.getByTestId('check-button'))

    await waitFor(() => {
      expect(screen.getByText(/Could not resolve 'xyz123'/)).toBeInTheDocument()
    })
  })
})
