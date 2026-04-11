import { render, screen } from '@testing-library/react'
import { CompareSection } from '@/components/compare/CompareSection'

describe('CompareSection', () => {
  test('renders title', () => {
    render(
      <CompareSection title="Companies">
        <div>Left</div>
        <div>Right</div>
      </CompareSection>
    )
    expect(screen.getByText('Companies')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(
      <CompareSection title="Patents">
        <div>3 patents</div>
        <div>5 patents</div>
      </CompareSection>
    )
    expect(screen.getByText('3 patents')).toBeInTheDocument()
    expect(screen.getByText('5 patents')).toBeInTheDocument()
  })
})
