import { render, screen, fireEvent } from '@testing-library/react'
import { PaginatedList } from '@/components/ui/PaginatedList'

describe('PaginatedList', () => {
  const items = Array.from({ length: 12 }, (_, i) => <div key={i}>Item {i + 1}</div>)

  it('shows only pageSize items initially', () => {
    render(<PaginatedList pageSize={5}>{items}</PaginatedList>)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 5')).toBeInTheDocument()
    expect(screen.queryByText('Item 6')).not.toBeInTheDocument()
  })

  it('shows "Show more" button when there are more items', () => {
    render(<PaginatedList pageSize={5}>{items}</PaginatedList>)
    expect(screen.getByText(/Show more/)).toBeInTheDocument()
  })

  it('does not show "Show more" when all items fit', () => {
    const fewItems = items.slice(0, 3)
    render(<PaginatedList pageSize={5}>{fewItems}</PaginatedList>)
    expect(screen.queryByText(/Show more/)).not.toBeInTheDocument()
  })

  it('reveals more items on "Show more" click', () => {
    render(<PaginatedList pageSize={5}>{items}</PaginatedList>)
    fireEvent.click(screen.getByText(/Show more/))
    expect(screen.getByText('Item 10')).toBeInTheDocument()
    expect(screen.queryByText('Item 11')).not.toBeInTheDocument()
  })

  it('shows "Show all" link that expands everything', () => {
    render(<PaginatedList pageSize={5}>{items}</PaginatedList>)
    fireEvent.click(screen.getByText(/Show all/))
    expect(screen.getByText('Item 12')).toBeInTheDocument()
    expect(screen.queryByText(/Show more/)).not.toBeInTheDocument()
  })

  it('shows item count indicator', () => {
    render(<PaginatedList pageSize={5}>{items}</PaginatedList>)
    expect(screen.getByText(/Showing 5/)).toBeInTheDocument()
    expect(screen.getByText(/12/)).toBeInTheDocument()
  })

  it('defaults pageSize to 5', () => {
    render(<PaginatedList>{items}</PaginatedList>)
    expect(screen.getByText('Item 5')).toBeInTheDocument()
    expect(screen.queryByText('Item 6')).not.toBeInTheDocument()
  })
})
