import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { BatchClient } from '@/app/batch/BatchClient'

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

describe('BatchClient', () => {
  test('renders 3 initial molecule search inputs', () => {
    render(<BatchClient />)
    expect(screen.getByText('Molecule 1')).toBeInTheDocument()
    expect(screen.getByText('Molecule 2')).toBeInTheDocument()
    expect(screen.getByText('Molecule 3')).toBeInTheDocument()
    const inputs = screen.getAllByPlaceholderText('Search molecule...')
    expect(inputs).toHaveLength(3)
  })

  test('renders Add Molecule button', () => {
    render(<BatchClient />)
    expect(screen.getByText('+ Add Molecule')).toBeInTheDocument()
  })

  test('Compare button is disabled when no molecules are resolved', () => {
    render(<BatchClient />)
    const btn = screen.getByRole('button', { name: /compare/i })
    expect(btn).toBeDisabled()
  })

  test('adds a new molecule input when Add Molecule is clicked', () => {
    render(<BatchClient />)
    fireEvent.click(screen.getByText('+ Add Molecule'))
    const inputs = screen.getAllByPlaceholderText('Search molecule...')
    expect(inputs).toHaveLength(4)
    expect(screen.getByText('Molecule 4')).toBeInTheDocument()
  })

  test('remove buttons are visible for each slot and work when > 2 slots', async () => {
    render(<BatchClient />)
    // 3 initial slots — remove buttons should be present
    const removeButtons = screen.getAllByRole('button', { name: /remove molecule/i })
    expect(removeButtons.length).toBe(3)

    // Click remove for slot 3
    fireEvent.click(removeButtons[2])
    await waitFor(() => {
      const inputs = screen.getAllByPlaceholderText('Search molecule...')
      expect(inputs).toHaveLength(2)
    })
  })

  test('remove buttons disappear when only 2 slots remain', async () => {
    render(<BatchClient />)
    // Remove until 2 remain
    const removeButtons = screen.getAllByRole('button', { name: /remove molecule/i })
    fireEvent.click(removeButtons[2])
    // After removal, 2 slots remain — no remove buttons should be shown
    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /remove molecule/i })).toHaveLength(0)
    })
  })

  test('Compare button enabled after resolving 2 molecules via API', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/search/resolve')) {
        const name = url.includes('aspirin') ? 'Aspirin' : 'Ibuprofen'
        const cid = url.includes('aspirin') ? 2244 : 3672
        return Promise.resolve({ ok: true, json: async () => ({ cid, name }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ suggestions: ['aspirin', 'ibuprofen'] }) })
    })

    render(<BatchClient />)

    const inputs = screen.getAllByPlaceholderText('Search molecule...')
    fireEvent.change(inputs[0], { target: { value: 'aspirin' } })

    await act(async () => { jest.runAllTimers() })

    // Select from dropdown
    await waitFor(() => {
      expect(screen.getByText('aspirin')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('aspirin'))

    await act(async () => { jest.runAllTimers() })

    await waitFor(() => {
      expect(screen.getByText(/CID 2244/)).toBeInTheDocument()
    })

    fireEvent.change(inputs[1], { target: { value: 'ibuprofen' } })
    await act(async () => { jest.runAllTimers() })

    await waitFor(() => {
      expect(screen.getByText('ibuprofen')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('ibuprofen'))

    await act(async () => { jest.runAllTimers() })

    await waitFor(() => {
      expect(screen.getByText(/CID 3672/)).toBeInTheDocument()
    })

    const compareBtn = screen.getByRole('button', { name: /compare/i })
    expect(compareBtn).not.toBeDisabled()
  })

  test('calls /api/batch and renders results table', async () => {
    const mockBatchResult = {
      molecules: [
        {
          cid: 2244,
          name: 'Aspirin',
          formula: 'C9H8O4',
          molecularWeight: 180.16,
          classification: 'therapeutic',
          structureImageUrl: '',
          properties: {
            xLogP: 1.2,
            tpsa: 63.6,
            hBondDonorCount: 1,
            hBondAcceptorCount: 4,
            rotatableBondCount: 3,
            complexity: 212,
            exactMass: 180.04,
            charge: 0,
          },
        },
        {
          cid: 3672,
          name: 'Ibuprofen',
          formula: 'C13H18O2',
          molecularWeight: 206.28,
          classification: 'therapeutic',
          structureImageUrl: '',
          properties: {
            xLogP: 3.5,
            tpsa: 37.3,
            hBondDonorCount: 1,
            hBondAcceptorCount: 2,
            rotatableBondCount: 4,
            complexity: 181,
            exactMass: 206.13,
            charge: 0,
          },
        },
      ],
    }

    ;(global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => mockBatchResult })
      }
      if (url.includes('/api/search/resolve')) {
        const cid = url.includes('aspirin') ? 2244 : 3672
        return Promise.resolve({ ok: true, json: async () => ({ cid }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ suggestions: ['aspirin', 'ibuprofen'] }) })
    })

    render(<BatchClient />)

    const inputs = screen.getAllByPlaceholderText('Search molecule...')
    fireEvent.change(inputs[0], { target: { value: 'aspirin' } })
    await act(async () => { jest.runAllTimers() })
    await waitFor(() => expect(screen.getByText('aspirin')).toBeInTheDocument())
    fireEvent.click(screen.getByText('aspirin'))
    await act(async () => { jest.runAllTimers() })

    fireEvent.change(inputs[1], { target: { value: 'ibuprofen' } })
    await act(async () => { jest.runAllTimers() })
    await waitFor(() => expect(screen.getByText('ibuprofen')).toBeInTheDocument())
    fireEvent.click(screen.getByText('ibuprofen'))
    await act(async () => { jest.runAllTimers() })

    const compareBtn = screen.getByRole('button', { name: /compare/i })
    await waitFor(() => expect(compareBtn).not.toBeDisabled())
    fireEvent.click(compareBtn)

    await waitFor(() => {
      expect(screen.getByText('Aspirin')).toBeInTheDocument()
      expect(screen.getByText('Ibuprofen')).toBeInTheDocument()
      expect(screen.getByText('C9H8O4')).toBeInTheDocument()
      expect(screen.getByText('C13H18O2')).toBeInTheDocument()
    })
  })

  test('shows error message when batch API fails', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Failed to fetch data' }),
        })
      }
      if (url.includes('/api/search/resolve')) {
        const cid = url.includes('aspirin') ? 2244 : 3672
        return Promise.resolve({ ok: true, json: async () => ({ cid }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ suggestions: ['aspirin', 'ibuprofen'] }) })
    })

    render(<BatchClient />)

    const inputs = screen.getAllByPlaceholderText('Search molecule...')
    fireEvent.change(inputs[0], { target: { value: 'aspirin' } })
    await act(async () => { jest.runAllTimers() })
    await waitFor(() => expect(screen.getByText('aspirin')).toBeInTheDocument())
    fireEvent.click(screen.getByText('aspirin'))
    await act(async () => { jest.runAllTimers() })

    fireEvent.change(inputs[1], { target: { value: 'ibuprofen' } })
    await act(async () => { jest.runAllTimers() })
    await waitFor(() => expect(screen.getByText('ibuprofen')).toBeInTheDocument())
    fireEvent.click(screen.getByText('ibuprofen'))
    await act(async () => { jest.runAllTimers() })

    const compareBtn = screen.getByRole('button', { name: /compare/i })
    await waitFor(() => expect(compareBtn).not.toBeDisabled())
    fireEvent.click(compareBtn)

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch data/i)).toBeInTheDocument()
    })
  })
})
