import { render, screen } from '@testing-library/react'
import { UniprotPanel } from '@/components/profile/UniprotPanel'
import type { UniprotEntry } from '@/lib/types'

const mockEntries: UniprotEntry[] = [
  {
    accession: 'P00734',
    proteinName: 'Prothrombin',
    geneName: 'F2',
    organism: 'Homo sapiens',
    functionSummary: 'Thrombin cleaves fibrinogen to form fibrin.',
  },
]

describe('UniprotPanel', () => {
  test('renders protein name', () => {
    render(<UniprotPanel entries={mockEntries} />)
    expect(screen.getByText('Prothrombin')).toBeInTheDocument()
  })

  test('renders gene name', () => {
    render(<UniprotPanel entries={mockEntries} />)
    expect(screen.getByText('F2')).toBeInTheDocument()
  })

  test('renders organism', () => {
    render(<UniprotPanel entries={mockEntries} />)
    expect(screen.getByText('Homo sapiens')).toBeInTheDocument()
  })

  test('renders accession as link', () => {
    render(<UniprotPanel entries={mockEntries} />)
    const link = screen.getByRole('link', { name: /P00734/ })
    expect(link).toHaveAttribute('href', 'https://www.uniprot.org/uniprotkb/P00734')
  })

  test('renders empty state when no entries', () => {
    render(<UniprotPanel entries={[]} />)
    expect(screen.getByText(/no protein\/gene data found/i)).toBeInTheDocument()
  })
})
