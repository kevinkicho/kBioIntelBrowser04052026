import { render, screen } from '@testing-library/react'
import { QuickGoPanel } from '@/components/profile/QuickGoPanel'
import type { GoAnnotation } from '@/lib/types'

const mockAnnotations: GoAnnotation[] = [
  {
    goId: 'GO:0004180',
    goName: 'carboxypeptidase activity',
    goAspect: 'molecular_function',
    evidence: 'IDA',
    qualifier: 'enables',
    url: 'https://www.ebi.ac.uk/QuickGO/term/GO:0004180',
  },
  {
    goId: 'GO:0006508',
    goName: 'proteolysis',
    goAspect: 'biological_process',
    evidence: 'TAS',
    qualifier: 'involved_in',
    url: 'https://www.ebi.ac.uk/QuickGO/term/GO:0006508',
  },
]

describe('QuickGoPanel', () => {
  test('renders aspect badges', () => {
    render(<QuickGoPanel annotations={mockAnnotations} />)
    expect(screen.getByText('molecular_function')).toBeInTheDocument()
    expect(screen.getByText('biological_process')).toBeInTheDocument()
  })

  test('renders GO IDs', () => {
    render(<QuickGoPanel annotations={mockAnnotations} />)
    expect(screen.getByText('GO:0004180')).toBeInTheDocument()
    expect(screen.getByText('GO:0006508')).toBeInTheDocument()
  })

  test('renders GO names', () => {
    render(<QuickGoPanel annotations={mockAnnotations} />)
    expect(screen.getByText('carboxypeptidase activity')).toBeInTheDocument()
    expect(screen.getByText('proteolysis')).toBeInTheDocument()
  })

  test('renders evidence codes', () => {
    render(<QuickGoPanel annotations={mockAnnotations} />)
    expect(screen.getByText('IDA')).toBeInTheDocument()
    expect(screen.getByText('TAS')).toBeInTheDocument()
  })

  test('renders link to QuickGO', () => {
    render(<QuickGoPanel annotations={mockAnnotations} />)
    const links = screen.getAllByRole('link', { name: /view in quickgo/i })
    expect(links[0]).toHaveAttribute('href', 'https://www.ebi.ac.uk/QuickGO/term/GO:0004180')
  })

  test('renders empty state when no annotations', () => {
    render(<QuickGoPanel annotations={[]} />)
    expect(screen.getByText(/no gene ontology annotations found/i)).toBeInTheDocument()
  })
})
