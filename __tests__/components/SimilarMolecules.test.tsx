import { render, screen, waitFor } from '@testing-library/react'
import { SimilarMolecules } from '@/components/profile/SimilarMolecules'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

const mockGetProfileClientCacheAsync = jest.fn().mockResolvedValue(undefined)
const mockSetProfileClientCache = jest.fn()

jest.mock('@/lib/profileClientCache', () => ({
  profileCacheKey: (kind: string, cid: number) => `${kind}:${cid}`,
  getProfileClientCacheAsync: (...args: unknown[]) => mockGetProfileClientCacheAsync(...args),
  setProfileClientCache: (...args: unknown[]) => mockSetProfileClientCache(...args),
}))

describe('SimilarMolecules', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockGetProfileClientCacheAsync.mockReset()
    mockGetProfileClientCacheAsync.mockResolvedValue(undefined)
    mockSetProfileClientCache.mockReset()
  })

  it('renders similar molecules after loading', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          structural: [
            {
              cid: 5000,
              name: 'TestMol',
              formula: 'C2H4',
              molecularWeight: 28,
              imageUrl: 'http://img.png',
            },
          ],
          targetRelated: [],
        }),
    })
    render(<SimilarMolecules cid={2244} />)
    await waitFor(() => {
      expect(screen.getByText('TestMol')).toBeInTheDocument()
    })
    expect(screen.getByText(/Why:/i)).toBeInTheDocument()
    expect(screen.getByText(/2D fingerprint match/i)).toBeInTheDocument()
    expect(mockSetProfileClientCache).toHaveBeenCalled()
  })

  it('shows why for target-related drugs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          structural: [],
          targetRelated: [
            {
              name: 'Ibuprofen',
              sharedTargets: ['PTGS2', 'PTGS1'],
              interactionTypes: ['inhibitor'],
              sources: ['DrugBank'],
            },
          ],
        }),
    })
    render(<SimilarMolecules cid={9999} />)
    await waitFor(() => {
      expect(screen.getByText('Ibuprofen')).toBeInTheDocument()
    })
    expect(screen.getByText(/Why related:/i)).toBeInTheDocument()
    expect(screen.getByText(/Shares 2 targets/i)).toBeInTheDocument()
  })

  it('renders nothing when no similar molecules', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ structural: [], targetRelated: [] }),
    })
    const { container } = render(<SimilarMolecules cid={1111} />)
    await waitFor(() => {
      expect(container.querySelector('.animate-pulse')).toBeNull()
    })
    expect(screen.queryByTestId('similar-honesty')).toBeNull()
    expect(mockSetProfileClientCache).not.toHaveBeenCalled()
  })

  it('shows timeout honesty instead of vanishing as empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          structural: [],
          targetRelated: [],
          _timeout: true,
          _partial: true,
          _agentStatus: 'timeout',
        }),
    })
    render(<SimilarMolecules cid={2222} />)
    await waitFor(() => {
      expect(screen.getByTestId('similar-honesty')).toBeInTheDocument()
    })
    expect(screen.getByText(/timed out this session/i)).toBeInTheDocument()
    expect(mockSetProfileClientCache).not.toHaveBeenCalled()
  })

  it('does not serve a leftover cached empty shell', async () => {
    mockGetProfileClientCacheAsync.mockResolvedValue({
      structural: [],
      targetRelated: [],
      _emptyHonest: true,
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          structural: [
            {
              cid: 5000,
              name: 'LiveMol',
              formula: 'C2H4',
              molecularWeight: 28,
              imageUrl: 'http://img.png',
            },
          ],
          targetRelated: [],
        }),
    })
    render(<SimilarMolecules cid={3333} />)
    await waitFor(() => {
      expect(screen.getByText('LiveMol')).toBeInTheDocument()
    })
    expect(mockFetch).toHaveBeenCalled()
  })
})
