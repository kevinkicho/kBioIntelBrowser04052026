import { render, screen } from '@testing-library/react'
import { ProteinAtlasPanel } from '@/components/profile/ProteinAtlasPanel'
import type { ProteinAtlasEntry } from '@/lib/types'

const mockEntries: ProteinAtlasEntry[] = [
  {
    gene: 'ACE',
    uniprotId: 'P12821',
    subcellularLocations: ['Cytoplasm', 'Cell membrane'],
    url: 'https://www.proteinatlas.org/ACE',
  },
  {
    gene: 'ACE2',
    uniprotId: 'Q9BYF1',
    subcellularLocations: [],
    url: 'https://www.proteinatlas.org/ACE2',
  },
]

describe('ProteinAtlasPanel', () => {
  test('renders gene badges', () => {
    render(<ProteinAtlasPanel entries={mockEntries} />)
    expect(screen.getByText('ACE')).toBeInTheDocument()
    expect(screen.getByText('ACE2')).toBeInTheDocument()
  })

  test('renders UniProt IDs', () => {
    render(<ProteinAtlasPanel entries={mockEntries} />)
    expect(screen.getByText('P12821')).toBeInTheDocument()
    expect(screen.getByText('Q9BYF1')).toBeInTheDocument()
  })

  test('renders subcellular location tags', () => {
    render(<ProteinAtlasPanel entries={mockEntries} />)
    expect(screen.getByText('Cytoplasm')).toBeInTheDocument()
    expect(screen.getByText('Cell membrane')).toBeInTheDocument()
  })

  test('renders link to Protein Atlas', () => {
    render(<ProteinAtlasPanel entries={mockEntries} />)
    const links = screen.getAllByRole('link', { name: /view in protein atlas/i })
    expect(links[0]).toHaveAttribute('href', 'https://www.proteinatlas.org/ACE')
  })

  test('renders empty state when no entries', () => {
    render(<ProteinAtlasPanel entries={[]} />)
    expect(screen.getByText(/no human protein atlas data found/i)).toBeInTheDocument()
  })
})
