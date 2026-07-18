import { render, screen } from '@testing-library/react'
import { ChemblMechanismsPanel } from '@/components/profile/ChemblMechanismsPanel'
import type { ChemblMechanism } from '@/lib/types'

const mockMechanisms: ChemblMechanism[] = [
  {
    mechanismId: 'MEC001',
    moleculeName: 'Aspirin',
    targetName: 'Cyclooxygenase-2',
    targetChemblId: 'CHEMBL2094253',
    actionType: 'INHIBITOR',
    mechanismOfAction: 'Cyclooxygenase inhibitor',
    directInteraction: true,
    diseaseEfficacy: true,
    maxPhase: 4,
    url: 'https://www.ebi.ac.uk/chembl/target_report_card/CHEMBL2094253/',
  },
]

describe('ChemblMechanismsPanel', () => {
  test('renders mechanism of action', () => {
    render(<ChemblMechanismsPanel mechanisms={mockMechanisms} />)
    expect(screen.getByText('Cyclooxygenase inhibitor')).toBeInTheDocument()
  })

  test('renders action type badge', () => {
    render(<ChemblMechanismsPanel mechanisms={mockMechanisms} />)
    expect(screen.getByText('INHIBITOR')).toBeInTheDocument()
  })

  test('renders max phase in table', () => {
    render(<ChemblMechanismsPanel mechanisms={mockMechanisms} />)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Phase')).toBeInTheDocument()
  })

  test('row deep-links to ChEMBL', () => {
    render(<ChemblMechanismsPanel mechanisms={mockMechanisms} />)
    const link = screen.getByRole('link', { name: /Cyclooxygenase inhibitor/i })
    expect(link.getAttribute('href')).toMatch(/chembl/)
  })

  test('renders empty state when no mechanisms', () => {
    render(<ChemblMechanismsPanel mechanisms={[]} />)
    expect(screen.getByText(/no mechanism of action data found/i)).toBeInTheDocument()
  })
})
