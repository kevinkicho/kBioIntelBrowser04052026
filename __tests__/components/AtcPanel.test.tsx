import { render, screen } from '@testing-library/react'
import { AtcPanel } from '@/components/profile/AtcPanel'
import type { AtcClassification } from '@/lib/types'

const mockClassifications: AtcClassification[] = [
  { code: 'A10BA02', name: 'metformin', classType: 'ATC1-4' },
  { code: 'A10BA', name: 'Biguanides', classType: 'ATC1-3' },
]

describe('AtcPanel', () => {
  test('renders ATC codes', () => {
    render(<AtcPanel classifications={mockClassifications} />)
    expect(screen.getByText('A10BA02')).toBeInTheDocument()
    expect(screen.getByText('A10BA')).toBeInTheDocument()
  })

  test('renders class names', () => {
    render(<AtcPanel classifications={mockClassifications} />)
    expect(screen.getByText('metformin')).toBeInTheDocument()
    expect(screen.getByText('Biguanides')).toBeInTheDocument()
  })

  test('renders class types', () => {
    render(<AtcPanel classifications={mockClassifications} />)
    expect(screen.getByText('ATC1-4')).toBeInTheDocument()
  })

  test('renders empty state when no classifications', () => {
    render(<AtcPanel classifications={[]} />)
    expect(screen.getByText(/no atc classification found/i)).toBeInTheDocument()
  })
})
