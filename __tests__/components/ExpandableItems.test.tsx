import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ExpandableItems,
  ExpandableMoreToggle,
  ExpandableTextList,
} from '@/components/ui/ExpandableItems'

describe('ExpandableItems', () => {
  it('shows capped items and expands on +N more click', async () => {
    const user = userEvent.setup()
    const items = ['a', 'b', 'c', 'd', 'e', 'f']
    render(
      <ExpandableItems items={items} maxVisible={3} asChips testId="exp" />,
    )
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('c')).toBeInTheDocument()
    expect(screen.queryByText('d')).not.toBeInTheDocument()
    const toggle = screen.getByTestId('exp-toggle')
    expect(toggle).toHaveTextContent('+3 more')
    await user.click(toggle)
    expect(screen.getByText('f')).toBeInTheDocument()
    expect(toggle).toHaveTextContent('Show less')
    await user.click(toggle)
    expect(screen.queryByText('f')).not.toBeInTheDocument()
  })

  it('hides toggle when under maxVisible', () => {
    render(<ExpandableItems items={['x', 'y']} maxVisible={5} testId="short" />)
    expect(screen.queryByTestId('short-toggle')).not.toBeInTheDocument()
  })

  it('renders custom items without crashing', () => {
    render(
      <ExpandableItems
        items={[{ id: 1, label: 'One' }, { id: 2, label: 'Two' }, { id: 3, label: 'Three' }]}
        maxVisible={2}
        testId="custom"
        renderItem={(item) => <span key={item.id}>{item.label}</span>}
      />,
    )
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.queryByText('Three')).not.toBeInTheDocument()
  })
})

describe('ExpandableTextList', () => {
  it('joins comma list and expands remainder', async () => {
    const user = userEvent.setup()
    render(
      <ExpandableTextList
        items={['blood', 'urine', 'saliva', 'csf']}
        maxVisible={2}
        prefix="Biospecimens:"
        testId="txt"
      />,
    )
    expect(screen.getByTestId('txt')).toHaveTextContent('blood, urine')
    expect(screen.getByTestId('txt')).not.toHaveTextContent('csf')
    await user.click(screen.getByTestId('txt-toggle'))
    expect(screen.getByTestId('txt')).toHaveTextContent('csf')
  })
})

describe('ExpandableMoreToggle', () => {
  it('invokes onToggle', async () => {
    const user = userEvent.setup()
    const onToggle = jest.fn()
    const { rerender } = render(
      <ExpandableMoreToggle remaining={4} expanded={false} onToggle={onToggle} />,
    )
    await user.click(screen.getByRole('button', { name: /\+4 more/i }))
    expect(onToggle).toHaveBeenCalled()
    rerender(
      <ExpandableMoreToggle remaining={4} expanded onToggle={onToggle} />,
    )
    expect(screen.getByRole('button', { name: /Show less/i })).toBeInTheDocument()
  })
})
