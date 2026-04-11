import { render, screen } from '@testing-library/react'
import { ChebiPanel } from '@/components/profile/ChebiPanel'
import type { ChebiAnnotation } from '@/lib/types'

const mockAnnotation: ChebiAnnotation = {
  chebiId: 'CHEBI:71072',
  name: 'liraglutide',
  definition: 'A glucagon-like peptide-1 receptor agonist used in the treatment of type 2 diabetes.',
  roles: ['antidiabetic drug', 'anti-obesity drug', 'GLP-1 receptor agonist'],
  url: 'https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:71072',
}

describe('ChebiPanel', () => {
  test('renders ChEBI ID', () => {
    render(<ChebiPanel annotation={mockAnnotation} />)
    expect(screen.getByText('CHEBI:71072')).toBeInTheDocument()
  })

  test('renders molecule name', () => {
    render(<ChebiPanel annotation={mockAnnotation} />)
    expect(screen.getByText('liraglutide')).toBeInTheDocument()
  })

  test('renders definition text', () => {
    render(<ChebiPanel annotation={mockAnnotation} />)
    expect(screen.getByText(/glucagon-like peptide-1 receptor agonist/i)).toBeInTheDocument()
  })

  test('renders role badges', () => {
    render(<ChebiPanel annotation={mockAnnotation} />)
    expect(screen.getByText('antidiabetic drug')).toBeInTheDocument()
    expect(screen.getByText('anti-obesity drug')).toBeInTheDocument()
    expect(screen.getByText('GLP-1 receptor agonist')).toBeInTheDocument()
  })

  test('renders role badges with indigo color', () => {
    render(<ChebiPanel annotation={mockAnnotation} />)
    const badge = screen.getByText('antidiabetic drug')
    expect(badge.className).toMatch(/indigo/)
  })

  test('renders link to ChEBI page', () => {
    render(<ChebiPanel annotation={mockAnnotation} />)
    const link = screen.getByRole('link', { name: /view on chebi/i })
    expect(link.getAttribute('href')).toBe('https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:71072')
  })

  test('renders empty state when annotation is null', () => {
    render(<ChebiPanel annotation={null} />)
    expect(screen.getByText(/no chebi annotation found/i)).toBeInTheDocument()
  })

  test('renders no roles section when roles array is empty', () => {
    const annotationNoRoles: ChebiAnnotation = { ...mockAnnotation, roles: [] }
    render(<ChebiPanel annotation={annotationNoRoles} />)
    expect(screen.queryByText('antidiabetic drug')).not.toBeInTheDocument()
  })
})
