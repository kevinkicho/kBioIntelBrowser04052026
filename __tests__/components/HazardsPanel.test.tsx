import { render, screen } from '@testing-library/react'
import { HazardsPanel } from '@/components/profile/HazardsPanel'
import type { GhsHazardData } from '@/lib/types'

const mockHazards: GhsHazardData = {
  signalWord: 'Danger',
  pictogramUrls: ['https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS07.svg'],
  hazardStatements: ['H302: Harmful if swallowed', 'H315: Causes skin irritation'],
  precautionaryStatements: ['P264: Wash hands thoroughly after handling'],
}

describe('HazardsPanel', () => {
  test('renders signal word', () => {
    render(<HazardsPanel hazards={mockHazards} />)
    expect(screen.getByText('Danger')).toBeInTheDocument()
  })

  test('renders hazard statements', () => {
    render(<HazardsPanel hazards={mockHazards} />)
    expect(screen.getByText('H302: Harmful if swallowed')).toBeInTheDocument()
    expect(screen.getByText('H315: Causes skin irritation')).toBeInTheDocument()
  })

  test('renders precautionary statements', () => {
    render(<HazardsPanel hazards={mockHazards} />)
    expect(screen.getByText(/P264/)).toBeInTheDocument()
  })

  test('renders pictogram images', () => {
    render(<HazardsPanel hazards={mockHazards} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://pubchem.ncbi.nlm.nih.gov/images/ghs/GHS07.svg')
  })

  test('renders empty state when hazards is null', () => {
    render(<HazardsPanel hazards={null} />)
    expect(screen.getByText(/no ghs hazard data available/i)).toBeInTheDocument()
  })
})
