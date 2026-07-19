import { render, screen } from '@testing-library/react'
import { PdbPanel } from '@/components/profile/PdbPanel'
import type { PdbStructure } from '@/lib/types'

jest.mock('@/lib/clientFetch', () => ({
  clientFetch: jest.fn().mockResolvedValue({ ok: false }),
}))


const mockStructures: PdbStructure[] = [
  {
    pdbId: '1M17',
    title: 'EGFR kinase with erlotinib',
    resolution: 2.6,
    method: 'X-RAY DIFFRACTION',
    releaseDate: '2002-09-04',
    depositionDate: '2002-06-17',
    organisms: [],
    chains: [],
    url: 'https://www.rcsb.org/structure/1M17',
    spaceGroup: 'I 2 3',
    polymerTypes: 'Protein (only)',
    molecularWeightKda: 38.27,
    citationDoi: '10.1074/jbc.M207135200',
    citationPmid: 12196540,
    keywords: 'TRANSFERASE',
  },
]

describe('PdbPanel', () => {
  test('renders detailed listview headers', () => {
    render(<PdbPanel structures={mockStructures} />)
    expect(screen.getByText('PDB')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Method')).toBeInTheDocument()
    expect(screen.getByText('Res.')).toBeInTheDocument()
  })

  test('PDB id deep-links to RCSB', () => {
    render(<PdbPanel structures={mockStructures} />)
    const link = screen.getByRole('link', { name: '1M17' })
    expect(link).toHaveAttribute('href', 'https://www.rcsb.org/structure/1M17')
  })

  test('X-ray method chip is clickable experimental deep link', () => {
    render(<PdbPanel structures={mockStructures} />)
    const chip = screen.getByTestId('pdb-method-1M17')
    expect(chip.tagName.toLowerCase()).toBe('a')
    expect(chip).toHaveAttribute('href', expect.stringContaining('experiment'))
    expect(chip).toHaveTextContent('X-ray')
  })

  test('shows space group and other chips', () => {
    render(<PdbPanel structures={mockStructures} />)
    expect(screen.getByText('I 2 3')).toBeInTheDocument()
    expect(screen.getByText(/38\.3 kDa/)).toBeInTheDocument()
    expect(screen.getByText('DOI')).toBeInTheDocument()
    expect(screen.getByText('PubMed')).toBeInTheDocument()
  })

  test('shows characterization chips (CIF available; SPR empty placeholder)', () => {
    render(<PdbPanel structures={mockStructures} />)
    const cif = screen.getByTestId('pdb-char-cif-1M17')
    expect(cif).toHaveAttribute('data-availability', 'available')
    expect(cif).toHaveAttribute('href', expect.stringContaining('.cif'))
    const spr = screen.getByTestId('pdb-char-spr-1M17')
    expect(spr).toHaveAttribute('data-availability', 'empty')
    expect(spr).toHaveAttribute('href', expect.stringContaining('pubmed'))
    expect(screen.getByTestId('pdb-char-cd-1M17')).toHaveAttribute(
      'data-availability',
      'explore',
    )
  })
})

