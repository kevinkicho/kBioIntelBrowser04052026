import { render, screen } from '@testing-library/react'
import { WikiPathwaysPanel } from '@/components/profile/WikiPathwaysPanel'
import type { WikiPathway } from '@/lib/types'

const mockPathways: WikiPathway[] = [
  {
    id: 'WP123',
    name: 'ACE Inhibitor Pathway',
    species: 'Homo sapiens',
    url: 'https://www.wikipathways.org/pathways/WP123',
  },
  {
    id: 'WP456',
    name: 'Renin-Angiotensin System',
    species: 'Homo sapiens',
    url: 'https://www.wikipathways.org/pathways/WP456',
  },
]

describe('WikiPathwaysPanel', () => {
  test('renders pathway ID badge', () => {
    render(<WikiPathwaysPanel pathways={mockPathways} />)
    expect(screen.getByText('WP123')).toBeInTheDocument()
  })

  test('renders pathway name', () => {
    render(<WikiPathwaysPanel pathways={mockPathways} />)
    expect(screen.getByText('ACE Inhibitor Pathway')).toBeInTheDocument()
  })

  test('renders species tag', () => {
    render(<WikiPathwaysPanel pathways={mockPathways} />)
    const speciesTags = screen.getAllByText('Homo sapiens')
    expect(speciesTags.length).toBeGreaterThanOrEqual(1)
  })

  test('renders WikiPathways link for each pathway', () => {
    render(<WikiPathwaysPanel pathways={mockPathways} />)
    const links = screen.getAllByRole('link', { name: /wikipathways →/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://www.wikipathways.org/pathways/WP123')
  })

  test('renders empty state when pathways array is empty', () => {
    render(<WikiPathwaysPanel pathways={[]} />)
    expect(screen.getByText(/no wikipathways data found/i)).toBeInTheDocument()
  })
})
