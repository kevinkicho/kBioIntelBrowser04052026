import { render, screen } from '@testing-library/react'
import { NciThesaurusPanel } from '@/components/profile/NciThesaurusPanel'
import type { NciConcept } from '@/lib/types'

const mockConcepts: NciConcept[] = [
  {
    conceptId: 'C61948',
    code: 'C61948',
    name: 'Aspirin',
    definition: 'A non-steroidal anti-inflammatory drug.',
    semanticType: 'Pharmacologic Substance',
    conceptStatus: 'Retired_Concept',
    leaf: true,
    synonyms: ['Acetylsalicylic acid', 'ASA'],
    parents: ['C258'],
    url: 'https://ncit.nci.nih.gov/ncitbrowser/ConceptReport.jsp?dictionary=NCI_Thesaurus&code=C61948',
  },
  {
    conceptId: 'C287',
    code: 'C287',
    name: 'Aspirin Measurement',
    definition: 'A measurement of aspirin.',
    semanticType: 'Quantitative Concept',
    conceptStatus: 'DEFAULT',
    leaf: false,
    synonyms: [],
    parents: [],
    url: 'https://ncit.nci.nih.gov/ncitbrowser/ConceptReport.jsp?dictionary=NCI_Thesaurus&code=C287',
  },
]

describe('NciThesaurusPanel', () => {
  test('renders concept code badge', () => {
    render(<NciThesaurusPanel concepts={mockConcepts} />)
    expect(screen.getByText('C61948')).toBeInTheDocument()
  })

  test('renders concept name', () => {
    render(<NciThesaurusPanel concepts={mockConcepts} />)
    expect(screen.getByText('Aspirin')).toBeInTheDocument()
  })

  test('renders concept status tag', () => {
    render(<NciThesaurusPanel concepts={mockConcepts} />)
    expect(screen.getByText('Retired_Concept')).toBeInTheDocument()
  })

  test('renders leaf indicator', () => {
    render(<NciThesaurusPanel concepts={mockConcepts} />)
    expect(screen.getByText('Leaf node')).toBeInTheDocument()
    expect(screen.getByText('Branch node')).toBeInTheDocument()
  })

  test('renders link to NCI Thesaurus', () => {
    render(<NciThesaurusPanel concepts={mockConcepts} />)
    const links = screen.getAllByRole('link', { name: /view in nci thesaurus/i })
    expect(links[0].getAttribute('href')).toContain('C61948')
  })

  test('renders empty state', () => {
    render(<NciThesaurusPanel concepts={[]} />)
    expect(screen.getByText(/no nci thesaurus concepts found/i)).toBeInTheDocument()
  })
})
