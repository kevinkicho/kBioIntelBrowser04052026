import { render, screen } from '@testing-library/react'
import { PropertiesCompare } from '@/components/compare/PropertiesCompare'
import type { ComputedProperties } from '@/lib/types'

// Check the type at src/lib/types.ts — ComputedProperties has these fields:
// xLogP: number | null, tpsa: number | null, hBondDonorCount: number,
// hBondAcceptorCount: number, complexity: number, exactMass: number,
// rotatableBondCount: number

describe('PropertiesCompare', () => {
  const propsA: ComputedProperties = {
    xLogP: 1.5, tpsa: 63.6, hBondDonorCount: 2, hBondAcceptorCount: 4,
    complexity: 346, exactMass: 151.063, rotatableBondCount: 1,
    charge: 0,
  }
  const propsB: ComputedProperties = {
    xLogP: 6.2, tpsa: 37.3, hBondDonorCount: 7, hBondAcceptorCount: 1,
    complexity: 500, exactMass: 270.162, rotatableBondCount: 4,
    charge: 0,
  }

  it('renders property rows for both molecules', () => {
    render(<PropertiesCompare a={propsA} b={propsB} mwA={151} mwB={270} />)
    expect(screen.getByText('LogP')).toBeInTheDocument()
    expect(screen.getByText('1.5')).toBeInTheDocument()
    expect(screen.getByText('6.2')).toBeInTheDocument()
  })

  it('highlights Lipinski violations', () => {
    render(<PropertiesCompare a={propsA} b={propsB} mwA={151} mwB={550} />)
    // MW 550 > 500 = violation, and LogP 6.2 > 5 = violation, HBD 7 > 5 = violation
    // Check that violation styling is applied (amber text)
    const violationCells = document.querySelectorAll('.text-amber-300')
    expect(violationCells.length).toBeGreaterThanOrEqual(3)
  })

  it('shows N/A when properties are null', () => {
    render(<PropertiesCompare a={null} b={propsB} mwA={0} mwB={270} />)
    const naCells = screen.getAllByText('N/A')
    expect(naCells.length).toBeGreaterThan(0)
  })

  it('renders molecular weight row', () => {
    render(<PropertiesCompare a={propsA} b={propsB} mwA={151.06} mwB={270.16} />)
    expect(screen.getByText('Molecular Weight')).toBeInTheDocument()
    expect(screen.getByText('151.06')).toBeInTheDocument()
    expect(screen.getByText('270.16')).toBeInTheDocument()
  })
})
