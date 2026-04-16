import { render, screen } from '@testing-library/react'
import { LiteraturePanel } from '@/components/profile/LiteraturePanel'
import type { LiteratureResult } from '@/lib/types'

const mockResults: LiteratureResult[] = [
  {
    id: 'PMID33456789',
    title: 'Metformin and cancer risk reduction',
    authors: 'Smith J, Doe A, Johnson B',
    journal: 'Nature Reviews Drug Discovery',
    publicationDate: '2021-01-15',
    year: 2021,
    doi: '10.1038/nrd.2021.12',
    pmid: '33456789',
    abstract: 'A systematic review of metformin use and cancer risk.',
    citedByCount: 342,
  },
]

describe('LiteraturePanel', () => {
  test('renders paper title', () => {
    render(<LiteraturePanel results={mockResults} />)
    expect(screen.getByText(/Metformin and cancer risk reduction/)).toBeInTheDocument()
  })

  test('renders authors', () => {
    render(<LiteraturePanel results={mockResults} />)
    expect(screen.getByText(/Smith J/)).toBeInTheDocument()
    expect(screen.getByText(/Doe A/)).toBeInTheDocument()
  })

  test('renders journal and year', () => {
    render(<LiteraturePanel results={mockResults} />)
    expect(screen.getByText(/Nature Reviews Drug Discovery/)).toBeInTheDocument()
    expect(screen.getByText('2021')).toBeInTheDocument()
  })

  test('renders citation count', () => {
    render(<LiteraturePanel results={mockResults} />)
    expect(screen.getByText(/342/)).toBeInTheDocument()
  })

  test('renders DOI as link', () => {
    render(<LiteraturePanel results={mockResults} />)
    const link = screen.getByRole('link', { name: /10\.1038/ })
    expect(link).toHaveAttribute('href', 'https://doi.org/10.1038/nrd.2021.12')
  })

  test('renders empty state when no results', () => {
    render(<LiteraturePanel results={[]} />)
    expect(screen.getByText(/no publications found/i)).toBeInTheDocument()
  })
})
