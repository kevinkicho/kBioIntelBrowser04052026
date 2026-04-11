import { render, screen } from '@testing-library/react'
import { DgidbPanel } from '@/components/profile/DgidbPanel'
import type { DrugGeneInteraction } from '@/lib/types'

const mockInteractions: DrugGeneInteraction[] = [
  { drugName: 'Aspirin', geneSymbol: 'PTGS2', geneName: 'PTGS2', interactionType: 'inhibitor', evidence: 'DrugBank, ChEMBL', source: 'DrugBank, ChEMBL', score: 8.5, url: 'https://dgidb.org/genes/PTGS2' },
  { drugName: 'Aspirin', geneSymbol: 'ACE', geneName: 'ACE', interactionType: 'antagonist', evidence: 'PharmGKB', source: 'PharmGKB', score: 0, url: 'https://dgidb.org/genes/ACE' },
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

  test('renders source info', () => {
    render(<DgidbPanel interactions={mockInteractions} />)
    expect(screen.getByText(/Sources: DrugBank, ChEMBL/)).toBeInTheDocument()
  })

  test('renders score when > 0', () => {
    render(<DgidbPanel interactions={mockInteractions} />)
    expect(screen.getByText(/Score: 8.5/)).toBeInTheDocument()
  })

  test('renders empty state', () => {
    render(<DgidbPanel interactions={[]} />)
    expect(screen.getByText(/no drug-gene interactions/i)).toBeInTheDocument()
  })
})
