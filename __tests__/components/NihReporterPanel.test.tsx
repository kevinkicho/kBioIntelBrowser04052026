import { render, screen } from '@testing-library/react'
import { NihReporterPanel } from '@/components/profile/NihReporterPanel'
import type { NihGrant } from '@/lib/types'

const mockGrants: NihGrant[] = [
  {
    projectId: '12345678',
    projectNumber: 'R01DK099039',
    title: 'GLP-1 Mechanisms in Beta Cell Function',
    abstract: 'This project investigates GLP-1 mechanisms in beta cell function.',
    piName: 'SMITH, JANE',
    institute: 'National Institute of Diabetes',
    fundingIcg: 'NIDDK',
    fundingMechanism: 'R01',
    programOfficer: 'John Doe',
    startDate: '2020-09-01',
    endDate: '2025-08-31',
    fundingAmount: 450000,
    totalCost: 2250000,
  },
]

describe('NihReporterPanel', () => {
  test('renders grant title', () => {
    render(<NihReporterPanel grants={mockGrants} />)
    expect(screen.getByText('GLP-1 Mechanisms in Beta Cell Function')).toBeInTheDocument()
  })

  test('renders project number', () => {
    render(<NihReporterPanel grants={mockGrants} />)
    expect(screen.getByText('R01DK099039')).toBeInTheDocument()
  })

  test('renders PI name', () => {
    render(<NihReporterPanel grants={mockGrants} />)
    expect(screen.getByText(/SMITH, JANE/i)).toBeInTheDocument()
  })

  test('renders funding amount', () => {
    render(<NihReporterPanel grants={mockGrants} />)
    expect(screen.getByText(/450,?000/)).toBeInTheDocument()
  })

  test('renders empty state when no grants', () => {
    render(<NihReporterPanel grants={[]} />)
    expect(screen.getByText(/no nih grants found/i)).toBeInTheDocument()
  })
})
