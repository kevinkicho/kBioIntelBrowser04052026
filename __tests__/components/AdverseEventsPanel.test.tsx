import { render, screen } from '@testing-library/react'
import { AdverseEventsPanel } from '@/components/profile/AdverseEventsPanel'
import type { AdverseEvent } from '@/lib/types'

const mockEvents: AdverseEvent[] = [
  {
    id: '1',
    drugName: 'Aspirin',
    reactionName: 'nausea',
    reaction: 'nausea',
    count: 1523,
    serious: 45,
    outcome: 'recovered/resolved',
    reportDate: '2024-01-15',
  },
  {
    id: '2',
    drugName: 'Aspirin',
    reactionName: 'vomiting',
    reaction: 'vomiting',
    count: 892,
    serious: 12,
    outcome: 'recovered/resolved',
    reportDate: '2024-01-16',
  },
]

describe('AdverseEventsPanel', () => {
  test('renders reaction name', () => {
    render(<AdverseEventsPanel adverseEvents={mockEvents} />)
    expect(screen.getByText('nausea')).toBeInTheDocument()
  })

  test('renders event count', () => {
    render(<AdverseEventsPanel adverseEvents={mockEvents} />)
    expect(screen.getByText(/1,?523/)).toBeInTheDocument()
  })

  test('renders serious count', () => {
    render(<AdverseEventsPanel adverseEvents={mockEvents} />)
    expect(screen.getByText(/45 serious/)).toBeInTheDocument()
  })

  test('renders empty state when no events', () => {
    render(<AdverseEventsPanel adverseEvents={[]} />)
    expect(screen.getByText(/no adverse events found/i)).toBeInTheDocument()
  })
})
