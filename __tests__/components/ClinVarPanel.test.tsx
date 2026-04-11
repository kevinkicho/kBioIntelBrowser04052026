import { render, screen } from '@testing-library/react'
import { ClinVarPanel } from '@/components/profile/ClinVarPanel'
import type { ClinVarVariant } from '@/lib/types'

const mockVariants: ClinVarVariant[] = [
  {
    variantId: '12345',
    clinicalSignificance: 'Pathogenic',
    condition: 'Androgen insensitivity syndrome',
    gene: 'AR',
    title: 'NM_000044.6(AR):c.2596G>A (p.Val866Met)',
    variantType: 'single nucleotide variant',
    chromosome: 'X',
    position: 67544202,
    reviewStatus: 'criteria provided, single submitter',
    url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/12345/',
  },
  {
    variantId: '67890',
    clinicalSignificance: 'Drug response',
    condition: 'Cystic fibrosis',
    gene: 'CFTR',
    title: 'NM_000492.4(CFTR):c.1521_1523del (p.Phe508del)',
    variantType: 'deletion',
    chromosome: '7',
    position: 117559592,
    reviewStatus: 'criteria provided, multiple submitters, no conflicts',
    url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/67890/',
  },
]

describe('ClinVarPanel', () => {
  test('renders clinical significance badges', () => {
    render(<ClinVarPanel variants={mockVariants} />)
    expect(screen.getByText(/Pathogenic/)).toBeInTheDocument()
    expect(screen.getByText(/Drug response/)).toBeInTheDocument()
  })

  test('renders gene symbols', () => {
    render(<ClinVarPanel variants={mockVariants} />)
    const geneSymbols = screen.getAllByText(/AR|CFTR/)
    expect(geneSymbols.length).toBeGreaterThanOrEqual(2)
  })

  test('renders conditions', () => {
    render(<ClinVarPanel variants={mockVariants} />)
    expect(screen.getByText(/Androgen insensitivity syndrome/)).toBeInTheDocument()
    expect(screen.getByText(/Cystic fibrosis/)).toBeInTheDocument()
  })

  test('renders links to ClinVar', () => {
    render(<ClinVarPanel variants={mockVariants} />)
    const links = screen.getAllByRole('link', { name: /view in clinvar/i })
    expect(links[0]).toHaveAttribute('href', 'https://www.ncbi.nlm.nih.gov/clinvar/variation/12345/')
  })

  test('renders empty state when no variants', () => {
    render(<ClinVarPanel variants={[]} />)
    expect(screen.getByText(/no clinvar variants found/i)).toBeInTheDocument()
  })
})
