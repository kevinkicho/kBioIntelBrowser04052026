import { render, screen } from '@testing-library/react'
import { PharosPanel } from '@/components/profile/PharosPanel'
import type { PharosTarget } from '@/lib/types'

const mockTargets: PharosTarget[] = [
  { targetId: 'T001', name: 'Angiotensin-converting enzyme', geneSymbol: 'ACE', tdl: 'Tclin', druggability: 'High', family: 'Enzyme', indications: ['Hypertension', 'Heart failure'], description: 'Converts angiotensin', novelty: 3.5, url: 'https://pharos.nih.gov/targets/ACE' },
  { targetId: 'T002', name: 'Renin', geneSymbol: 'REN', tdl: 'Tchem', druggability: 'Medium', family: 'Enzyme', indications: [], description: '', novelty: 0, url: 'https://pharos.nih.gov/targets/REN' },
]

describe('PharosPanel', () => {
  test('renders TDL badges', () => {
    render(<PharosPanel targets={mockTargets} />)
    expect(screen.getByText('Tclin')).toBeInTheDocument()
    expect(screen.getByText('Tchem')).toBeInTheDocument()
  })

  test('renders target names', () => {
    render(<PharosPanel targets={mockTargets} />)
    expect(screen.getByText('Angiotensin-converting enzyme')).toBeInTheDocument()
  })

  test('renders family badges', () => {
    render(<PharosPanel targets={mockTargets} />)
    const enzymeBadges = screen.getAllByText('Enzyme')
    expect(enzymeBadges.length).toBeGreaterThan(0)
  })

  test('renders novelty score when > 0', () => {
    render(<PharosPanel targets={mockTargets} />)
    expect(screen.getByText('Novelty: 3.5')).toBeInTheDocument()
  })

  test('renders empty state', () => {
    render(<PharosPanel targets={[]} />)
    expect(screen.getByText(/no pharos target data/i)).toBeInTheDocument()
  })
})
