import { render, screen } from '@testing-library/react'
import { MyChemPanel } from '@/components/profile/MyChemPanel'
import type { MyChemAnnotation } from '@/lib/types'

const chemicals: MyChemAnnotation[] = [
  {
    chemblId: 'CHEMBL25',
    pubchemCid: '2244',
    chebiId: 'CHEBI:15365',
    inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
    drugbankId: 'DB00945',
    name: 'ASPIRIN',
    synonyms: ['Acetylsalicylic acid'],
    formula: 'C9H8O4',
    molecularWeight: 180.16,
    smiles: '',
    sources: ['chembl', 'chebi', 'drugbank', 'pubchem'],
    url: 'https://mychem.info/v1/chem/BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
    chembl: { moleculeType: 'Small molecule', maxPhase: 4, indications: [] },
    chebi: { name: 'acetylsalicylic acid', definition: 'NSAID', parentIds: [] },
    drugbank: { categories: [], groups: ['approved'], atcCodes: [] },
  },
]

describe('MyChemPanel', () => {
  test('renders real compound name not Unknown compound', () => {
    render(<MyChemPanel chemicals={chemicals} />)
    expect(screen.getByText('ASPIRIN')).toBeInTheDocument()
    expect(screen.queryByText('Unknown compound')).not.toBeInTheDocument()
  })

  test('table row deep-links to MyChem chem annotation', () => {
    render(<MyChemPanel chemicals={chemicals} />)
    expect(screen.getByText('Name / IDs')).toBeInTheDocument()
    const title = screen.getByRole('link', { name: /ASPIRIN/i })
    expect(title).toHaveAttribute(
      'href',
      'https://mychem.info/v1/chem/BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
    )
  })

  test('shows source ids in row', () => {
    render(<MyChemPanel chemicals={chemicals} />)
    expect(screen.getByText('CHEMBL25')).toBeInTheDocument()
    expect(screen.getByText(/CID 2244/)).toBeInTheDocument()
  })

  test('empty state', () => {
    render(<MyChemPanel chemicals={[]} />)
    expect(screen.getByText(/no chemical annotations found/i)).toBeInTheDocument()
  })
})
