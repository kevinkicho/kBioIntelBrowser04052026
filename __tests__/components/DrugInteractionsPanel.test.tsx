import { render, screen } from '@testing-library/react'
import { DrugInteractionsPanel } from '@/components/profile/DrugInteractionsPanel'
import type { DrugInteraction } from '@/lib/types'

const mockInteractions: DrugInteraction[] = [
  {
    drugName: 'Warfarin',
    severity: 'major',
    description: 'May increase the anticoagulant effect of warfarin.',
    sourceName: 'DrugBank',
  },
  {
    drugName: 'Insulin',
    severity: 'moderate',
    description: 'Metformin may enhance the hypoglycemic effect.',
    sourceName: 'ONCHigh',
  },
]

describe('DrugInteractionsPanel', () => {
  test('renders drug names', () => {
    render(<DrugInteractionsPanel interactions={mockInteractions} />)
    expect(screen.getByText('Warfarin')).toBeInTheDocument()
    expect(screen.getByText('Insulin')).toBeInTheDocument()
  })

  test('renders severity badges', () => {
    render(<DrugInteractionsPanel interactions={mockInteractions} />)
    expect(screen.getByText('major')).toBeInTheDocument()
    expect(screen.getByText('moderate')).toBeInTheDocument()
  })

  test('renders descriptions', () => {
    render(<DrugInteractionsPanel interactions={mockInteractions} />)
    expect(screen.getByText(/anticoagulant effect/)).toBeInTheDocument()
  })

  test('renders empty state when no interactions', () => {
    render(<DrugInteractionsPanel interactions={[]} />)
    expect(screen.getByText(/no drug interactions found/i)).toBeInTheDocument()
  })
})
