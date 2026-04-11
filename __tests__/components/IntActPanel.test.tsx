import { render, screen } from '@testing-library/react'
import { IntActPanel } from '@/components/profile/IntActPanel'
import type { MolecularInteraction } from '@/lib/types'

const mockInteractions: MolecularInteraction[] = [
  {
    interactionId: 'EBI-12345',
    proteinA: 'ACE',
    proteinB: 'AGT',
    interactorA: 'ACE',
    interactorB: 'AGT',
    interactionType: 'physical association',
    detectionMethod: 'two hybrid',
    pubmedId: '12345678',
    url: 'https://www.ebi.ac.uk/intact/details/interaction/EBI-12345',
    confidenceScore: 0.85,
  },
  {
    interactionId: 'EBI-99',
    proteinA: 'ACE',
    proteinB: 'REN',
    interactorA: 'ACE',
    interactorB: 'REN',
    interactionType: 'colocalization',
    detectionMethod: '',
    pubmedId: '',
    url: 'https://www.ebi.ac.uk/intact/details/interaction/EBI-99',
    confidenceScore: 0,
  },
]

describe('IntActPanel', () => {
  test('renders interactor pair with arrow separator', () => {
    render(<IntActPanel interactions={mockInteractions} />)
    expect(screen.getByText('ACE ↔ AGT')).toBeInTheDocument()
    expect(screen.getByText('ACE ↔ REN')).toBeInTheDocument()
  })

  test('renders interaction type badge', () => {
    render(<IntActPanel interactions={mockInteractions} />)
    expect(screen.getByText('physical association')).toBeInTheDocument()
    expect(screen.getByText('colocalization')).toBeInTheDocument()
  })

  test('renders detection method when present', () => {
    render(<IntActPanel interactions={mockInteractions} />)
    expect(screen.getByText('two hybrid')).toBeInTheDocument()
  })

  test('renders PubMed link when pubmedId is present', () => {
    render(<IntActPanel interactions={mockInteractions} />)
    const pubmedLink = screen.getByRole('link', { name: /pubmed 12345678/i })
    expect(pubmedLink).toHaveAttribute('href', 'https://pubmed.ncbi.nlm.nih.gov/12345678')
  })

  test('does not render PubMed link when pubmedId is empty', () => {
    render(<IntActPanel interactions={mockInteractions} />)
    const pubmedLinks = screen.getAllByRole('link', { name: /pubmed/i })
    expect(pubmedLinks).toHaveLength(1)
  })

  test('renders confidence score when greater than zero', () => {
    render(<IntActPanel interactions={mockInteractions} />)
    expect(screen.getByText('score 0.850')).toBeInTheDocument()
  })

  test('renders IntAct link for each interaction', () => {
    render(<IntActPanel interactions={mockInteractions} />)
    const links = screen.getAllByRole('link', { name: /intact →/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://www.ebi.ac.uk/intact/details/interaction/EBI-12345')
  })

  test('renders empty state when interactions array is empty', () => {
    render(<IntActPanel interactions={[]} />)
    expect(screen.getByText(/no molecular interaction data found/i)).toBeInTheDocument()
  })
})
