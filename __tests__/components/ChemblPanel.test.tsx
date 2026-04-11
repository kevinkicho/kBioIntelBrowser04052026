import { render, screen } from '@testing-library/react'
import { ChemblPanel } from '@/components/profile/ChemblPanel'
import type { ChemblActivity } from '@/lib/types'

const mockActivities: ChemblActivity[] = [
  {
    activityId: 'ACT001',
    targetName: 'Cyclooxygenase-2',
    targetOrganism: 'Homo sapiens',
    targetChemblId: 'CHEMBL2094253',
    chemblId: 'CHEMBL25',
    assayType: 'B',
    standardType: 'IC50',
    standardValue: 40,
    standardUnits: 'nM',
    pchemblValue: 7.4,
    activityType: 'IC50',
    activityValue: 0.04,
    activityUnits: 'uM',
    url: 'https://www.ebi.ac.uk/chembl/ACT001',
  },
]

describe('ChemblPanel', () => {
  test('renders target name', () => {
    render(<ChemblPanel activities={mockActivities} />)
    expect(screen.getByText('Cyclooxygenase-2')).toBeInTheDocument()
  })

  test('renders activity type', () => {
    render(<ChemblPanel activities={mockActivities} />)
    expect(screen.getByText('IC50')).toBeInTheDocument()
  })

  test('renders activity value with units', () => {
    render(<ChemblPanel activities={mockActivities} />)
    expect(screen.getByText(/0\.04/)).toBeInTheDocument()
    expect(screen.getByText(/uM/)).toBeInTheDocument()
  })

  test('renders empty state when no activities', () => {
    render(<ChemblPanel activities={[]} />)
    expect(screen.getByText(/no bioactivity data found/i)).toBeInTheDocument()
  })
})
