import { render, screen } from '@testing-library/react'
import { DailyMedPanel } from '@/components/profile/DailyMedPanel'
import type { DrugLabel } from '@/lib/types'

const mockLabels: DrugLabel[] = [{
  id: 'abc-123',
  title: 'METFORMIN HYDROCHLORIDE tablet',
  version: '1',
  date: '2024-01-15',
  url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc-123',
  dailyMedUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc-123',
  dosageForm: 'TABLET',
  route: 'ORAL',
  labelerName: 'Teva Pharmaceuticals',
}]

describe('DailyMedPanel', () => {
  test('renders label title as link', () => {
    render(<DailyMedPanel labels={mockLabels} />)
    const link = screen.getByRole('link', { name: /METFORMIN HYDROCHLORIDE tablet/ })
    expect(link).toHaveAttribute('href', 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc-123')
  })

  test('renders labeler name', () => {
    render(<DailyMedPanel labels={mockLabels} />)
    expect(screen.getByText('Teva Pharmaceuticals')).toBeInTheDocument()
  })

  test('renders dosage form and route', () => {
    render(<DailyMedPanel labels={mockLabels} />)
    expect(screen.getByText(/TABLET/)).toBeInTheDocument()
    expect(screen.getByText(/ORAL/)).toBeInTheDocument()
  })

  test('renders empty state when no labels', () => {
    render(<DailyMedPanel labels={[]} />)
    expect(screen.getByText(/no drug label found/i)).toBeInTheDocument()
  })
})
