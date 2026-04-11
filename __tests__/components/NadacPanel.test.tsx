import { render, screen } from '@testing-library/react'
import { NadacPanel } from '@/components/profile/NadacPanel'
import type { DrugPrice } from '@/lib/types'

const mockPrices: DrugPrice[] = [
  {
    ndcCode: '0002-3227',
    ndcDescription: 'ASPIRIN 325 MG TABLET',
    nadacPerUnit: 0.0123,
    effectiveDate: '2025-01-01T00:00:00.000',
    pharmacyType: 'RETAIL',
    pricingUnit: 'EA',
    url: 'https://data.medicaid.gov/dataset/nadac',
  },
  {
    ndcCode: '0002-3228',
    ndcDescription: 'ASPIRIN 81 MG TABLET',
    nadacPerUnit: 0.0456,
    effectiveDate: '2025-02-01T00:00:00.000',
    pharmacyType: 'MAIL ORDER',
    pricingUnit: 'EA',
    url: 'https://data.medicaid.gov/dataset/nadac',
  },
]

describe('NadacPanel', () => {
  test('renders NDC descriptions', () => {
    render(<NadacPanel prices={mockPrices} />)
    expect(screen.getAllByText('ASPIRIN 325 MG TABLET')[0]).toBeInTheDocument()
    expect(screen.getAllByText('ASPIRIN 81 MG TABLET')[0]).toBeInTheDocument()
  })

  test('formats nadacPerUnit as USD with 4 decimal places', () => {
    render(<NadacPanel prices={mockPrices} />)
    expect(screen.getByText('$0.0123 / EA')).toBeInTheDocument()
  })

  test('renders RETAIL badge with cyan styling', () => {
    render(<NadacPanel prices={mockPrices} />)
    const badge = screen.getByText('RETAIL')
    expect(badge).toHaveClass('text-cyan-300')
  })

  test('renders MAIL ORDER badge with violet styling', () => {
    render(<NadacPanel prices={mockPrices} />)
    const badge = screen.getByText('MAIL ORDER')
    expect(badge).toHaveClass('text-violet-300')
  })

  test('renders effective date trimmed to 10 chars', () => {
    render(<NadacPanel prices={mockPrices} />)
    expect(screen.getByText('Effective: 2025-01-01')).toBeInTheDocument()
  })

  test('renders empty state when prices array is empty', () => {
    render(<NadacPanel prices={[]} />)
    expect(screen.getByText(/no recent nadac pricing data/i)).toBeInTheDocument()
  })
})
