import { render, screen, waitFor } from '@testing-library/react'
import { PipelinePanel } from '@/components/profile/PipelinePanel'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

const mockGetProfileClientCacheAsync = jest.fn().mockResolvedValue(undefined)
const mockSetProfileClientCache = jest.fn()

jest.mock('@/lib/profileClientCache', () => ({
  profileCacheKey: (kind: string, cid: number) => `${kind}:${cid}`,
  getProfileClientCacheAsync: (...args: unknown[]) => mockGetProfileClientCacheAsync(...args),
  setProfileClientCache: (...args: unknown[]) => mockSetProfileClientCache(...args),
  deleteProfileClientCache: jest.fn(),
}))

function emptyBags() {
  return {
    clinicalTrials: [],
    chemblIndications: [],
    chemblMechanisms: [],
    orangeBookEntries: [],
    ndcProducts: [],
    drugLabels: [],
    drugShortages: [],
    myChemAnnotations: [],
  }
}

describe('PipelinePanel honesty', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockGetProfileClientCacheAsync.mockReset()
    mockGetProfileClientCacheAsync.mockResolvedValue(undefined)
    mockSetProfileClientCache.mockReset()
  })

  it('renders pipeline after loading rows', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ...emptyBags(),
          orangeBookEntries: [
            {
              applicationNumber: 'NDA012345',
              approvalDate: '1980-01-01',
              sponsorName: 'Bayer',
              dosageForm: 'TABLET',
            },
          ],
        }),
    })
    render(<PipelinePanel cid={2244} />)
    await waitFor(() => {
      expect(screen.getByText(/Regulatory & Development Pipeline/i)).toBeInTheDocument()
    })
    expect(mockSetProfileClientCache).toHaveBeenCalled()
  })

  it('renders nothing when pipeline bags are honestly empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...emptyBags(), _emptyHonest: true }),
    })
    const { container } = render(<PipelinePanel cid={1111} />)
    await waitFor(() => {
      expect(container.querySelector('.animate-pulse')).toBeNull()
    })
    expect(screen.queryByTestId('pipeline-honesty')).toBeNull()
    expect(mockSetProfileClientCache).not.toHaveBeenCalled()
  })

  it('shows timeout honesty instead of vanishing as empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ...emptyBags(),
          _timeout: true,
          _partial: true,
          _error: 'API call timed out after 15000ms',
        }),
    })
    render(<PipelinePanel cid={2222} />)
    await waitFor(() => {
      expect(screen.getByTestId('pipeline-honesty')).toBeInTheDocument()
    })
    expect(screen.getByText(/timed out this session/i)).toBeInTheDocument()
    expect(mockSetProfileClientCache).not.toHaveBeenCalled()
  })

  it('does not serve a leftover cached empty shell', async () => {
    mockGetProfileClientCacheAsync.mockResolvedValue({
      ...emptyBags(),
      _emptyHonest: true,
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ...emptyBags(),
          orangeBookEntries: [
            {
              applicationNumber: 'NDA012345',
              approvalDate: '1980-01-01',
              sponsorName: 'Bayer',
              dosageForm: 'TABLET',
            },
          ],
        }),
    })
    render(<PipelinePanel cid={3333} />)
    await waitFor(() => {
      expect(screen.getByText(/Regulatory & Development Pipeline/i)).toBeInTheDocument()
    })
    expect(mockFetch).toHaveBeenCalled()
  })
})
