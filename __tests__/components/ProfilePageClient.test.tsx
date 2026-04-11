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
      expect(mockFetchCategoryData).toHaveBeenCalledWith(2244, 'pharmaceutical')
    })
  })

  it('loads data when a category is selected from the dropdown', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    // Open dropdown and select Bioactivity
    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bioactivity-targets' } })
    })
    // Should load Bioactivity data
    expect(mockFetchCategoryData).toHaveBeenCalledWith(2244, 'bioactivity-targets')
  })

  it('returns to all categories when All is selected from the dropdown', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    // Select Bioactivity
    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bioactivity-targets' } })
    })
    // Select All
    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'all' } })
    })
    // All view should show all category sections
    const bioactivitySections = screen.queryAllByText('Bioactivity & Targets')
    expect(bioactivitySections[bioactivitySections.length - 1]).toBeInTheDocument()
    const interactionsSections = screen.queryAllByText('Interactions & Pathways')
    expect(interactionsSections[interactionsSections.length - 1]).toBeInTheDocument()
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

  it('switches to graph view and shows load all button', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Network/))
    })
    expect(screen.getByText('Load all data for network graph')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search panels...')).not.toBeInTheDocument()
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

  it('summary card click updates the category dropdown', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Approval & Products').closest('button')!)
    })
    expect(screen.getByRole('combobox')).toHaveValue('pharmaceutical')
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
    // Load clinical-safety to get trial data
    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'clinical-safety' } })
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
      expect(screen.getByText('Failed to load data')).toBeInTheDocument()
    })
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('shows load data button for unloaded categories in All view', async () => {
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    // Unloaded categories should show "Load data" buttons
    const loadButtons = screen.getAllByText('Load data')
    expect(loadButtons.length).toBeGreaterThan(0)
  })

  it('initializes from URL search params', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('tab=clinical-safety'))
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    await waitFor(() => {
      expect(mockFetchCategoryData).toHaveBeenCalledWith(2244, 'clinical-safety')
    })
  })

  it('defaults to pharmaceutical when no URL params', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams(''))
    await act(async () => {
      render(<ProfilePageClient {...defaultProps} />)
    })
    await waitFor(() => {
      expect(mockFetchCategoryData).toHaveBeenCalledWith(2244, 'pharmaceutical')
    })
  })
})
