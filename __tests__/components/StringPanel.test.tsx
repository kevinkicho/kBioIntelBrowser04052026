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
  test('renders protein pair with arrow separator', () => {
    render(<StringPanel interactions={mockInteractions} />)
    expect(screen.getByText('ACE ↔ AGT')).toBeInTheDocument()
  })

  test('renders combined score formatted to 3 decimal places', () => {
    render(<StringPanel interactions={mockInteractions} />)
    expect(screen.getByText('0.999')).toBeInTheDocument()
  })

  test('renders experimental score badge with teal styling', () => {
    render(<StringPanel interactions={mockInteractions} />)
    expect(screen.getByText('exp 0.800')).toBeInTheDocument()
  })

  test('renders database score badge with blue styling', () => {
    render(<StringPanel interactions={mockInteractions} />)
    expect(screen.getByText('db 0.900')).toBeInTheDocument()
  })

  test('renders textmining score badge with slate styling', () => {
    render(<StringPanel interactions={mockInteractions} />)
    expect(screen.getByText('text 0.700')).toBeInTheDocument()
  })

  test('does not render zero-value evidence score badges', () => {
    render(<StringPanel interactions={mockInteractions} />)
    const expBadges = screen.getAllByText(/^exp/)
    expect(expBadges).toHaveLength(1)
  })

  test('renders STRING link for each interaction', () => {
    render(<StringPanel interactions={mockInteractions} />)
    const links = screen.getAllByRole('link', { name: /string →/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://string-db.org/network/9606.ENSP00000290421')
  })

  test('renders empty state when interactions array is empty', () => {
    render(<StringPanel interactions={[]} />)
    expect(screen.getByText(/no protein interactions found/i)).toBeInTheDocument()
  })
})
