import { render, screen } from '@testing-library/react'
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
    render(<ClinicalTrialsPanel trials={mockTrials} />)
    expect(screen.getByText(/Novo Nordisk/)).toBeInTheDocument()
  })

  test('renders empty state when no trials', () => {
    render(<ClinicalTrialsPanel trials={[]} />)
    expect(screen.getByText(/no clinical trials found/i)).toBeInTheDocument()
  })
})
