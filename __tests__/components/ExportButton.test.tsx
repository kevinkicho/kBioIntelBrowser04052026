import { render, screen, fireEvent } from '@testing-library/react'
import { ExportButton } from '@/components/profile/ExportButton'

// Mock downloadFile to prevent DOM manipulation in tests
jest.mock('@/lib/exportData', () => ({
  ...jest.requireActual('@/lib/exportData'),
  downloadFile: jest.fn(),
}))

describe('ExportButton', () => {
  const mockData = { companies: [{ brandName: 'Test' }] }

  it('renders export button', () => {
    render(<ExportButton data={mockData} moleculeName="Aspirin" />)
    expect(screen.getByText(/Export/)).toBeInTheDocument()
  })

  it('shows dropdown on click', () => {
    render(<ExportButton data={mockData} moleculeName="Aspirin" />)
    fireEvent.click(screen.getByText(/Export/))
    expect(screen.getByText(/Export as CSV/)).toBeInTheDocument()
    expect(screen.getByText(/Export as JSON/)).toBeInTheDocument()
  })

  it('hides dropdown initially', () => {
    render(<ExportButton data={mockData} moleculeName="Aspirin" />)
    expect(screen.queryByText(/Export as CSV/)).not.toBeInTheDocument()
  })

  it('calls downloadFile on CSV click', () => {
    const { downloadFile } = require('@/lib/exportData')
    render(<ExportButton data={mockData} moleculeName="Aspirin" />)
    fireEvent.click(screen.getByText(/Export/))
    fireEvent.click(screen.getByText(/Export as CSV/))
    expect(downloadFile).toHaveBeenCalledWith(
      expect.any(String),
      'aspirin-profile.csv',
      'text/csv'
    )
  })

  it('calls downloadFile on JSON click', () => {
    const { downloadFile } = require('@/lib/exportData')
    render(<ExportButton data={mockData} moleculeName="Aspirin" />)
    fireEvent.click(screen.getByText(/Export/))
    fireEvent.click(screen.getByText(/Export as JSON/))
    expect(downloadFile).toHaveBeenCalledWith(
      expect.any(String),
      'aspirin-profile.json',
      'application/json'
    )
  })
})
