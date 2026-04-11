import { render, screen } from '@testing-library/react'
import { BindingDbPanel } from '@/components/profile/BindingDbPanel'
import type { BindingAffinity } from '@/lib/types'

const mockAffinities: BindingAffinity[] = [
  {
    ligandId: 'L001',
    ligandName: 'Exendin-4',
    targetName: 'GLP-1 receptor',
    affinityType: 'Ki',
    affinityValue: 0.52,
    affinityUnit: 'nM',
    affinityUnits: 'nM',
    source: 'Knudsen et al 2010',
    doi: '10.1021/jm901513s',
  },
  {
    ligandId: 'L002',
    ligandName: 'Exendin-4',
    targetName: 'GLP-2 receptor',
    affinityType: 'IC50',
    affinityValue: 120,
    affinityUnit: 'nM',
    affinityUnits: 'nM',
    source: 'Smith et al 2012',
    doi: '',
  },
]

describe('BindingDbPanel', () => {
  test('renders target name', () => {
    render(<BindingDbPanel affinities={mockAffinities} />)
    expect(screen.getByText('GLP-1 receptor')).toBeInTheDocument()
  })

  test('renders affinity type badge', () => {
    render(<BindingDbPanel affinities={mockAffinities} />)
    expect(screen.getByText('Ki')).toBeInTheDocument()
    expect(screen.getByText('IC50')).toBeInTheDocument()
  })

  test('renders affinity value with units', () => {
    render(<BindingDbPanel affinities={mockAffinities} />)
    expect(screen.getByText(/0\.52/)).toBeInTheDocument()
    expect(screen.getByText(/120/)).toBeInTheDocument()
  })

  test('renders DOI link when doi is present', () => {
    render(<BindingDbPanel affinities={mockAffinities} />)
    const links = screen.getAllByRole('link')
    expect(links.some(l => l.getAttribute('href')?.includes('doi.org'))).toBe(true)
  })

  test('does not render DOI link when doi is empty', () => {
    render(<BindingDbPanel affinities={mockAffinities} />)
    const links = screen.getAllByRole('link')
    expect(links.every(l => l.getAttribute('href') !== '')).toBe(true)
  })

  test('renders source text', () => {
    render(<BindingDbPanel affinities={mockAffinities} />)
    expect(screen.getByText('Knudsen et al 2010')).toBeInTheDocument()
  })

  test('renders empty state when no affinities', () => {
    render(<BindingDbPanel affinities={[]} />)
    expect(screen.getByText(/no binding affinity data found/i)).toBeInTheDocument()
  })
})
