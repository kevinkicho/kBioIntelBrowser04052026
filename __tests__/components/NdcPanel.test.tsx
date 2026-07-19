import { render, screen } from '@testing-library/react'
import { NdcPanel } from '@/components/profile/NdcPanel'
import type { NdcProduct } from '@/lib/types'

const mockProducts: NdcProduct[] = [
  {
    productNdc: '0002-3227',
    substanceName: 'FLUOXETINE HYDROCHLORIDE',
    substanceUnii: '01K63TZC7V',
    productType: 'HUMAN PRESCRIPTION DRUG',
    finallisted: true,
    marketingCategory: 'NDA',
    brandName: 'PROZAC',
    genericName: 'FLUOXETINE HYDROCHLORIDE',
    manufacturer: 'Eli Lilly and Company',
    labelerName: 'Eli Lilly and Company',
    dosageForm: 'CAPSULE',
    route: 'ORAL',
    pharmClass: ['Serotonin Reuptake Inhibitor [EPC]'],
    url: 'https://api.fda.gov/drug/ndc.json?search=product_ndc:"0002-3227"&limit=1',
  },
]

describe('NdcPanel', () => {
  test('renders table headers for detailed listview', () => {
    render(<NdcPanel products={mockProducts} />)
    expect(screen.getByText('Brand / generic')).toBeInTheDocument()
    expect(screen.getByText('NDC')).toBeInTheDocument()
    expect(screen.getByText('Form / route')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Labeler')).toBeInTheDocument()
  })

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

  test('row deep-links to openFDA NDC record', () => {
    render(<NdcPanel products={mockProducts} />)
    const link = screen.getByRole('link', { name: /PROZAC/i })
    expect(link).toHaveAttribute('href')
    const href = link.getAttribute('href') || ''
    expect(href).toContain('api.fda.gov/drug/ndc.json')
    expect(href).toContain('0002-3227')
    expect(link).toHaveAttribute('target', '_blank')
  })

  test('offers DailyMed secondary label link', () => {
    render(<NdcPanel products={mockProducts} />)
    const dm = screen.getByRole('link', { name: /DailyMed labels/i })
    expect(dm).toHaveAttribute('href', expect.stringContaining('dailymed'))
    expect(dm.getAttribute('href')).toContain('0002-3227')
  })

  test('renders empty state when no products', () => {
    render(<NdcPanel products={[]} />)
    expect(screen.getByText(/no fda ndc data found/i)).toBeInTheDocument()
  })
})
