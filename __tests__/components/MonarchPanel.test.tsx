import { render, screen } from '@testing-library/react'
import { MonarchPanel } from '@/components/profile/MonarchPanel'
import type { MonarchDisease } from '@/lib/types'

const mockDiseases: MonarchDisease[] = [
  {
    diseaseId: 'MONDO:0011993',
    diseaseName: 'type 2 diabetes mellitus',
    id: 'MONDO:0011993',
    name: 'type 2 diabetes mellitus',
    geneSymbol: 'TCF7L2',
    evidence: 'GWAS',
    source: 'Monarch',
    description: 'A form of diabetes that is characterized by insulin resistance and relative insulin deficiency.',
    phenotypeCount: 42,
    url: 'https://monarchinitiative.org/MONDO:0011993',
  },
  {
    diseaseId: 'MONDO:0005015',
    diseaseName: 'diabetes mellitus',
    id: 'MONDO:0005015',
    name: 'diabetes mellitus',
    geneSymbol: 'PPARG',
    evidence: 'ClinVar',
    source: 'Monarch',
    description: '',
    phenotypeCount: 0,
    url: 'https://monarchinitiative.org/MONDO:0005015',
  },
]

describe('MonarchPanel', () => {
  test('renders disease ID badge', () => {
    render(<MonarchPanel diseases={mockDiseases} />)
    expect(screen.getByText('MONDO:0011993')).toBeInTheDocument()
  })

  test('renders disease name', () => {
    render(<MonarchPanel diseases={mockDiseases} />)
    expect(screen.getByText('type 2 diabetes mellitus')).toBeInTheDocument()
  })

  test('renders internal disease page links', () => {
    render(<MonarchPanel diseases={mockDiseases} />)
    const links = screen.getAllByRole('link', { name: 'type 2 diabetes mellitus' })
    expect(links[0]).toHaveAttribute('href', '/disease?q=type%202%20diabetes%20mellitus')
  })

  test('renders external Monarch links', () => {
    render(<MonarchPanel diseases={mockDiseases} />)
    const externalLinks = screen.getAllByTitle('View on Monarch')
    expect(externalLinks[0]).toHaveAttribute('href', 'https://monarchinitiative.org/MONDO:0011993')
  })

  test('renders description', () => {
    render(<MonarchPanel diseases={mockDiseases} />)
    expect(screen.getByText(/characterized by insulin resistance/)).toBeInTheDocument()
  })

  test('renders phenotype count when > 0', () => {
    render(<MonarchPanel diseases={mockDiseases} />)
    expect(screen.getByText('Phenotypes: 42')).toBeInTheDocument()
  })

  test('renders link to Monarch', () => {
    render(<MonarchPanel diseases={mockDiseases} />)
    const links = screen.getAllByRole('link', { name: /view on monarch/i })
    expect(links[0].getAttribute('href')).toBe('https://monarchinitiative.org/MONDO:0011993')
  })

  test('renders empty state', () => {
    render(<MonarchPanel diseases={[]} />)
    expect(screen.getByText(/no monarch disease associations found/i)).toBeInTheDocument()
  })
})
