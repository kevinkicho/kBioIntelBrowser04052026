import { render, screen } from '@testing-library/react'
import { TrialPhaseChart } from '@/components/charts/TrialPhaseChart'
import type { ClinicalTrial } from '@/lib/types'

// Mock recharts components as simple divs with data-testid
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Cell: () => <div data-testid="cell" />,
}))

const mockTrials: ClinicalTrial[] = [
  {
    nctId: 'NCT00000001',
    title: 'Trial A',
    phase: 'Phase 1',
    status: 'COMPLETED',
    sponsor: 'Sponsor A',
    startDate: '2020-01-01',
    completionDate: '2021-01-01',
    conditions: ['Condition A'],
    interventions: ['Drug A', 'Placebo'],
  },
  {
    nctId: 'NCT00000002',
    title: 'Trial B',
    phase: 'PHASE2',
    status: 'RECRUITING',
    sponsor: 'Sponsor B',
    startDate: '2021-01-01',
    completionDate: '2022-01-01',
    conditions: ['Condition B'],
    interventions: ['Drug B'],
  },
  {
    nctId: 'NCT00000003',
    title: 'Trial C',
    phase: 'phase 3',
    status: 'ACTIVE',
    sponsor: 'Sponsor C',
    startDate: '2022-01-01',
    completionDate: '2023-01-01',
    conditions: ['Condition C'],
    interventions: ['Drug C'],
  },
]

describe('TrialPhaseChart', () => {
  test('renders empty state message when no trials provided', () => {
    render(<TrialPhaseChart trials={[]} />)
    expect(screen.getByText('No clinical trial data loaded')).toBeInTheDocument()
  })

  test('renders chart when trials are provided', () => {
    render(<TrialPhaseChart trials={mockTrials} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  test('renders bar-chart testid present', () => {
    render(<TrialPhaseChart trials={mockTrials} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})
