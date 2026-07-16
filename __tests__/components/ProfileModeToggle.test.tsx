import { render, screen, fireEvent } from '@testing-library/react'
import { ProfileModeToggle } from '@/components/profile/ProfileModeToggle'

describe('ProfileModeToggle', () => {
  it('renders Decision and Full options', () => {
    render(<ProfileModeToggle active="full" onChange={jest.fn()} />)
    expect(screen.getByTestId('profile-mode-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('profile-mode-decision')).toHaveTextContent('Decision')
    expect(screen.getByTestId('profile-mode-full')).toHaveTextContent('Full')
  })

  it('marks active mode with aria-pressed', () => {
    render(<ProfileModeToggle active="decision" onChange={jest.fn()} />)
    expect(screen.getByTestId('profile-mode-decision')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('profile-mode-full')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange when switching modes', () => {
    const onChange = jest.fn()
    render(<ProfileModeToggle active="full" onChange={onChange} />)
    fireEvent.click(screen.getByTestId('profile-mode-decision'))
    expect(onChange).toHaveBeenCalledWith('decision')
  })

  it('disables buttons when disabled', () => {
    render(<ProfileModeToggle active="full" onChange={jest.fn()} disabled />)
    expect(screen.getByTestId('profile-mode-decision')).toBeDisabled()
    expect(screen.getByTestId('profile-mode-full')).toBeDisabled()
  })
})
