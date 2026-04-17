import { render, screen } from '@testing-library/react'
import { OrphanetPanel } from '@/components/profile/OrphanetPanel'
import type { OrphanetDisease } from '@/lib/types'

const mockDiseases: OrphanetDisease[] = [
  {
    orphaCode: '585',
    diseaseName: 'multiple sclerosis',
    diseaseType: 'Disease',
    definition: 'A demyelinating disorder of the central nervous system.',
    synonyms: ['MS'],
    genes: ['HLA-DRB1'],
    symptoms: [],
    prevalence: '1-5 / 10 000',
    url: 'https://www.orpha.net/consor/cgi-bin/OC_Exp.php?Lng=EN&Expert=585',
  },
]

describe('OrphanetPanel', () => {
  test('renders disease names', () => {
    render(<OrphanetPanel diseases={mockDiseases} />)
    expect(screen.getByText('multiple sclerosis')).toBeInTheDocument()
  })

  test('renders internal disease page links', () => {
    render(<OrphanetPanel diseases={mockDiseases} />)
    const links = screen.getAllByRole('link', { name: 'multiple sclerosis' })
    expect(links[0]).toHaveAttribute('href', '/disease?q=multiple%20sclerosis')
  })

  test('renders external Orphanet links', () => {
    render(<OrphanetPanel diseases={mockDiseases} />)
    const externalLinks = screen.getAllByTitle('View on Orphanet')
    expect(externalLinks[0]).toHaveAttribute('href', 'https://www.orpha.net/consor/cgi-bin/OC_Exp.php?Lng=EN&Expert=585')
  })

  test('renders empty state', () => {
    render(<OrphanetPanel diseases={[]} />)
    expect(screen.getByText(/no rare disease data found/i)).toBeInTheDocument()
  })
})