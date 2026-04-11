import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategorySection } from '@/components/profile/CategorySection'

describe('CategorySection', () => {
  it('renders header with icon, label, and count', () => {
    render(
      <CategorySection icon="💊" label="Pharmaceutical" withData={3} total={7}>
        <div>child content</div>
      </CategorySection>
    )
    const button = screen.getByRole('button')
    expect(button.textContent).toContain('💊')
    expect(button.textContent).toContain('Pharmaceutical')
    expect(button.textContent).toContain('3/7')
  })

  it('renders children by default (not collapsed)', () => {
    render(
      <CategorySection icon="🧪" label="Molecular" withData={2} total={5}>
        <div data-testid="child">child content</div>
      </CategorySection>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('toggles collapse on click — hides children', () => {
    render(
      <CategorySection icon="🧪" label="Molecular" withData={2} total={5}>
        <div data-testid="child">child content</div>
      </CategorySection>
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
  })

  it('toggles back to expanded on second click', () => {
    render(
      <CategorySection icon="🧪" label="Molecular" withData={2} total={5}>
        <div data-testid="child">child content</div>
      </CategorySection>
    )
    const button = screen.getByRole('button')
    fireEvent.click(button) // collapse
    fireEvent.click(button) // expand
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('supports defaultCollapsed prop', () => {
    render(
      <CategorySection icon="🧪" label="Molecular" withData={2} total={5} defaultCollapsed>
        <div data-testid="child">child content</div>
      </CategorySection>
    )
    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
  })

  it('applies muted style when withData is 0', () => {
    render(
      <CategorySection icon="🧪" label="Empty" withData={0} total={5}>
        <div>child</div>
      </CategorySection>
    )
    const button = screen.getByRole('button')
    expect(button.className).toContain('text-slate-500')
    expect(button.className).not.toContain('text-slate-200')
  })

  it('applies active style when withData > 0', () => {
    render(
      <CategorySection icon="🧪" label="Active" withData={3} total={5}>
        <div>child</div>
      </CategorySection>
    )
    const button = screen.getByRole('button')
    expect(button.className).toContain('text-slate-200')
  })

  it('renders children in a grid container', () => {
    render(
      <CategorySection icon="🧪" label="Grid" withData={1} total={5}>
        <div data-testid="child">child</div>
      </CategorySection>
    )
    const child = screen.getByTestId('child')
    const gridContainer = child.parentElement
    expect(gridContainer?.className).toContain('grid')
    expect(gridContainer?.className).toContain('grid-cols-1')
    expect(gridContainer?.className).toContain('md:grid-cols-2')
  })
})
