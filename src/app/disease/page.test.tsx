/**
 * @jest-environment jsdom
 */
import { deduplicateMolecules } from '@/lib/diseaseSearch'
import DiseasePage from '@/app/disease/page'
import { render, screen, waitFor } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => key === 'q' ? 'diabetes' : null }),
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/components/ai/AICopilot', () => ({
  AICopilot: () => null,
}))

jest.mock('@/lib/clientFetch', () => ({
  clientFetch: jest.fn(),
}))

import { clientFetch } from '@/lib/clientFetch'

function makeResult(overrides: Partial<{ id: string; name: string; description?: string; therapeuticAreas?: string[]; source: string; molecules?: { name: string; cid: number | null }[] }> = {}) {
  return {
    id: 'test-1',
    name: 'Test Disease',
    source: 'Open Targets',
    ...overrides,
  }
}

describe('deduplicateMolecules', () => {
  test('returns empty array for empty results', () => {
    expect(deduplicateMolecules([])).toEqual([])
  })

  test('returns empty array when results have no molecules', () => {
    const results = [makeResult(), makeResult({ id: 'test-2', name: 'Other' })]
    expect(deduplicateMolecules(results)).toEqual([])
  })

  test('returns molecules from a single result', () => {
    const results = [makeResult({
      molecules: [
        { name: 'Metformin', cid: 4048 },
        { name: 'Insulin', cid: null },
      ],
    })]
    const mol = deduplicateMolecules(results)
    expect(mol).toHaveLength(2)
    expect(mol[0]).toEqual({ name: 'Metformin', cid: 4048, sources: ['Open Targets'] })
    expect(mol[1]).toEqual({ name: 'Insulin', cid: null, sources: ['Open Targets'] })
  })

  test('merges sources when same CID appears in multiple results', () => {
    const results = [
      makeResult({
        source: 'Open Targets',
        molecules: [{ name: 'Metformin', cid: 4048 }],
      }),
      makeResult({
        id: 'test-2',
        name: 'Other Disease',
        source: 'DisGeNET',
        molecules: [{ name: 'Metformin', cid: 4048 }],
      }),
    ]
    const mol = deduplicateMolecules(results)
    expect(mol).toHaveLength(1)
    expect(mol[0].sources).toEqual(['Open Targets', 'DisGeNET'])
    expect(mol[0].name).toBe('Metformin')
    expect(mol[0].cid).toBe(4048)
  })

  test('does not duplicate source when same source appears twice', () => {
    const results = [
      makeResult({
        source: 'Open Targets',
        molecules: [{ name: 'Metformin', cid: 4048 }],
      }),
      makeResult({
        id: 'test-2',
        name: 'Other Disease',
        source: 'Open Targets',
        molecules: [{ name: 'Metformin', cid: 4048 }],
      }),
    ]
    const mol = deduplicateMolecules(results)
    expect(mol).toHaveLength(1)
    expect(mol[0].sources).toEqual(['Open Targets'])
  })

  test('deduplicates molecules without CID by lowercase name', () => {
    const results = [
      makeResult({
        source: 'Open Targets',
        molecules: [{ name: 'Insulin', cid: null }],
      }),
      makeResult({
        id: 'test-2',
        name: 'Other Disease',
        source: 'DisGeNET',
        molecules: [{ name: 'insulin', cid: null }],
      }),
    ]
    const mol = deduplicateMolecules(results)
    expect(mol).toHaveLength(1)
    expect(mol[0].name).toBe('Insulin')
    expect(mol[0].sources).toEqual(['Open Targets', 'DisGeNET'])
  })

  test('keeps different CIDs separate even with same name', () => {
    const results = [
      makeResult({
        source: 'Open Targets',
        molecules: [{ name: 'Insulin', cid: 5800 }],
      }),
      makeResult({
        id: 'test-2',
        name: 'Other Disease',
        source: 'DisGeNET',
        molecules: [{ name: 'Insulin', cid: 62189 }],
      }),
    ]
    const mol = deduplicateMolecules(results)
    expect(mol).toHaveLength(2)
    expect(mol.map(m => m.cid)).toEqual([5800, 62189])
  })

  test('keeps CID molecule and null-CID molecule separate', () => {
    const results = [
      makeResult({
        source: 'Open Targets',
        molecules: [{ name: 'Metformin', cid: 4048 }],
      }),
      makeResult({
        id: 'test-2',
        name: 'Other Disease',
        source: 'DisGeNET',
        molecules: [{ name: 'Metformin', cid: null }],
      }),
    ]
    const mol = deduplicateMolecules(results)
    expect(mol).toHaveLength(2)
  })

  test('skips results with undefined molecules', () => {
    const results = [
      makeResult({ molecules: undefined }),
      makeResult({
        id: 'test-2',
        name: 'Other Disease',
        source: 'DisGeNET',
        molecules: [{ name: 'Metformin', cid: 4048 }],
      }),
    ]
    const mol = deduplicateMolecules(results)
    expect(mol).toHaveLength(1)
    expect(mol[0].name).toBe('Metformin')
  })

  test('aggregates molecules from many results', () => {
    const results = [
      makeResult({
        source: 'Open Targets',
        molecules: [{ name: 'Metformin', cid: 4048 }, { name: 'Insulin', cid: 5800 }],
      }),
      makeResult({
        id: 'test-2',
        name: 'Other Disease',
        source: 'DisGeNET',
        molecules: [{ name: 'Metformin', cid: 4048 }, { name: 'Aspirin', cid: 2244 }],
      }),
      makeResult({
        id: 'test-3',
        name: 'Third Disease',
        source: 'Orphanet',
        molecules: [{ name: 'Insulin', cid: 5800 }],
      }),
    ]
    const mol = deduplicateMolecules(results)
    expect(mol).toHaveLength(3)
    const metformin = mol.find(m => m.cid === 4048)!
    expect(metformin.sources).toEqual(['Open Targets', 'DisGeNET'])
    const insulin = mol.find(m => m.cid === 5800)!
    expect(insulin.sources).toEqual(['Open Targets', 'Orphanet'])
    const aspirin = mol.find(m => m.cid === 2244)!
    expect(aspirin.sources).toEqual(['DisGeNET'])
  })
})

describe('DiseasePage component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders search form with input and button', async () => {
    ;(clientFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    })

    render(<DiseasePage />)

    expect(screen.getByPlaceholderText(/search a disease/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    expect(screen.getByText('Disease / Condition Search')).toBeInTheDocument()
  })

  test('renders disease results with name and source', async () => {
    ;(clientFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { id: 'EFO_1', name: 'Type 2 Diabetes', source: 'Open Targets', description: 'A metabolic disorder', molecules: [{ name: 'Metformin', cid: 4048 }] },
          { id: 'ORPHA_2', name: 'Familial Melanoma', source: 'Orphanet', molecules: [] },
        ],
      }),
    })

    render(<DiseasePage />)

    await waitFor(() => {
      expect(screen.getByText('Type 2 Diabetes')).toBeInTheDocument()
      expect(screen.getByText('Familial Melanoma')).toBeInTheDocument()
    })
    const openTargets = screen.getAllByText('Open Targets')
    expect(openTargets.length).toBeGreaterThanOrEqual(1)
    const orphanet = screen.getAllByText('Orphanet')
    expect(orphanet.length).toBeGreaterThanOrEqual(1)
  })

  test('renders related molecules section with links', async () => {
    ;(clientFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { id: 'EFO_1', name: 'Diabetes', source: 'Open Targets', molecules: [{ name: 'Metformin', cid: 4048 }, { name: 'Insulin', cid: null }] },
        ],
      }),
    })

    render(<DiseasePage />)

    await waitFor(() => {
      expect(screen.getByText('Related Molecules')).toBeInTheDocument()
    })
    await waitFor(() => {
      const metforminLinks = screen.getAllByText('Metformin')
      const cardLink = metforminLinks.find(el => el.closest('a')?.getAttribute('href') === '/molecule/4048')
      expect(cardLink).toBeTruthy()
      expect(screen.getByText('CID 4048')).toBeInTheDocument()
      expect(screen.getByText('No CID')).toBeInTheDocument()
    })
  })

  test('shows empty state when no results', async () => {
    ;(clientFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    })

    render(<DiseasePage />)

    await waitFor(() => {
      expect(screen.getByText(/no diseases found/i)).toBeInTheDocument()
    })
  })
})