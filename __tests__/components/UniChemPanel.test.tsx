import { render, screen } from '@testing-library/react'
import { UniChemPanel } from '@/components/profile/UniChemPanel'
import type { UniChemMapping } from '@/lib/types'

const mappings: UniChemMapping[] = [
  {
    sourceId: '1',
    sourceName: 'chembl',
    externalId: 'CHEMBL25',
    sourceFullName: 'ChEMBL',
    sourceCategory: 'drug',
    // Legacy broken shell that used to dump users on UniChem homepage
    url: 'https://www.ebi.ac.uk/unichem/#/search/chembl/CHEMBL25',
  },
  {
    sourceId: '22',
    sourceName: 'pubchem',
    externalId: '2244',
    sourceCategory: 'chemistry',
    url: 'https://www.ebi.ac.uk/unichem/#/search/pubchem/2244',
  },
]

describe('UniChemPanel', () => {
  test('renders source names and IDs (no Open column)', () => {
    render(<UniChemPanel mappings={mappings} />)
    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.getByText('External ID')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Src #')).toBeInTheDocument()
    expect(screen.queryByText('Open')).not.toBeInTheDocument()
    expect(screen.getByText('CHEMBL25')).toBeInTheDocument()
    expect(screen.getByText('2244')).toBeInTheDocument()
  })

  test('rows deep-link to target DBs not UniChem homepage', () => {
    render(<UniChemPanel mappings={mappings} />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map((a) => a.getAttribute('href') || '')
    expect(hrefs.some((h) => h.includes('chembl/explore/compound/CHEMBL25'))).toBe(true)
    expect(hrefs.some((h) => h.includes('pubchem.ncbi.nlm.nih.gov/compound/2244'))).toBe(true)
    for (const h of hrefs) {
      expect(h).not.toMatch(/unichem\/#/)
    }
  })

  test('shows category chips', () => {
    render(<UniChemPanel mappings={mappings} />)
    expect(screen.getByText('drug')).toBeInTheDocument()
    expect(screen.getByText('chemistry')).toBeInTheDocument()
  })

  test('empty state', () => {
    render(<UniChemPanel mappings={[]} />)
    expect(screen.getByText(/no cross-reference data found/i)).toBeInTheDocument()
  })
})
