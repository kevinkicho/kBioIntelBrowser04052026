import { render, screen } from '@testing-library/react'
import { SecEdgarPanel } from '@/components/profile/SecEdgarPanel'
import type { SecFiling } from '@/lib/types'

const mockFilings: SecFiling[] = [
  {
    filingId: '000134143923000010',
    companyName: 'Novo Nordisk A/S',
    formType: '10-K',
    filingDate: '2023-02-15',
    description: 'Period: 2022-12-31',
    url: 'https://www.sec.gov/Archives/edgar/data/1341439/000134143923000010',
  },
]

describe('SecEdgarPanel', () => {
  test('renders company name', () => {
    render(<SecEdgarPanel filings={mockFilings} />)
    expect(screen.getByText('Novo Nordisk A/S')).toBeInTheDocument()
  })

  test('renders form type', () => {
    render(<SecEdgarPanel filings={mockFilings} />)
    expect(screen.getByText('10-K')).toBeInTheDocument()
  })

  test('renders filing date', () => {
    render(<SecEdgarPanel filings={mockFilings} />)
    expect(screen.getByText(/2023-02-15/)).toBeInTheDocument()
  })

  test('renders link to SEC filing', () => {
    render(<SecEdgarPanel filings={mockFilings} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringContaining('sec.gov'))
  })

  test('renders empty state when no filings', () => {
    render(<SecEdgarPanel filings={[]} />)
    expect(screen.getByText(/no sec filings found/i)).toBeInTheDocument()
  })
})
