import { render, screen } from '@testing-library/react'
import { DisGeNETPanel } from '@/components/profile/DisGeNETPanel'
import type { DisGeNetAssociation } from '@/lib/types'

const mockAssociations: DisGeNetAssociation[] = [
  {
    geneSymbol: 'TCF7L2',
    geneId: '6934',
    diseaseId: 'C0011860',
    diseaseName: 'type 2 diabetes mellitus',
    diseaseType: 'disease',
    score: 0.856,
    confidenceScore: 0.92,
    source: 'CURATED',
    pmids: ['12345', '67890'],
  },
  {
    geneSymbol: 'PPARG',
    geneId: '5468',
    diseaseId: 'C0011847',
    diseaseName: 'diabetes mellitus',
    diseaseType: 'disease',
    score: 0.743,
    source: 'CURATED',
    pmids: [],
  },
]

describe('DisGeNETPanel', () => {
  test('renders disease names', () => {
    render(<DisGeNETPanel associations={mockAssociations} />)
    expect(screen.getByText('type 2 diabetes mellitus')).toBeInTheDocument()
    expect(screen.getByText('diabetes mellitus')).toBeInTheDocument()
  })

  test('renders internal disease page links', () => {
    render(<DisGeNETPanel associations={mockAssociations} />)
    const links = screen.getAllByRole('link', { name: 'type 2 diabetes mellitus' })
    expect(links[0]).toHaveAttribute('href', '/disease?q=type%202%20diabetes%20mellitus')
  })

  test('renders external DisGeNET links', () => {
    render(<DisGeNETPanel associations={mockAssociations} />)
    const externalLinks = screen.getAllByTitle('View on DisGeNET')
    expect(externalLinks[0]).toHaveAttribute('href', 'https://www.disgenet.org/browser/0/1/C0011860/')
  })

  test('renders empty state', () => {
    render(<DisGeNETPanel associations={[]} />)
    expect(screen.getByText(/no disease-gene associations found/i)).toBeInTheDocument()
  })
})