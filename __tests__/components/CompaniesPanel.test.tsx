import { render, screen } from '@testing-library/react'
import { CompaniesPanel } from '@/components/profile/CompaniesPanel'
import type { CompanyProduct } from '@/lib/types'

const mockCompanies: CompanyProduct[] = [
  {
    company: 'Novo Nordisk',
    brandName: 'Victoza',
    genericName: 'LIRAGLUTIDE',
    productType: 'HUMAN PRESCRIPTION DRUG',
    route: 'SUBCUTANEOUS',
    applicationNumber: 'NDA022341',
  },
]

describe('CompaniesPanel', () => {
  test('renders company name', () => {
    render(<CompaniesPanel companies={mockCompanies} />)
    expect(screen.getByText('Novo Nordisk')).toBeInTheDocument()
  })

  test('renders brand name', () => {
    render(<CompaniesPanel companies={mockCompanies} />)
    expect(screen.getByText('Victoza')).toBeInTheDocument()
  })

  test('renders empty state when no companies', () => {
    render(<CompaniesPanel companies={[]} />)
    expect(screen.getByText(/no approved products/i)).toBeInTheDocument()
  })
})
