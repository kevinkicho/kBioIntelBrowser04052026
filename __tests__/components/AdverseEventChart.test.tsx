import { render, screen } from '@testing-library/react'
import { AdverseEventChart } from '@/components/charts/AdverseEventChart'
import type { AdverseEvent } from '@/lib/types'

// Mock recharts components as simple divs with data-testid
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}))

const mockEvents: AdverseEvent[] = [
  { id: '1', drugName: 'Aspirin', reactionName: 'Nausea', reaction: 'Nausea', count: 50, serious: 10, outcome: 'recovered', reportDate: '2024-01-15' },
  { id: '2', drugName: 'Aspirin', reactionName: 'Headache', reaction: 'Headache', count: 30, serious: 5, outcome: 'recovered', reportDate: '2024-01-16' },
  { id: '3', drugName: 'Aspirin', reactionName: 'Rash', reaction: 'Rash', count: 20, serious: 15, outcome: 'not recovered', reportDate: '2024-01-17' },
]

describe('AdverseEventChart', () => {
  test('renders empty state message when no events provided', () => {
    render(<AdverseEventChart events={[]} />)
    expect(screen.getByText('No adverse event data loaded')).toBeInTheDocument()
  })

  test('renders chart when events are provided', () => {
    render(<AdverseEventChart events={mockEvents} />)
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  test('displays total count in center overlay', () => {
    render(<AdverseEventChart events={mockEvents} />)
    // total count = 50 + 30 + 20 = 100
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('total')).toBeInTheDocument()
  })
})
