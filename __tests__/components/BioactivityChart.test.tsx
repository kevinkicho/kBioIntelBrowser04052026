import { render, screen } from '@testing-library/react'
import { BioactivityChart } from '@/components/charts/BioactivityChart'
import type { ChemblActivity } from '@/lib/types'

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
}))

const mockActivities: ChemblActivity[] = [
  {
    activityId: 'ACT001',
    targetName: 'EGFR',
    targetOrganism: 'Homo sapiens',
    targetChemblId: 'CHEMBL203',
    chemblId: 'CHEMBL1',
    assayType: 'B',
    standardType: 'IC50',
    standardValue: 10,
    standardUnits: 'nM',
    pchemblValue: 8,
    activityType: 'IC50',
    activityValue: 10,
    activityUnits: 'nM',
    url: 'https://www.ebi.ac.uk/chembl/ACT001',
  },
  {
    activityId: 'ACT002',
    targetName: 'EGFR',
    targetOrganism: 'Homo sapiens',
    targetChemblId: 'CHEMBL203',
    chemblId: 'CHEMBL2',
    assayType: 'B',
    standardType: 'Ki',
    standardValue: 20,
    standardUnits: 'nM',
    pchemblValue: 7.7,
    activityType: 'Ki',
    activityValue: 20,
    activityUnits: 'nM',
    url: 'https://www.ebi.ac.uk/chembl/ACT002',
  },
  {
    activityId: 'ACT003',
    targetName: 'VEGFR2',
    targetOrganism: 'Homo sapiens',
    targetChemblId: 'CHEMBL2039',
    chemblId: 'CHEMBL3',
    assayType: 'B',
    standardType: 'IC50',
    standardValue: 5,
    standardUnits: 'nM',
    pchemblValue: 8.3,
    activityType: 'IC50',
    activityValue: 5,
    activityUnits: 'nM',
    url: 'https://www.ebi.ac.uk/chembl/ACT003',
  },
]

describe('BioactivityChart', () => {
  test('renders empty state message when no activities provided', () => {
    render(<BioactivityChart activities={[]} />)
    expect(screen.getByText('No bioactivity data loaded')).toBeInTheDocument()
  })

  test('renders chart when activities are provided', () => {
    render(<BioactivityChart activities={mockActivities} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})
