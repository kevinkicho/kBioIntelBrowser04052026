import { render, screen } from '@testing-library/react'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import type { Molecule } from '@/lib/types'

const mockMolecule: Molecule = {
  cid: 5793,
  name: 'Glucose',
  formula: 'C6H12O6',
  iupacName: 'D-glucose',
  molecularWeight: 180.16,
  classification: 'metabolite',
  synonyms: ['Dextrose', 'Blood sugar'],
  inchiKey: 'WQZGKKKJIJFFOK-GASJEMHNSA-N',
  structureImageUrl: 'https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=5793&t=l',
  description: 'A simple sugar.',
}

describe('ProfileHeader', () => {
  test('renders molecule name', () => {
    render(<ProfileHeader molecule={mockMolecule} />)
    expect(screen.getByText('Glucose')).toBeInTheDocument()
  })

  test('renders molecular formula', () => {
    render(<ProfileHeader molecule={mockMolecule} />)
    expect(screen.getByText('C6H12O6')).toBeInTheDocument()
  })

  test('renders classification badge', () => {
    render(<ProfileHeader molecule={mockMolecule} />)
    expect(screen.getByText('Metabolite')).toBeInTheDocument()
  })

  test('renders molecular weight', () => {
    render(<ProfileHeader molecule={mockMolecule} />)
    expect(screen.getByText(/180.16/)).toBeInTheDocument()
  })
})
