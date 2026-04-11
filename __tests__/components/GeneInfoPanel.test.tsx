import { render, screen } from '@testing-library/react'
import { GeneInfoPanel } from '@/components/profile/GeneInfoPanel'
import type { GeneInfo } from '@/lib/types'

const mockGenes: GeneInfo[] = [
  {
    geneId: '1636',
    symbol: 'ACE',
    name: 'angiotensin I converting enzyme',
    summary: 'This gene encodes an enzyme involved in catalyzing the conversion of angiotensin I into a physiologically active peptide angiotensin II.',
    chromosome: '17',
    mapLocation: '17q23.3',
    organism: 'Homo sapiens',
    url: 'https://www.ncbi.nlm.nih.gov/gene/1636',
  },
]

describe('GeneInfoPanel', () => {
  test('renders gene symbol badge', () => {
    render(<GeneInfoPanel genes={mockGenes} />)
    expect(screen.getByText('ACE')).toBeInTheDocument()
  })

  test('renders full gene name', () => {
    render(<GeneInfoPanel genes={mockGenes} />)
    expect(screen.getByText('angiotensin I converting enzyme')).toBeInTheDocument()
  })

  test('renders chromosome', () => {
    render(<GeneInfoPanel genes={mockGenes} />)
    expect(screen.getByText('Chr 17')).toBeInTheDocument()
  })

  test('renders summary text', () => {
    render(<GeneInfoPanel genes={mockGenes} />)
    expect(screen.getByText(/catalyzing the conversion/i)).toBeInTheDocument()
  })

  test('renders link to NCBI Gene', () => {
    render(<GeneInfoPanel genes={mockGenes} />)
    const link = screen.getByRole('link', { name: /view in ncbi gene/i })
    expect(link).toHaveAttribute('href', 'https://www.ncbi.nlm.nih.gov/gene/1636')
  })

  test('renders empty state when no genes', () => {
    render(<GeneInfoPanel genes={[]} />)
    expect(screen.getByText(/no gene information found/i)).toBeInTheDocument()
  })
})
