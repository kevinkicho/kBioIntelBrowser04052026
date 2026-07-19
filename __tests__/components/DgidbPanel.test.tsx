import { render, screen } from '@testing-library/react'
import { DgidbPanel } from '@/components/profile/DgidbPanel'
import type { DrugGeneInteraction } from '@/lib/types'

const mockInteractions: DrugGeneInteraction[] = [
  { drugName: 'Aspirin', geneSymbol: 'PTGS2', geneName: 'PTGS2', interactionType: 'inhibitor', evidence: 'DrugBank, ChEMBL', source: 'DrugBank, ChEMBL', score: 8.5, url: 'https://www.dgidb.org/genes/hgnc:9605' },
  { drugName: 'Aspirin', geneSymbol: 'ACE', geneName: 'ACE', interactionType: 'antagonist', evidence: 'PharmGKB', source: 'PharmGKB', score: 0, url: 'https://www.dgidb.org/genes/hgnc:2707' },
]

describe('DgidbPanel', () => {
  test('renders gene name badges', () => {
    render(<DgidbPanel interactions={mockInteractions} />)
    expect(screen.getByText('PTGS2')).toBeInTheDocument()
    expect(screen.getByText('ACE')).toBeInTheDocument()
  })

  test('renders interaction type badges', () => {
    render(<DgidbPanel interactions={mockInteractions} />)
    expect(screen.getByText('inhibitor')).toBeInTheDocument()
    expect(screen.getByText('antagonist')).toBeInTheDocument()
  })

  test('renders table columns and source info', () => {
    render(<DgidbPanel interactions={mockInteractions} />)
    expect(screen.getByText('Gene')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText(/DrugBank, ChEMBL/)).toBeInTheDocument()
  })

  test('renders score when > 0', () => {
    render(<DgidbPanel interactions={mockInteractions} />)
    expect(screen.getByText('8.5')).toBeInTheDocument()
  })

  test('row is a DGIdb deep link (no Open column)', () => {
    render(<DgidbPanel interactions={mockInteractions} />)
    expect(screen.queryByText('Open')).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: /PTGS2/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('dgidb.org'))
  })

  test('renders empty state', () => {
    render(<DgidbPanel interactions={[]} />)
    expect(screen.getByText(/no drug-gene interactions/i)).toBeInTheDocument()
  })
})
