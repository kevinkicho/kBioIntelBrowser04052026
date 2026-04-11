import { render, screen } from '@testing-library/react'
import { GwasCatalogPanel } from '@/components/profile/GwasCatalogPanel'
import type { GwasAssociation } from '@/lib/types'

const mockAssociations: GwasAssociation[] = [
  {
    studyId: 'GCST001234',
    traitName: 'Type 2 Diabetes',
    geneSymbol: 'TCF7L2',
    pValue: 1.5e-8,
    riskAllele: 'rs123-A',
    pubmedId: '12345678',
    region: '6p21',
    url: 'https://www.ebi.ac.uk/gwas/search?query=diabetes',
  },
  {
    studyId: 'GCST005678',
    traitName: 'Coronary Heart Disease',
    geneSymbol: 'LPA',
    pValue: 0,
    riskAllele: '',
    pubmedId: '87654321',
    region: '',
    url: 'https://www.ebi.ac.uk/gwas/search?query=heart',
  },
]

describe('GwasCatalogPanel', () => {
  test('renders trait name', () => {
    render(<GwasCatalogPanel associations={mockAssociations} />)
    expect(screen.getByText('Type 2 Diabetes')).toBeInTheDocument()
  })

  test('renders risk allele badge', () => {
    render(<GwasCatalogPanel associations={mockAssociations} />)
    expect(screen.getByText('rs123-A')).toBeInTheDocument()
  })

  test('renders region', () => {
    render(<GwasCatalogPanel associations={mockAssociations} />)
    expect(screen.getByText(/6p21/)).toBeInTheDocument()
  })

  test('renders p-value in scientific notation', () => {
    render(<GwasCatalogPanel associations={mockAssociations} />)
    expect(screen.getByText('1.50e-8')).toBeInTheDocument()
  })

  test('renders N/A for zero p-value', () => {
    render(<GwasCatalogPanel associations={mockAssociations} />)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  test('renders view study link', () => {
    render(<GwasCatalogPanel associations={mockAssociations} />)
    const links = screen.getAllByRole('link', { name: /view study/i })
    expect(links).toHaveLength(2)
  })

  test('renders empty state when associations array is empty', () => {
    render(<GwasCatalogPanel associations={[]} />)
    expect(screen.getByText(/no gwas associations found/i)).toBeInTheDocument()
  })
})
