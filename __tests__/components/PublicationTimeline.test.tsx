import { render, screen } from '@testing-library/react'
import { PublicationTimeline } from '@/components/charts/PublicationTimeline'
import type { LiteratureResult } from '@/lib/types'

// Mock recharts components as simple divs with data-testid
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}))

const mockResults: LiteratureResult[] = [
  {
    id: 'PMID11111111',
    title: 'Paper A',
    authors: ['Author A'],
    journal: 'Journal A',
    publicationDate: '2020-01-15',
    year: 2020,
    doi: '10.1000/a',
    pmid: '11111111',
    abstract: 'Abstract A',
    citedByCount: 5,
  },
  {
    id: 'PMID22222222',
    title: 'Paper B',
    authors: ['Author B'],
    journal: 'Journal B',
    publicationDate: '2021-03-20',
    year: 2021,
    doi: '10.1000/b',
    pmid: '22222222',
    abstract: 'Abstract B',
    citedByCount: 10,
  },
  {
    id: 'PMID33333333',
    title: 'Paper C',
    authors: ['Author C'],
    journal: 'Journal C',
    publicationDate: '2021-06-10',
    year: 2021,
    doi: '10.1000/c',
    pmid: '33333333',
    abstract: 'Abstract C',
    citedByCount: 3,
  },
]

describe('PublicationTimeline', () => {
  test('renders empty state message when no results provided', () => {
    render(<PublicationTimeline results={[]} />)
    expect(screen.getByText('No publication data loaded')).toBeInTheDocument()
  })

  test('renders chart when results are provided', () => {
    render(<PublicationTimeline results={mockResults} />)
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })
})
