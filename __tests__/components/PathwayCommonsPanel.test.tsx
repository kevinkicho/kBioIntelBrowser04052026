import { render, screen } from '@testing-library/react'
import { PathwayCommonsPanel } from '@/components/profile/PathwayCommonsPanel'
import type { PathwayCommonsResult } from '@/lib/types'

const mockResults: PathwayCommonsResult[] = [
  {
    pathwayId: 'R-HSA-123',
    pathwayName: 'Aspirin Metabolism',
    source: 'Reactome',
    interactions: 15,
    participants: ['ACE', 'AGT', 'REN'],
    dataSource: 'Reactome',
    name: 'Aspirin Metabolism',
    numParticipants: 15,
    url: 'https://reactome.org/content/detail/R-HSA-123',
  },
  {
    pathwayId: 'PATH456',
    pathwayName: 'COX Inhibition Pathway',
    source: 'KEGG',
    interactions: 8,
    participants: ['PTGS1', 'PTGS2'],
    dataSource: 'KEGG',
    name: 'COX Inhibition Pathway',
    numParticipants: 8,
    url: 'https://example.org/pathway/456',
  },
]

describe('PathwayCommonsPanel', () => {
  test('renders pathway name', () => {
    render(<PathwayCommonsPanel results={mockResults} />)
    expect(screen.getByText('Aspirin Metabolism')).toBeInTheDocument()
  })

  test('renders data source badge', () => {
    render(<PathwayCommonsPanel results={mockResults} />)
    expect(screen.getByText('Reactome')).toBeInTheDocument()
  })

  test('renders participant count', () => {
    render(<PathwayCommonsPanel results={mockResults} />)
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  test('renders view pathway link', () => {
    render(<PathwayCommonsPanel results={mockResults} />)
    const links = screen.getAllByRole('link', { name: /view pathway/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://reactome.org/content/detail/R-HSA-123')
  })

  test('renders empty state when results array is empty', () => {
    render(<PathwayCommonsPanel results={[]} />)
    expect(screen.getByText(/no pathway commons data found/i)).toBeInTheDocument()
  })
})
