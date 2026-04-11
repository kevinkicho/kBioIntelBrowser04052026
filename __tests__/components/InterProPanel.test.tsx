import { render, screen } from '@testing-library/react'
import { InterProPanel } from '@/components/profile/InterProPanel'
import type { ProteinDomain } from '@/lib/types'

const mockDomains: ProteinDomain[] = [
  {
    domainId: 'IPR001548',
    domainName: 'Peptidase M2',
    name: 'Peptidase M2',
    type: 'Family',
    description: 'Peptidase M2',
    start: 1,
    end: 200,
    source: 'InterPro',
    url: 'https://www.ebi.ac.uk/interpro/entry/InterPro/IPR001548',
  },
  {
    domainId: 'IPR034184',
    domainName: 'ACE domain',
    name: 'ACE domain',
    type: 'Domain',
    description: 'ACE domain',
    start: 201,
    end: 400,
    source: 'InterPro',
    url: 'https://www.ebi.ac.uk/interpro/entry/InterPro/IPR034184',
  },
]

describe('InterProPanel', () => {
  test('renders domain type badge', () => {
    render(<InterProPanel domains={mockDomains} />)
    expect(screen.getByText('Family')).toBeInTheDocument()
    expect(screen.getByText('Domain')).toBeInTheDocument()
  })

  test('renders domain name', () => {
    render(<InterProPanel domains={mockDomains} />)
    expect(screen.getAllByText('Peptidase M2').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('ACE domain').length).toBeGreaterThanOrEqual(1)
  })

  test('renders InterPro link for each domain', () => {
    render(<InterProPanel domains={mockDomains} />)
    const links = screen.getAllByRole('link', { name: /interpro →/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', 'https://www.ebi.ac.uk/interpro/entry/InterPro/IPR001548')
  })

  test('renders empty state when domains array is empty', () => {
    render(<InterProPanel domains={[]} />)
    expect(screen.getByText(/no protein domain data found/i)).toBeInTheDocument()
  })
})
