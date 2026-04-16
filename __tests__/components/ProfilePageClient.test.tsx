import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '../mocks/IntersectionObserver'
import { ProfilePageClient } from '@/app/molecule/[id]/ProfilePageClient'

const mockRouterReplace = jest.fn()
const mockUseSearchParams = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  useSearchParams: () => mockUseSearchParams(),
}))

jest.mock('@/components/graph/NetworkGraph', () => ({
  NetworkGraph: () => <div data-testid="network-graph" />
}))

jest.mock('@/components/profile/SimilarMolecules', () => ({
  SimilarMolecules: () => null,
}))

jest.mock('@/lib/ai/useAI', () => ({
  useAI: () => ({
    mounted: true,
    enabled: false,
    status: 'unknown',
    ollamaUrl: '',
    model: '',
    availableModels: [],
    modelInfo: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    selectModel: jest.fn(),
    pullModel: jest.fn(),
    pullProgress: null,
    askAI: jest.fn(),
  }),
  AIProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('@/lib/exportData', () => ({
  ...jest.requireActual('@/lib/exportData'),
  downloadFile: jest.fn(),
}))

// Mock fetchCategoryData — returns empty data per category by default
const mockFetchCategoryData = jest.fn()
jest.mock('@/lib/fetchCategory', () => ({
  ...jest.requireActual('@/lib/fetchCategory'),
  fetchCategoryData: (...args: unknown[]) => mockFetchCategoryData(...args),
}))

function emptyPharmaceutical() {
  return {
    companies: [], ndcProducts: [], orangeBookEntries: [],
    drugPrices: [], drugInteractions: [], drugLabels: [], atcClassifications: [],
  }
}

function emptyClinicalSafety() {
  return {
    clinicalTrials: [], adverseEvents: [], drugRecalls: [],
    chemblIndications: [], clinVarVariants: [], gwasAssociations: [],
  }
}

function emptyCategory() {
  return {}
}

const defaultProps = {
  cid: 2244,
  moleculeName: 'Aspirin',
  molecularWeight: 180.16,
  inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
  iupacName: '2-acetoxybenzoic acid',
}

describe('ProfilePageClient', () => {
  beforeEach(() => {
    mockFetchCategoryData.mockReset()
    mockRouterReplace.mockReset()
    mockUseSearchParams.mockReturnValue(new URLSearchParams(''))
    // Default: pharmaceutical auto-loads, return empty data
    mockFetchCategoryData.mockImplementation((_cid: number, catId: string) => {
      if (catId === 'pharmaceutical') return Promise.resolve(emptyPharmaceutical())
      if (catId === 'clinical-safety') return Promise.resolve(emptyClinicalSafety())
      return Promise.resolve(emptyCategory())
    })
  })

  it('renders category toggle buttons and summary cards', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    expect(screen.getByRole('button', { name: /📋 Panels/ })).toBeInTheDocument()
    expect(screen.getByText('Approval & Products')).toBeInTheDocument()
    expect(screen.getByText('Research Activity')).toBeInTheDocument()
  })

  it('renders search input', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    expect(screen.getByPlaceholderText('Search panels...')).toBeInTheDocument()
  })

  it('auto-loads pharmaceutical category on mount', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    await waitFor(() => {
      expect(mockFetchCategoryData).toHaveBeenCalledWith(2244, 'pharmaceutical', expect.anything(), expect.anything())
    })
  })

  it('loads data when a category tab is clicked', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    // Click the Bioactivity tab
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Bioactivity & Targets/ }))
    })
    // Should load Bioactivity data
    expect(mockFetchCategoryData).toHaveBeenCalledWith(2244, 'bioactivity-targets', expect.anything(), expect.anything())
  })

  it('returns to all categories when All tab is clicked', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    // Click Bioactivity tab
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Bioactivity & Targets/ }))
    })
    // Click All tab
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^All/ }))
    })
    // All view should show all category sections
    const bioactivitySections = screen.queryAllByText('Bioactivity & Targets')
    expect(bioactivitySections.length).toBeGreaterThan(0)
    const interactionsSections = screen.queryAllByText('Interactions & Pathways')
    expect(interactionsSections.length).toBeGreaterThan(0)
  })

  it('shows correct data availability counts in summary cards', async () => {
    mockFetchCategoryData.mockImplementation((_cid: number, catId: string) => {
      if (catId === 'pharmaceutical') {
        return Promise.resolve({
          ...emptyPharmaceutical(),
          companies: [{ brandName: 'Test', company: 'X', genericName: 'test', route: 'oral', applicationNumber: '' }],
          drugLabels: [{ name: 'Test', splId: '1', url: 'http://test.com' }],
        })
      }
      return Promise.resolve(emptyCategory())
    })
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    await waitFor(() => {
      const approvalCard = screen.getByText('Approval & Products').closest('button')!
      expect(approvalCard.textContent).toContain('1') // 1 data point (companies)
    })
  })

  it('switches to graph view', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    const networkButton = screen.queryByText(/Network/)
    if (networkButton) {
      await act(async () => {
        fireEvent.click(networkButton)
      })
      // In graph view, panel search should not be visible
      expect(screen.queryByPlaceholderText('Search panels...')).not.toBeInTheDocument()
    }
  })

  it('renders molecule summary cards', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    expect(screen.getByText('Approval & Products')).toBeInTheDocument()
    expect(screen.getByText('Safety Signals')).toBeInTheDocument()
    expect(screen.getByText('Clinical Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Research Activity')).toBeInTheDocument()
    expect(screen.getByText('Biological Profile')).toBeInTheDocument()
    expect(screen.getByText('Structural Data')).toBeInTheDocument()
  })

  it('summary card click loads the corresponding category', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Approval & Products').closest('button')!)
    })
    expect(mockFetchCategoryData).toHaveBeenCalledWith(2244, 'pharmaceutical', expect.anything(), expect.anything())
  })

  it('summary cards update when category data loads', async () => {
    mockFetchCategoryData.mockImplementation((_cid: number, catId: string) => {
      if (catId === 'pharmaceutical') {
        return Promise.resolve({
          ...emptyPharmaceutical(),
          companies: [
            { brandName: 'A', company: 'X', genericName: 'a', route: 'oral', applicationNumber: '' },
            { brandName: 'B', company: 'Y', genericName: 'b', route: 'oral', applicationNumber: '' },
            { brandName: 'C', company: 'Z', genericName: 'c', route: 'oral', applicationNumber: '' },
          ],
        })
      }
      if (catId === 'clinical-safety') {
        return Promise.resolve({
          ...emptyClinicalSafety(),
          clinicalTrials: [
            { nctId: 'NCT001', title: 'Trial 1', phase: 'Phase 2', status: 'Recruiting', sponsor: 'X', startDate: '2025-01', conditions: [] },
            { nctId: 'NCT002', title: 'Trial 2', phase: 'Phase 3', status: 'Active', sponsor: 'Y', startDate: '2025-02', conditions: [] },
          ],
        })
      }
      return Promise.resolve(emptyCategory())
    })
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    // Wait for pharmaceutical data to load
    await waitFor(() => {
      const approvalCard = screen.getByText('Approval & Products').closest('button')!
      expect(approvalCard.textContent).toContain('3')
    })
    // Load clinical-safety by clicking the tab
    await act(async () => {
      const clinicalButtons = screen.getAllByRole('button', { name: /Clinical & Safety/ })
      fireEvent.click(clinicalButtons[0])
    })
    await waitFor(() => {
      const clinicalCard = screen.getByText('Clinical Pipeline').closest('button')!
      expect(clinicalCard.textContent).toContain('2')
    })
  })

  it('shows loading skeletons while category is fetching', async () => {
    // Make fetch hang
    mockFetchCategoryData.mockImplementation(() => new Promise(() => {}))
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    // Should show loading skeleton (animate-pulse elements)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows error state with retry button on fetch failure', async () => {
    mockFetchCategoryData.mockRejectedValue(new Error('Network error'))
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    await waitFor(() => {
      expect(screen.getAllByText('Failed to load data').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('Retry').length).toBeGreaterThan(0)
  })

  it('shows All tab with all category tabs', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    // All tab should be present along with category tabs
    expect(screen.getByRole('button', { name: /^All/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pharmaceutical/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clinical & Safety/ })).toBeInTheDocument()
  })

  it('initializes from URL search params', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('tab=clinical-safety'))
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    await waitFor(() => {
      expect(mockFetchCategoryData).toHaveBeenCalledWith(2244, 'clinical-safety', expect.anything(), expect.anything())
    })
  })

  it('defaults to pharmaceutical when no URL params', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams(''))
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    await waitFor(() => {
      expect(mockFetchCategoryData).toHaveBeenCalledWith(2244, 'pharmaceutical', expect.anything(), expect.anything())
    })
  })
})
