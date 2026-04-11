import { render, screen } from '@testing-library/react'
import { MeshPanel } from '@/components/profile/MeshPanel'
import type { MeshTerm } from '@/lib/types'

const mockTerms: MeshTerm[] = [
  {
    meshId: 'D001241',
    termName: 'Aspirin',
    name: 'Aspirin',
    definition: 'A non-steroidal anti-inflammatory agent with analgesic and antipyretic properties.',
    scopeNote: 'A non-steroidal anti-inflammatory agent with analgesic and antipyretic properties.',
    treeNumbers: ['D02.065.199'],
    relatedTerms: ['Acetylsalicylic acid'],
    url: 'https://meshb.nlm.nih.gov/record/ui?ui=D001241',
  },
  {
    meshId: 'D002244',
    termName: 'Carbon Monoxide',
    name: 'Carbon Monoxide',
    definition: 'A colorless, odorless gas.',
    scopeNote: '',
    treeNumbers: [],
    relatedTerms: [],
    url: 'https://meshb.nlm.nih.gov/record/ui?ui=D002244',
  },
]

describe('MeshPanel', () => {
  test('renders term name', () => {
    render(<MeshPanel terms={mockTerms} />)
    expect(screen.getByText('Aspirin')).toBeInTheDocument()
  })

  test('renders scope note text', () => {
    render(<MeshPanel terms={mockTerms} />)
    expect(screen.getByText('A non-steroidal anti-inflammatory agent with analgesic and antipyretic properties.')).toBeInTheDocument()
  })

  test('renders tree number badges when available', () => {
    render(<MeshPanel terms={mockTerms} />)
    expect(screen.getByText('D02.065.199')).toBeInTheDocument()
  })

  test('renders MeSH Browser link', () => {
    render(<MeshPanel terms={mockTerms} />)
    const links = screen.getAllByRole('link', { name: /mesh browser/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://meshb.nlm.nih.gov/record/ui?ui=D001241')
  })

  test('truncates scope note longer than 200 characters', () => {
    const longNote = 'A'.repeat(250)
    const termsWithLongNote: MeshTerm[] = [
      { meshId: 'D000001', termName: 'Test', name: 'Test', definition: longNote, scopeNote: longNote, treeNumbers: [], relatedTerms: [], url: 'https://example.com' },
    ]
    render(<MeshPanel terms={termsWithLongNote} />)
    expect(screen.getByText(`${'A'.repeat(200)}...`)).toBeInTheDocument()
  })

  test('renders empty state when terms array is empty', () => {
    render(<MeshPanel terms={[]} />)
    expect(screen.getByText(/no mesh term data found/i)).toBeInTheDocument()
  })
})
