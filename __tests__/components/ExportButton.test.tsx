import { render, screen, fireEvent } from '@testing-library/react'
import { ExportButton } from '@/components/profile/ExportButton'
import {
  FIXTURE_CORE_PANELS,
} from '@/lib/evidence/fixtures/corePanels'

// Mock downloadFile to prevent DOM manipulation in tests
jest.mock('@/lib/exportData', () => ({
  ...jest.requireActual('@/lib/exportData'),
  downloadFile: jest.fn(),
}))

jest.mock('@/lib/evidence/packIndex', () => ({
  ...jest.requireActual('@/lib/evidence/packIndex'),
  registerPackIndex: jest.fn(() => ({ ok: true, value: {} })),
}))

describe('ExportButton', () => {
  const mockData = { companies: [{ brandName: 'Test' }] }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders export button', () => {
    render(<ExportButton data={mockData} moleculeName="Aspirin" />)
    expect(screen.getByText(/Export/)).toBeInTheDocument()
  })

  it('shows dropdown on click including evidence pack + share placeholder', () => {
    render(<ExportButton data={mockData} moleculeName="Aspirin" />)
    fireEvent.click(screen.getByText(/Export/))
    expect(screen.getByText(/Export as CSV/)).toBeInTheDocument()
    expect(screen.getByText(/Export as JSON/)).toBeInTheDocument()
    expect(screen.getByText(/Download evidence pack \(JSON\)/)).toBeInTheDocument()
    expect(screen.getByText(/Download evidence pack \(MD\)/)).toBeInTheDocument()
    expect(screen.getByText(/Share pack \(soon\)/)).toBeDisabled()
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

  it('downloads evidence pack JSON built from Core panels', () => {
    const { downloadFile } = require('@/lib/exportData')
    const data = {
      ...mockData,
      chemblActivities: FIXTURE_CORE_PANELS.chemblActivities,
      chemblMechanisms: FIXTURE_CORE_PANELS.chemblMechanisms,
      adverseEvents: FIXTURE_CORE_PANELS.adverseEvents,
      clinicalTrials: FIXTURE_CORE_PANELS.clinicalTrials,
      diseaseAssociations: FIXTURE_CORE_PANELS.diseaseAssociations,
    }
    render(<ExportButton data={data} moleculeName="Aspirin" cid={2244} />)
    fireEvent.click(screen.getByText(/Export/))
    fireEvent.click(screen.getByText(/Download evidence pack \(JSON\)/))
    expect(downloadFile).toHaveBeenCalled()
    const [body, filename, mime] = (downloadFile as jest.Mock).mock.calls[0]
    expect(mime).toBe('application/json')
    expect(filename).toMatch(/aspirin-evidence-pack-.*\.json/)
    const parsed = JSON.parse(body)
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.claimCount).toBe(9)
    expect(parsed.claims.length).toBeLessThanOrEqual(200)
    expect(parsed.contentHash).toMatch(/^[a-f0-9]{64}$/)
  })
})
