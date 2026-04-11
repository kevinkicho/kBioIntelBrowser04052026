import { render, screen } from '@testing-library/react'
import { CompToxPanel } from '@/components/profile/CompToxPanel'
import type { CompToxData } from '@/lib/types'

const mockData: CompToxData = {
  dtxsid: 'DTXSID7020182',
  chemicalName: 'Aspirin',
  casrn: '50-78-2',
  casNumber: '50-78-2',
  molecularFormula: 'C9H8O4',
  molecularWeight: 180.16,
  structureUrl: 'https://comptox.epa.gov/dashboard/chemical/details/DTXSID7020182/structure',
  synonyms: ['Acetylsalicylic acid', 'ASA'],
  toxcastTotal: 800,
  toxcastActive: 42,
  url: 'https://comptox.epa.gov/dashboard/chemical/details/DTXSID7020182',
  exposurePrediction: 'MEDIAN',
}

describe('CompToxPanel', () => {
  test('renders CAS number badge', () => {
    render(<CompToxPanel data={mockData} />)
    expect(screen.getByText('50-78-2')).toBeInTheDocument()
  })

  test('renders ToxCast active/total fraction', () => {
    render(<CompToxPanel data={mockData} />)
    expect(screen.getByText('42 / 800')).toBeInTheDocument()
  })

  test('renders exposure prediction text', () => {
    render(<CompToxPanel data={mockData} />)
    expect(screen.getByText('MEDIAN')).toBeInTheDocument()
  })

  test('renders link to CompTox Dashboard', () => {
    render(<CompToxPanel data={mockData} />)
    const link = screen.getByRole('link', { name: /view on comptox dashboard/i })
    expect(link).toHaveAttribute('href', 'https://comptox.epa.gov/dashboard/chemical/details/DTXSID7020182')
  })

  test('renders empty state when data is null', () => {
    render(<CompToxPanel data={null} />)
    expect(screen.getByText(/no comptox data available/i)).toBeInTheDocument()
  })

  test('renders progress bar with correct percentage', () => {
    render(<CompToxPanel data={mockData} />)
    expect(screen.getByText('5.3% active assays')).toBeInTheDocument()
  })
})
