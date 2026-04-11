import { render, screen } from '@testing-library/react'
import { ChemblIndicationsPanel } from '@/components/profile/ChemblIndicationsPanel'
import type { ChemblIndication } from '@/lib/types'

const mockIndications: ChemblIndication[] = [
  {
    indicationId: 'IND001',
    moleculeName: 'Aspirin',
    condition: 'Pain',
    maxPhase: 4,
    maxPhaseForIndication: 4,
    meshId: 'D010146',
    meshHeading: 'Pain',
    efoId: 'EFO_0003843',
    efoTerm: 'pain',
    url: 'https://www.ebi.ac.uk/chembl/g/#browse/drug_indications/filter/molecule_chembl_id:CHEMBL25',
  },
]

describe('ChemblIndicationsPanel', () => {
  test('renders indication name', () => {
    render(<ChemblIndicationsPanel indications={mockIndications} />)
    expect(screen.getByText('Pain')).toBeInTheDocument()
  })

  test('renders phase badge', () => {
    render(<ChemblIndicationsPanel indications={mockIndications} />)
    expect(screen.getByText('Phase 4')).toBeInTheDocument()
  })

  test('renders MeSH ID', () => {
    render(<ChemblIndicationsPanel indications={mockIndications} />)
    expect(screen.getByText('D010146')).toBeInTheDocument()
  })

  test('falls back to efoTerm when meshHeading is empty', () => {
    const indications: ChemblIndication[] = [{
      indicationId: 'IND002',
      moleculeName: 'TestDrug',
      condition: 'hypertension',
      maxPhase: 3,
      maxPhaseForIndication: 3,
      meshHeading: '',
      meshId: '',
      efoTerm: 'hypertension',
      efoId: 'EFO_0000537',
      url: 'https://example.com',
    }]
    render(<ChemblIndicationsPanel indications={indications} />)
    expect(screen.getByText('hypertension')).toBeInTheDocument()
    expect(screen.getByText('EFO_0000537')).toBeInTheDocument()
  })

  test('renders empty state when no indications', () => {
    render(<ChemblIndicationsPanel indications={[]} />)
    expect(screen.getByText(/no drug indication data found/i)).toBeInTheDocument()
  })
})
