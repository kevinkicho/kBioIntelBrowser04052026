import { render, screen } from '@testing-library/react'
import { ChemblIndicationsPanel } from '@/components/profile/ChemblIndicationsPanel'
import type { ChemblIndication } from '@/lib/types'

const mockIndications: ChemblIndication[] = [
  {
    indicationId: 'IND001',
    moleculeName: 'Aspirin',
    moleculeChemblId: 'CHEMBL25',
    condition: 'Pain',
    maxPhase: 4,
    maxPhaseForIndication: 4,
    meshId: 'D010146',
    meshHeading: 'Pain',
    efoId: 'EFO_0003843',
    efoTerm: 'pain',
    // Legacy SPA hash that used to dump users on the ChEMBL homepage
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
    expect(screen.getByText('P4')).toBeInTheDocument()
  })

  test('renders MeSH ID', () => {
    render(<ChemblIndicationsPanel indications={mockIndications} />)
    expect(screen.getByText('D010146')).toBeInTheDocument()
  })

  test('list item deep-links to ChEMBL drug indications (not homepage)', () => {
    render(<ChemblIndicationsPanel indications={mockIndications} />)
    const nameLink = screen.getByRole('link', { name: /Pain/i })
    expect(nameLink).toHaveAttribute(
      'href',
      'https://www.ebi.ac.uk/chembl/embed/report_cards/compound/sections/drug_indications/CHEMBL25',
    )
    expect(nameLink.getAttribute('href')).not.toMatch(/\/g\/#/)
    expect(nameLink.getAttribute('href')).not.toMatch(/\/chembl\/?$/)
  })

  test('rebuilds deep link when stored url is bare ChEMBL homepage', () => {
    render(
      <ChemblIndicationsPanel
        indications={[
          {
            ...mockIndications[0],
            url: 'https://www.ebi.ac.uk/chembl/',
          },
        ]}
      />,
    )
    const nameLink = screen.getByRole('link', { name: /Pain/i })
    expect(nameLink).toHaveAttribute(
      'href',
      expect.stringContaining('drug_indications/CHEMBL25'),
    )
  })

  test('falls back to efoTerm when meshHeading is empty', () => {
    const indications: ChemblIndication[] = [{
      indicationId: 'IND002',
      moleculeName: 'TestDrug',
      moleculeChemblId: 'CHEMBL1',
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
