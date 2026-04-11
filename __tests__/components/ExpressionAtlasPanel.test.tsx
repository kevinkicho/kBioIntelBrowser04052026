import { render, screen } from '@testing-library/react'
import { ExpressionAtlasPanel } from '@/components/profile/ExpressionAtlasPanel'
import type { GeneExpression } from '@/lib/types'

const mockExpressions: GeneExpression[] = [
  {
    geneSymbol: 'ACE',
    tissueName: 'liver',
    expressionLevel: 150.5,
    unit: 'TPM',
    condition: 'baseline',
    experimentType: 'RNASEQ_MRNA_BASELINE',
    experimentDescription: 'Baseline expression in tissues',
    species: 'Homo sapiens',
    url: 'https://www.ebi.ac.uk/gxa/experiments/E-MTAB-123',
  },
  {
    geneSymbol: 'ACE',
    tissueName: 'kidney',
    expressionLevel: 85.2,
    unit: 'TPM',
    condition: 'cancer',
    experimentType: 'RNASEQ_MRNA_DIFFERENTIAL',
    experimentDescription: 'Differential expression in cancer',
    species: 'Homo sapiens',
    url: 'https://www.ebi.ac.uk/gxa/experiments/E-MTAB-456',
  },
]

describe('ExpressionAtlasPanel', () => {
  test('renders experiment type badge', () => {
    render(<ExpressionAtlasPanel expressions={mockExpressions} />)
    expect(screen.getByText('RNASEQ_MRNA_BASELINE')).toBeInTheDocument()
    expect(screen.getByText('RNASEQ_MRNA_DIFFERENTIAL')).toBeInTheDocument()
  })

  test('renders experiment description', () => {
    render(<ExpressionAtlasPanel expressions={mockExpressions} />)
    expect(screen.getByText('Baseline expression in tissues')).toBeInTheDocument()
  })

  test('renders species', () => {
    render(<ExpressionAtlasPanel expressions={mockExpressions} />)
    const speciesTexts = screen.getAllByText('Homo sapiens')
    expect(speciesTexts.length).toBeGreaterThanOrEqual(1)
  })

  test('renders Expression Atlas link for each expression', () => {
    render(<ExpressionAtlasPanel expressions={mockExpressions} />)
    const links = screen.getAllByRole('link', { name: /expression atlas →/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://www.ebi.ac.uk/gxa/experiments/E-MTAB-123')
  })

  test('renders empty state when expressions array is empty', () => {
    render(<ExpressionAtlasPanel expressions={[]} />)
    expect(screen.getByText(/no gene expression data found/i)).toBeInTheDocument()
  })
})
