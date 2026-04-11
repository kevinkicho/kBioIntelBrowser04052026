import { render, screen } from '@testing-library/react'
import { SemanticScholarPanel } from '@/components/profile/SemanticScholarPanel'
import type { SemanticPaper } from '@/lib/types'

const mockPapers: SemanticPaper[] = [
  {
    paperId: 'abc123',
    title: 'Effects of Aspirin on Inflammation',
    authors: ['Smith J', 'Doe A'],
    publicationDate: '2023-01-15',
    year: 2023,
    journal: 'Nature Medicine',
    citationCount: 42,
    influentialCitationCount: 10,
    doi: '10.1234/test',
    tldr: 'Aspirin reduces inflammation through COX inhibition.',
    url: 'https://semanticscholar.org/paper/abc123',
  },
  {
    paperId: 'def456',
    title: 'Aspirin Dosing Study',
    authors: ['Johnson B'],
    publicationDate: '2022-06-01',
    year: 2022,
    journal: 'JAMA',
    citationCount: 15,
    influentialCitationCount: 5,
    doi: '10.1234/test2',
    tldr: '',
    url: 'https://semanticscholar.org/paper/def456',
  },
]

describe('SemanticScholarPanel', () => {
  test('renders paper title', () => {
    render(<SemanticScholarPanel papers={mockPapers} />)
    expect(screen.getByText('Effects of Aspirin on Inflammation')).toBeInTheDocument()
  })

  test('renders year badge', () => {
    render(<SemanticScholarPanel papers={mockPapers} />)
    expect(screen.getByText('2023')).toBeInTheDocument()
  })

  test('renders TLDR text when available', () => {
    render(<SemanticScholarPanel papers={mockPapers} />)
    expect(screen.getByText('Aspirin reduces inflammation through COX inhibition.')).toBeInTheDocument()
  })

  test('renders citation count', () => {
    render(<SemanticScholarPanel papers={mockPapers} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  test('renders view paper link', () => {
    render(<SemanticScholarPanel papers={mockPapers} />)
    const links = screen.getAllByRole('link', { name: /view paper/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://semanticscholar.org/paper/abc123')
  })

  test('renders empty state when papers array is empty', () => {
    render(<SemanticScholarPanel papers={[]} />)
    expect(screen.getByText(/no semantic scholar papers found/i)).toBeInTheDocument()
  })
})
