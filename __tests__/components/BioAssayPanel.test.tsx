import { render, screen } from '@testing-library/react'
import { BioAssayPanel } from '@/components/profile/BioAssayPanel'
import type { BioAssayResult } from '@/lib/types'

const mockAssays: BioAssayResult[] = [
  {
    assayId: '12345',
    assayName: 'Cytotoxicity assay',
    description: 'Cell viability assay',
    type: 'Confirmatory',
    outcome: 'Active',
    activeCompounds: 15,
    testedCompounds: 100,
    activityValue: 5.2,
    targetName: 'EGFR',
    url: 'https://pubchem.ncbi.nlm.nih.gov/bioassay/12345',
  },
  {
    assayId: '67890',
    assayName: 'Binding assay',
    description: 'Protein binding assay',
    type: 'Screening',
    outcome: 'Inactive',
    activeCompounds: 0,
    testedCompounds: 50,
    activityValue: 0,
    targetName: 'TP53',
    url: 'https://pubchem.ncbi.nlm.nih.gov/bioassay/67890',
  },
]

describe('BioAssayPanel', () => {
  test('renders outcome badge', () => {
    render(<BioAssayPanel assays={mockAssays} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  test('renders assay name', () => {
    render(<BioAssayPanel assays={mockAssays} />)
    expect(screen.getByText('Cytotoxicity assay')).toBeInTheDocument()
  })

  test('renders target name', () => {
    render(<BioAssayPanel assays={mockAssays} />)
    expect(screen.getByText('Target: EGFR')).toBeInTheDocument()
  })

  test('renders activity value when greater than 0', () => {
    render(<BioAssayPanel assays={mockAssays} />)
    expect(screen.getByText('Activity: 5.2')).toBeInTheDocument()
  })

  test('renders PubChem link for each assay', () => {
    render(<BioAssayPanel assays={mockAssays} />)
    const links = screen.getAllByRole('link', { name: /pubchem →/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://pubchem.ncbi.nlm.nih.gov/bioassay/12345')
  })

  test('renders empty state when assays array is empty', () => {
    render(<BioAssayPanel assays={[]} />)
    expect(screen.getByText(/no bioassay data found/i)).toBeInTheDocument()
  })
})
