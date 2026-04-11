import { render, screen } from '@testing-library/react'
import { OpenCitationsPanel } from '@/components/profile/OpenCitationsPanel'
import type { CitationMetric } from '@/lib/types'

const mockMetrics: CitationMetric[] = [
  {
    doi: '10.1000/test-a',
    title: '',
    citationCount: 42,
    citedBy: ['10.1000/ref1', '10.1000/ref2'],
    references: ['10.1000/src1', '10.1000/src2'],
    url: 'https://doi.org/10.1000/test-a',
  },
  {
    doi: '10.1000/test-b',
    title: 'A Paper Title',
    citationCount: 7,
    citedBy: ['10.1000/ref3'],
    references: ['10.1000/src3'],
    url: 'https://doi.org/10.1000/test-b',
  },
]

describe('OpenCitationsPanel', () => {
  test('renders DOI badge', () => {
    render(<OpenCitationsPanel metrics={mockMetrics} />)
    expect(screen.getByText('10.1000/test-a')).toBeInTheDocument()
  })

  test('renders citation count prominently', () => {
    render(<OpenCitationsPanel metrics={mockMetrics} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  test('renders title when available', () => {
    render(<OpenCitationsPanel metrics={mockMetrics} />)
    expect(screen.getByText('A Paper Title')).toBeInTheDocument()
  })

  test('renders DOI link', () => {
    render(<OpenCitationsPanel metrics={mockMetrics} />)
    const links = screen.getAllByRole('link', { name: /doi/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://doi.org/10.1000/test-a')
  })

  test('renders empty state when metrics array is empty', () => {
    render(<OpenCitationsPanel metrics={[]} />)
    expect(screen.getByText(/no citation metric data found/i)).toBeInTheDocument()
  })
})
