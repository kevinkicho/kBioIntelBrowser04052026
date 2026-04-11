import { render, screen } from '@testing-library/react'
import { PdbeLigandsPanel } from '@/components/profile/PdbeLigandsPanel'
import type { PdbeLigand } from '@/lib/types'

const mockLigands: PdbeLigand[] = [
  {
    compId: 'ASP',
    name: 'ASPIRIN',
    formula: 'C9H8O4',
    molecularWeight: 180.16,
    inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
    drugbankId: 'DB00945',
    url: 'https://www.ebi.ac.uk/pdbe/entry/pdb/ASP',
  },
  {
    compId: 'SAL',
    name: 'Salicylic Acid',
    formula: 'C7H6O3',
    molecularWeight: 138.12,
    inchiKey: '',
    drugbankId: '',
    url: 'https://www.ebi.ac.uk/pdbe/entry/pdb/SAL',
  },
]

describe('PdbeLigandsPanel', () => {
  test('renders compound ID badge', () => {
    render(<PdbeLigandsPanel ligands={mockLigands} />)
    expect(screen.getByText('ASP')).toBeInTheDocument()
  })

  test('renders ligand name', () => {
    render(<PdbeLigandsPanel ligands={mockLigands} />)
    expect(screen.getByText('ASPIRIN')).toBeInTheDocument()
  })

  test('renders formula', () => {
    render(<PdbeLigandsPanel ligands={mockLigands} />)
    expect(screen.getByText('Formula: C9H8O4')).toBeInTheDocument()
  })

  test('renders molecular weight', () => {
    render(<PdbeLigandsPanel ligands={mockLigands} />)
    expect(screen.getByText('MW: 180.16')).toBeInTheDocument()
  })

  test('renders InChI key when present', () => {
    render(<PdbeLigandsPanel ligands={mockLigands} />)
    expect(screen.getByText('BSYNRYMUTXBXSQ-UHFFFAOYSA-N')).toBeInTheDocument()
  })

  test('renders DrugBank ID when present', () => {
    render(<PdbeLigandsPanel ligands={mockLigands} />)
    expect(screen.getByText('DrugBank: DB00945')).toBeInTheDocument()
  })

  test('renders link to PDBe', () => {
    render(<PdbeLigandsPanel ligands={mockLigands} />)
    const links = screen.getAllByRole('link', { name: /view on pdbe/i })
    expect(links[0].getAttribute('href')).toBe('https://www.ebi.ac.uk/pdbe/entry/pdb/ASP')
  })

  test('renders empty state', () => {
    render(<PdbeLigandsPanel ligands={[]} />)
    expect(screen.getByText(/no pdbe ligand data found/i)).toBeInTheDocument()
  })
})
