import { render, screen } from '@testing-library/react'
import { AlphaFoldPanel } from '@/components/profile/AlphaFoldPanel'
import type { AlphaFoldPrediction } from '@/lib/types'

const mockPredictions: AlphaFoldPrediction[] = [
  {
    entryId: 'AF-P12821-F1',
    uniprotAccession: 'P12821',
    geneName: 'ACE',
    organismName: 'Homo sapiens',
    confidenceScore: 92.5,
    modelUrl: 'https://alphafold.ebi.ac.uk/files/AF-P12821-F1-model_v4.cif',
    url: 'https://alphafold.ebi.ac.uk/entry/P12821',
  },
  {
    entryId: 'AF-Q9Y5Y4-F1',
    uniprotAccession: 'Q9Y5Y4',
    geneName: 'GENE2',
    organismName: 'Homo sapiens',
    confidenceScore: 75.0,
    modelUrl: '',
    url: 'https://alphafold.ebi.ac.uk/entry/Q9Y5Y4',
  },
]

describe('AlphaFoldPanel', () => {
  test('renders UniProt accession badges', () => {
    render(<AlphaFoldPanel predictions={mockPredictions} />)
    expect(screen.getByText('P12821')).toBeInTheDocument()
    expect(screen.getByText('Q9Y5Y4')).toBeInTheDocument()
  })

  test('renders gene names', () => {
    render(<AlphaFoldPanel predictions={mockPredictions} />)
    expect(screen.getByText('ACE')).toBeInTheDocument()
    expect(screen.getByText('GENE2')).toBeInTheDocument()
  })

  test('renders confidence scores', () => {
    render(<AlphaFoldPanel predictions={mockPredictions} />)
    expect(screen.getByText('pLDDT 92.5')).toBeInTheDocument()
    expect(screen.getByText('pLDDT 75.0')).toBeInTheDocument()
  })

  test('renders link to AlphaFold DB', () => {
    render(<AlphaFoldPanel predictions={mockPredictions} />)
    const links = screen.getAllByRole('link', { name: /view in alphafold db/i })
    expect(links[0]).toHaveAttribute('href', 'https://alphafold.ebi.ac.uk/entry/P12821')
  })

  test('renders Download CIF link only when modelUrl is present', () => {
    render(<AlphaFoldPanel predictions={mockPredictions} />)
    const cifLinks = screen.getAllByRole('link', { name: /download cif/i })
    expect(cifLinks).toHaveLength(1)
  })

  test('renders empty state when no predictions', () => {
    render(<AlphaFoldPanel predictions={[]} />)
    expect(screen.getByText(/no alphafold predictions found/i)).toBeInTheDocument()
  })
})
