import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CTDPanel } from '@/components/profile/CTDPanel'
import type { CTDInteraction, CTDDiseaseAssociation } from '@/lib/types'

const mockInteractions: CTDInteraction[] = [
  { chemicalName: 'Aspirin', chemicalId: 'D001241', geneSymbol: 'CYP2D6', geneId: '1636', interaction: 'affects', interactionActions: ['inhibitor'], pmids: [], source: 'CTD' },
]

const mockDiseases: CTDDiseaseAssociation[] = [
  {
    diseaseName: 'hypertension',
    diseaseId: 'C0020538',
    geneSymbol: 'ACE',
    geneId: '1636',
    inferenceScore: 3.45,
    pmids: ['111', '222'],
    source: 'CTD',
  },
]

describe('CTDPanel', () => {
  test('renders disease name with internal link on diseases tab', async () => {
    const user = userEvent.setup()
    render(<CTDPanel interactions={mockInteractions} diseaseAssociations={mockDiseases} />)
    await user.click(screen.getByRole('button', { name: /disease associations/i }))
    const links = screen.getAllByRole('link', { name: 'hypertension' })
    expect(links[0]).toHaveAttribute('href', '/disease?q=hypertension')
  })

  test('renders external CTD link on diseases tab', async () => {
    const user = userEvent.setup()
    render(<CTDPanel interactions={mockInteractions} diseaseAssociations={mockDiseases} />)
    await user.click(screen.getByRole('button', { name: /disease associations/i }))
    const externalLinks = screen.getAllByTitle('View on CTD')
    expect(externalLinks[0]).toHaveAttribute('href', 'http://ctdbase.org/detail.go?type=disease&acc=C0020538')
  })

  test('renders empty state', () => {
    render(<CTDPanel interactions={[]} diseaseAssociations={[]} />)
    expect(screen.getByText(/no ctd interactions found/i)).toBeInTheDocument()
  })
})