import { render, screen, waitFor } from '@testing-library/react'
import { VendorsPanel } from '@/components/profile/VendorsPanel'

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

describe('VendorsPanel honesty', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockGetProfileClientCacheAsync.mockReset()
    mockGetProfileClientCacheAsync.mockResolvedValue(undefined)
    mockSetProfileClientCache.mockReset()
  })

  it('renders suppliers after loading rows', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          suppliers: [
            { name: 'Cayman Chemical', url: 'https://www.caymanchem.com/search?q=aspirin', sourceType: 'supplier' },
          ],
          databases: [],
          total: 1,
          moleculeName: 'Aspirin',
        }),
    })
    render(<VendorsPanel cid={2244} />)
    await waitFor(() => {
      expect(screen.getByText('Cayman Chemical')).toBeInTheDocument()
    })
    expect(mockSetProfileClientCache).toHaveBeenCalled()
  })

  it('renders nothing when vendors are honestly empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          suppliers: [],
          databases: [],
          total: 0,
          _emptyHonest: true,
        }),
    })
    const { container } = render(<VendorsPanel cid={1111} />)
    await waitFor(() => {
      expect(container.querySelector('.animate-pulse')).toBeNull()
    })
    expect(screen.queryByTestId('vendors-honesty')).toBeNull()
    expect(mockSetProfileClientCache).not.toHaveBeenCalled()
  })

  it('shows timeout honesty instead of vanishing as empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          suppliers: [],
          databases: [],
          total: 0,
          _timeout: true,
          _partial: true,
          _agentStatus: 'timeout',
        }),
    })
    render(<VendorsPanel cid={2222} />)
    await waitFor(() => {
      expect(screen.getByTestId('vendors-honesty')).toBeInTheDocument()
    })
    expect(screen.getByText(/timed out this session/i)).toBeInTheDocument()
    expect(mockSetProfileClientCache).not.toHaveBeenCalled()
  })

  it('does not serve a leftover cached empty shell', async () => {
    mockGetProfileClientCacheAsync.mockResolvedValue({
      suppliers: [],
      databases: [],
      total: 0,
      _emptyHonest: true,
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          suppliers: [
            { name: 'Cayman Chemical', url: 'https://www.caymanchem.com/search?q=aspirin', sourceType: 'supplier' },
          ],
          databases: [],
          total: 1,
        }),
    })
    render(<VendorsPanel cid={3333} />)
    await waitFor(() => {
      expect(screen.getByText('Cayman Chemical')).toBeInTheDocument()
    })
    expect(mockFetch).toHaveBeenCalled()
  })
})
