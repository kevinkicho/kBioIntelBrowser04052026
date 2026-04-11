import { render, screen } from '@testing-library/react'
import { NdcPanel } from '@/components/profile/NdcPanel'
import type { NdcProduct } from '@/lib/types'

const mockProducts: NdcProduct[] = [
  {
    productNdc: '0002-3227',
    substanceName: 'FLUOXETINE HYDROCHLORIDE',
    substanceUnii: '01K63TZC7V',
    productTypeName: 'HUMAN PRESCRIPTION DRUG',
    finallisted: true,
    marketingCategory: 'NDA',
    brandName: 'PROZAC',
    genericName: 'FLUOXETINE HYDROCHLORIDE',
    manufacturer: 'Eli Lilly and Company',
    labelerName: 'Eli Lilly and Company',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    pharmClass: ['Serotonin Reuptake Inhibitor [EPC]'],
    url: 'https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=0002-3227',
  },
]

describe('NdcPanel', () => {
  test('renders brand name', () => {
    render(<NdcPanel products={mockProducts} />)
    expect(screen.getByText('PROZAC')).toBeInTheDocument()
  })

  test('renders NDC code', () => {
    render(<NdcPanel products={mockProducts} />)
    expect(screen.getByText('0002-3227')).toBeInTheDocument()
  })

  test('renders generic name', () => {
    render(<NdcPanel products={mockProducts} />)
    expect(screen.getByText('FLUOXETINE HYDROCHLORIDE')).toBeInTheDocument()
  })

  test('renders pharm class badge', () => {
    render(<NdcPanel products={mockProducts} />)
    expect(screen.getByText('Serotonin Reuptake Inhibitor [EPC]')).toBeInTheDocument()
  })

  test('renders labeler name', () => {
    render(<NdcPanel products={mockProducts} />)
    expect(screen.getByText('Eli Lilly and Company')).toBeInTheDocument()
  })

  test('renders empty state when no products', () => {
    render(<NdcPanel products={[]} />)
    expect(screen.getByText(/no fda ndc data found/i)).toBeInTheDocument()
  })
})
