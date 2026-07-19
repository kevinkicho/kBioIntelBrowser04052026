import { render, screen, waitFor } from '@testing-library/react'
import { SimilarMolecules } from '@/components/profile/SimilarMolecules'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

jest.mock('@/lib/profileClientCache', () => ({
  profileCacheKey: (kind: string, cid: number) => `${kind}:${cid}`,
  getProfileClientCacheAsync: jest.fn().mockResolvedValue(undefined),
  setProfileClientCache: jest.fn(),
}))

describe('SimilarMolecules', () => {
  beforeEach(() => {
    mockFetch.mockReset()
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
  })
})
