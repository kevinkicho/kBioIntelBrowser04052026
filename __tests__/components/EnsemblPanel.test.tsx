import { render, screen } from '@testing-library/react'
import { EnsemblPanel } from '@/components/profile/EnsemblPanel'
import type { EnsemblGene } from '@/lib/types'

const mockGenes: EnsemblGene[] = [
  {
    geneId: 'ENSG00000159640',
    symbol: 'ACE',
    name: 'angiotensin I converting enzyme',
    displayName: 'ACE',
    description: 'angiotensin I converting enzyme',
    biotype: 'protein_coding',
    chromosome: '17',
    start: 63477061,
    end: 63498380,
    strand: -1,
    url: 'https://ensembl.org/Homo_sapiens/Gene/Summary?g=ENSG00000159640',
  },
  {
    geneId: 'ENSG00000143839',
    symbol: 'REN',
    name: 'renin',
    displayName: 'REN',
    description: 'renin',
    biotype: 'protein_coding',
    chromosome: '1',
    start: 204124380,
    end: 204135519,
    strand: 1,
    url: 'https://ensembl.org/Homo_sapiens/Gene/Summary?g=ENSG00000143839',
  },
]

describe('EnsemblPanel', () => {
  test('renders gene symbol badge', () => {
    render(<EnsemblPanel genes={mockGenes} />)
    expect(screen.getByText('ACE')).toBeInTheDocument()
    expect(screen.getByText('REN')).toBeInTheDocument()
  })

  test('renders biotype tag', () => {
    render(<EnsemblPanel genes={mockGenes} />)
    const biotypeBadges = screen.getAllByText('protein_coding')
    expect(biotypeBadges).toHaveLength(2)
  })

  test('renders strand indicator with minus for negative strand', () => {
    render(<EnsemblPanel genes={mockGenes} />)
    expect(screen.getByText(/\(- strand\)/)).toBeInTheDocument()
  })

  test('renders strand indicator with plus for positive strand', () => {
    render(<EnsemblPanel genes={mockGenes} />)
    expect(screen.getByText(/\(\+ strand\)/)).toBeInTheDocument()
  })

  test('renders description text', () => {
    render(<EnsemblPanel genes={mockGenes} />)
    expect(screen.getByText('angiotensin I converting enzyme')).toBeInTheDocument()
  })

  test('renders Ensembl link for each gene', () => {
    render(<EnsemblPanel genes={mockGenes} />)
    const links = screen.getAllByRole('link', { name: /ensembl →/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://ensembl.org/Homo_sapiens/Gene/Summary?g=ENSG00000159640')
  })

  test('renders empty state when genes array is empty', () => {
    render(<EnsemblPanel genes={[]} />)
    expect(screen.getByText(/no ensembl gene data found/i)).toBeInTheDocument()
  })
})
