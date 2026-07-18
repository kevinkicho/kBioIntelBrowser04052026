import { render, screen } from '@testing-library/react'
import { StringPanel } from '@/components/profile/StringPanel'
import type { StringInteraction } from '@/lib/types'

const mockInteractions: StringInteraction[] = [
  {
    proteinA: 'ACE',
    proteinB: 'AGT',
    score: 0.999,
    experimentalScore: 0.8,
    databaseScore: 0.9,
    textminingScore: 0.7,
    url: 'https://string-db.org/network/9606.ENSP00000290421',
  },
  {
    proteinA: 'ACE',
    proteinB: 'REN',
    score: 0.85,
    experimentalScore: 0,
    databaseScore: 0,
    textminingScore: 0.5,
    url: 'https://string-db.org/network/9606.ENSP00000290421',
  },
]

describe('StringPanel', () => {
  test('renders protein pair columns', () => {
    render(<StringPanel interactions={mockInteractions} />)
    expect(screen.getAllByText('ACE').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('AGT')).toBeInTheDocument()
    expect(screen.getByText('Protein A')).toBeInTheDocument()
  })

  test('renders combined score formatted to 3 decimal places', () => {
    render(<StringPanel interactions={mockInteractions} />)
    expect(screen.getByText('0.999')).toBeInTheDocument()
  })

  test('row deep-links to STRING', () => {
    render(<StringPanel interactions={mockInteractions} />)
    const links = screen.getAllByRole('link')
    expect(links.some((l) => l.getAttribute('href')?.includes('string-db.org'))).toBe(true)
  })

  test('renders empty state', () => {
    render(<StringPanel interactions={[]} />)
    expect(screen.getByText(/no protein interactions found/i)).toBeInTheDocument()
  })
})
