import { render, screen } from '@testing-library/react'
import { StitchPanel } from '@/components/profile/StitchPanel'
import type { ChemicalProteinInteraction } from '@/lib/types'

const mockInteractions: ChemicalProteinInteraction[] = [
  {
    chemicalId: 'CIDm002244',
    chemicalName: 'aspirin',
    proteinId: '9606.ENSP00000379200',
    proteinName: 'PTGS2',
    combinedScore: 0.95,
    experimentalScore: 0.7,
    databaseScore: 0.8,
    textminingScore: 0.6,
    url: 'https://stitch.embl.de/network/CIDm002244',
  },
  {
    chemicalId: 'CIDm002244',
    chemicalName: 'aspirin',
    proteinId: '9606.ENSP00000361685',
    proteinName: 'PTGS1',
    combinedScore: 0.85,
    experimentalScore: 0,
    databaseScore: 0,
    textminingScore: 0.5,
    url: 'https://stitch.embl.de/network/CIDm002244',
  },
]

describe('StitchPanel', () => {
  test('renders chemical and protein columns', () => {
    render(<StitchPanel interactions={mockInteractions} />)
    expect(screen.getAllByText('aspirin').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('PTGS2')).toBeInTheDocument()
    expect(screen.getByText('Chemical')).toBeInTheDocument()
  })

  test('renders combined score', () => {
    render(<StitchPanel interactions={mockInteractions} />)
    expect(screen.getByText('0.950')).toBeInTheDocument()
  })

  test('renders STITCH deep links', () => {
    render(<StitchPanel interactions={mockInteractions} />)
    const links = screen.getAllByRole('link')
    expect(links.some((l) => l.getAttribute('href')?.includes('stitch.embl.de'))).toBe(true)
  })

  test('renders empty state', () => {
    render(<StitchPanel interactions={[]} />)
    expect(screen.getByText(/no chemical-protein interactions found/i)).toBeInTheDocument()
  })
})
