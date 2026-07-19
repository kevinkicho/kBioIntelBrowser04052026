import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClinicalTrialsPanel } from '@/components/profile/ClinicalTrialsPanel'
import type { ClinicalTrial } from '@/lib/types'

const mockTrials: ClinicalTrial[] = [
  {
    nctId: 'NCT01272284',
    title: 'Liraglutide in Type 2 Diabetes',
    phase: 'PHASE3',
    status: 'COMPLETED',
    sponsor: 'Novo Nordisk',
    startDate: '2011-01-01',
    completionDate: '2014-01-01',
    conditions: ['Type 2 Diabetes Mellitus'],
    interventions: ['Liraglutide', 'Placebo'],
    enrollment: 900,
  },
  {
    nctId: 'NCT09999999',
    title: 'Newer Trial',
    phase: 'PHASE2',
    status: 'RECRUITING',
    sponsor: 'Acme Pharma',
    startDate: '2023-06-01',
    completionDate: '2026-12-01',
    conditions: ['Obesity'],
    interventions: ['Liraglutide'],
    enrollment: 200,
  },
]

describe('ClinicalTrialsPanel', () => {
  test('renders trial title', () => {
    render(<ClinicalTrialsPanel trials={mockTrials} />)
    expect(screen.getByText('Liraglutide in Type 2 Diabetes')).toBeInTheDocument()
  })

  test('renders NCT ID', () => {
    render(<ClinicalTrialsPanel trials={mockTrials} />)
    expect(screen.getByText(/NCT01272284/)).toBeInTheDocument()
  })

  test('renders sponsor name', () => {
    const { container } = render(<ClinicalTrialsPanel trials={mockTrials} />)
    expect(container.textContent).toMatch(/Novo Nordisk/)
  })

  test('shows filter and sort controls', () => {
    render(<ClinicalTrialsPanel trials={mockTrials} />)
    expect(screen.getByTestId('list-filter-input')).toBeInTheDocument()
    expect(screen.getByTestId('list-sort-select')).toBeInTheDocument()
  })

  test('defaults to latest → oldest sort', () => {
    render(<ClinicalTrialsPanel trials={mockTrials} />)
    const sort = screen.getByTestId('list-sort-select') as HTMLSelectElement
    expect(sort.value).toBe('date-desc')
  })

  test('shows columns and export controls', () => {
    render(<ClinicalTrialsPanel trials={mockTrials} />)
    expect(screen.getByTestId('list-columns-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('list-export-csv')).toBeInTheDocument()
  })

  test('renders as table listview with header', () => {
    render(<ClinicalTrialsPanel trials={mockTrials} />)
    expect(screen.getByTestId('clinical-trials-table')).toBeInTheDocument()
    expect(screen.getByText('NCT ID')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
  })

  test('expands row for detailed view', async () => {
    const user = userEvent.setup()
    render(<ClinicalTrialsPanel trials={mockTrials} />)
    await user.click(screen.getByRole('button', { name: /NCT01272284/i }))
    const detail = screen.getByTestId('trial-detail-NCT01272284')
    expect(within(detail).getByText('Conditions')).toBeInTheDocument()
    expect(within(detail).getByText('Type 2 Diabetes Mellitus')).toBeInTheDocument()
    expect(within(detail).getByText('Interventions')).toBeInTheDocument()
  })

  test('renders empty state when no trials', () => {
    render(<ClinicalTrialsPanel trials={[]} />)
    expect(screen.getByText(/no clinical trials found/i)).toBeInTheDocument()
  })
})
