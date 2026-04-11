import { render, screen } from '@testing-library/react'
import { StitchPanel } from '@/components/profile/StitchPanel'
import type { ChemicalProteinInteraction } from '@/lib/types'

const mockInteractions: ChemicalProteinInteraction[] = [
  { chemicalId: 'CIDm002244', chemicalName: 'aspirin', proteinId: '9606.ENSP00000379200', proteinName: 'PTGS2', combinedScore: 0.95, experimentalScore: 0.7, databaseScore: 0.8, textminingScore: 0.6, url: 'https://stitch.embl.de/network/CIDm002244' },
  { chemicalId: 'CIDm002244', chemicalName: 'aspirin', proteinId: '9606.ENSP00000361685', proteinName: 'PTGS1', combinedScore: 0.85, experimentalScore: 0, databaseScore: 0, textminingScore: 0.5, url: 'https://stitch.embl.de/network/CIDm002244' },
]

describe('StitchPanel', () => {
  test('renders chemical-protein pairs', () => {
    render(<StitchPanel interactions={mockInteractions} />)
    expect(screen.getByText('aspirin → PTGS2')).toBeInTheDocument()
  })

  test('renders combined score', () => {
    render(<StitchPanel interactions={mockInteractions} />)
    expect(screen.getByText('0.950')).toBeInTheDocument()
  })

  test('renders experimental score badge', () => {
    render(<StitchPanel interactions={mockInteractions} />)
    expect(screen.getByText('exp 0.700')).toBeInTheDocument()
  })

  test('renders database score badge', () => {
    render(<StitchPanel interactions={mockInteractions} />)
    expect(screen.getByText('db 0.800')).toBeInTheDocument()
  })

  test('does not render zero-value evidence badges', () => {
    render(<StitchPanel interactions={mockInteractions} />)
    const expBadges = screen.getAllByText(/^exp/)
    expect(expBadges).toHaveLength(1)
  })

  test('renders STITCH links', () => {
    render(<StitchPanel interactions={mockInteractions} />)
    const links = screen.getAllByRole('link', { name: /stitch →/i })
    expect(links).toHaveLength(2)
  })

  test('renders empty state', () => {
    render(<StitchPanel interactions={[]} />)
    expect(screen.getByText(/no chemical-protein interactions/i)).toBeInTheDocument()
  })
})
