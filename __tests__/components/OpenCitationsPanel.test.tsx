import { render, screen } from '@testing-library/react'
import { OpenCitationsPanel } from '@/components/profile/OpenCitationsPanel'
import type { CitationMetric } from '@/lib/types'

const mockMetrics: CitationMetric[] = [
  {
    doi: '10.1000/test-a',
    title: '',
    citationCount: 42,
    referenceCount: 2,
    citedBy: ['10.1000/ref1', '10.1000/ref2'],
    references: ['10.1000/src1', '10.1000/src2'],
    url: 'https://doi.org/10.1000/test-a',
    year: '2019',
    venue: 'Science',
  },
  {
    doi: '10.1000/test-b',
    title: 'A Paper Title',
    citationCount: 7,
    referenceCount: 1,
    citedBy: ['10.1000/ref3'],
    references: ['10.1000/src3'],
    url: 'https://doi.org/10.1000/test-b',
    authors: 'Doe, Jane',
    year: '2021',
    venue: 'Nature',
  },
]

describe('OpenCitationsPanel', () => {
  test('renders title when available', () => {
    render(<OpenCitationsPanel metrics={mockMetrics} />)
    expect(screen.getByText('A Paper Title')).toBeInTheDocument()
  })

  test('renders citation count prominently', () => {
    render(<OpenCitationsPanel metrics={mockMetrics} />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getAllByText(/Cited by/i).length).toBeGreaterThan(0)
  })

  test('renders venue / year bibliographic line', () => {
    render(<OpenCitationsPanel metrics={mockMetrics} />)
    expect(screen.getByText(/Nature/)).toBeInTheDocument()
    expect(screen.getByText(/2021/)).toBeInTheDocument()
  })

  test('renders DOI links', () => {
    render(<OpenCitationsPanel metrics={mockMetrics} />)
    const links = screen.getAllByRole('link', { name: /doi/i })
    expect(links.length).toBeGreaterThanOrEqual(2)
  })

  test('renders summary strip', () => {
    render(<OpenCitationsPanel metrics={mockMetrics} />)
    expect(screen.getByText(/Papers with OC cites/i)).toBeInTheDocument()
  })

  test('renders empty state when metrics array is empty', () => {
    render(<OpenCitationsPanel metrics={[]} />)
    expect(screen.getByText(/No DOIs available from literature/i)).toBeInTheDocument()
  })
})
