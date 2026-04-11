import { render, screen } from '@testing-library/react'
import { PropertiesPanel } from '@/components/profile/PropertiesPanel'
import type { ComputedProperties } from '@/lib/types'

const mockProperties: ComputedProperties = {
  xLogP: 1.2, tpsa: 63.6, hBondDonorCount: 1, hBondAcceptorCount: 4,
  complexity: 212, exactMass: 180.042, charge: 0, rotatableBondCount: 3,
}

describe('PropertiesPanel', () => {
  test('renders LogP value', () => {
    render(<PropertiesPanel properties={mockProperties} molecularWeight={180.16} />)
    expect(screen.getByText('1.2')).toBeInTheDocument()
  })

  test('renders TPSA value', () => {
    render(<PropertiesPanel properties={mockProperties} molecularWeight={180.16} />)
    expect(screen.getByText('63.6')).toBeInTheDocument()
  })

  test('renders H-bond donor count', () => {
    render(<PropertiesPanel properties={mockProperties} molecularWeight={180.16} />)
    expect(screen.getByText('H-Bond Donors')).toBeInTheDocument()
  })

  test('highlights Lipinski violation for high LogP', () => {
    const violating: ComputedProperties = { ...mockProperties, xLogP: 6.5 }
    const { container } = render(<PropertiesPanel properties={violating} molecularWeight={180.16} />)
    const amberElements = container.querySelectorAll('.text-amber-300')
    expect(amberElements.length).toBeGreaterThan(0)
  })

  test('renders empty state when properties is null', () => {
    render(<PropertiesPanel properties={null} molecularWeight={180.16} />)
    expect(screen.getByText(/no computed properties available/i)).toBeInTheDocument()
  })
})
