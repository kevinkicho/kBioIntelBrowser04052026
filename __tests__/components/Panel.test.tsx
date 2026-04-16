import { render, screen } from '@testing-library/react'
import { Panel } from '@/components/ui/Panel'
import { ClassificationBadge } from '@/components/ui/Badge'

describe('Panel', () => {
  test('renders title and children', () => {
    render(<Panel title="Companies & Products"><p>Test content</p></Panel>)
    expect(screen.getByText('Companies & Products')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  test('renders classification label', () => {
    render(<ClassificationBadge classification="therapeutic" />)
    expect(screen.getByText('Therapeutic')).toBeInTheDocument()
  })

  test('renders enzyme classification', () => {
    render(<ClassificationBadge classification="enzyme" />)
    expect(screen.getByText('Enzyme')).toBeInTheDocument()
  })
})
