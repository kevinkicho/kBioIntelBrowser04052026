import { render, screen } from '@testing-library/react'
import { OpenAlexPanel } from '@/components/profile/OpenAlexPanel'
import type { OpenAlexWork } from '@/lib/types'

const mockWorks: OpenAlexWork[] = [
  {
    workId: 'W123',
    title: 'Effects of Aspirin on Inflammation',
    authors: ['Smith J', 'Doe A'],
    publicationDate: '2023-01-15',
    year: 2023,
    type: 'article',
    journal: 'Nature Medicine',
    citationCount: 42,
    doi: '10.1234/test',
    openAccessUrl: 'https://example.com/paper.pdf',
    url: 'https://doi.org/10.1234/test',
  },
  {
    workId: 'W456',
    title: 'Aspirin Review',
    authors: ['Johnson B'],
    publicationDate: '2022-06-01',
    year: 2022,
    type: 'review',
    journal: 'Annual Review of Medicine',
    citationCount: 15,
    doi: '10.1234/test2',
    openAccessUrl: '',
    url: 'https://doi.org/10.1234/test2',
  },
]

describe('OpenAlexPanel', () => {
  test('renders work title', () => {
    render(<OpenAlexPanel works={mockWorks} />)
    expect(screen.getByText('Effects of Aspirin on Inflammation')).toBeInTheDocument()
  })

  test('renders year badge', () => {
    render(<OpenAlexPanel works={mockWorks} />)
    expect(screen.getByText('2023')).toBeInTheDocument()
  })

  test('renders type badge', () => {
    render(<OpenAlexPanel works={mockWorks} />)
    expect(screen.getByText('article')).toBeInTheDocument()
  })

  test('renders Open Access badge when URL available', () => {
    render(<OpenAlexPanel works={mockWorks} />)
    expect(screen.getByText('Open Access')).toBeInTheDocument()
  })

  test('renders citation count', () => {
    render(<OpenAlexPanel works={mockWorks} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  test('renders view work link', () => {
    render(<OpenAlexPanel works={mockWorks} />)
    const links = screen.getAllByRole('link', { name: /view work/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://doi.org/10.1234/test')
  })

  test('renders empty state when works array is empty', () => {
    render(<OpenAlexPanel works={[]} />)
    expect(screen.getByText(/no openalex works found/i)).toBeInTheDocument()
  })
})
