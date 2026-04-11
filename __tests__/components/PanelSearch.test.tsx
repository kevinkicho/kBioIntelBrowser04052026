import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { PanelSearch } from '@/components/profile/PanelSearch'

describe('PanelSearch', () => {
  it('renders with placeholder text', () => {
    render(<PanelSearch value="" onChange={() => {}} />)
    expect(screen.getByPlaceholderText('Search panels...')).toBeInTheDocument()
  })

  it('fires onChange on input', () => {
    const onChange = jest.fn()
    render(<PanelSearch value="" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('Search panels...'), {
      target: { value: 'protein' },
    })
    expect(onChange).toHaveBeenCalledWith('protein')
  })

  it('does not show clear button when value is empty', () => {
    render(<PanelSearch value="" onChange={() => {}} />)
    expect(screen.queryByLabelText('clear search')).not.toBeInTheDocument()
  })

  it('shows clear button when value is non-empty', () => {
    render(<PanelSearch value="test" onChange={() => {}} />)
    expect(screen.getByLabelText('clear search')).toBeInTheDocument()
  })

  it('calls onChange with empty string when clear button is clicked', () => {
    const onChange = jest.fn()
    render(<PanelSearch value="test" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('clear search'))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('displays the current value', () => {
    render(<PanelSearch value="kinase" onChange={() => {}} />)
    const input = screen.getByPlaceholderText('Search panels...') as HTMLInputElement
    expect(input.value).toBe('kinase')
  })
})
