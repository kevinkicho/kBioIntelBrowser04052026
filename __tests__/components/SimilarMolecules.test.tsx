import { render, screen, waitFor } from '@testing-library/react'
import { SimilarMolecules } from '@/components/profile/SimilarMolecules'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('SimilarMolecules', () => {
  it('renders similar molecules after loading', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { cid: 5000, name: 'TestMol', formula: 'C2H4', molecularWeight: 28, imageUrl: 'http://img.png' }
      ])
    })
    render(<SimilarMolecules cid={2244} />)
    await waitFor(() => {
      expect(screen.getByText('TestMol')).toBeInTheDocument()
    })
  })

  it('renders nothing when no similar molecules', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
    const { container } = render(<SimilarMolecules cid={2244} />)
    await waitFor(() => {
      expect(container.querySelector('.animate-pulse')).toBeNull()
    })
  })
})
